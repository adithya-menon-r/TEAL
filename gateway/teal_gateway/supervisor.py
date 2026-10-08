"""
gateway/teal_gateway/supervisor.py
-----------------------------------
Supervises the lab interface process (e.g. ttyd or jupyter lab).
Restarts the child if it exits unexpectedly, unless the lab has expired or stopped.
"""

import asyncio
import logging
import os
import signal
import sys
from typing import Optional

logger = logging.getLogger("teal.gateway.supervisor")


class ProcessSupervisor:
    def __init__(self, command: list[str]):
        self.command = command
        self._process: Optional[asyncio.subprocess.Process] = None
        self._stopped = False
        self._monitor_task: Optional[asyncio.Task] = None

    async def start(self) -> None:
        """Start the child process and begin monitoring."""
        if not self.command:
            logger.info("No child command specified to supervise.")
            return

        self._stopped = False
        await self._spawn()
        self._monitor_task = asyncio.create_task(self._monitor_loop())

    async def _spawn(self) -> None:
        """Spawn the child process."""
        try:
            logger.info("Spawning child process: %s", " ".join(self.command))
            self._process = await asyncio.create_subprocess_exec(
                *self.command,
                stdout=None,  # Inherit stdout for container logs
                stderr=None,  # Inherit stderr
            )
            logger.info("Child process started with PID: %s", self._process.pid)
        except Exception as e:
            logger.error("Failed to spawn child process: %s", e, exc_info=True)

    async def _monitor_loop(self) -> None:
        """Monitor child process lifecycle and restart if terminated unexpectedly."""
        while not self._stopped:
            if self._process is None:
                await asyncio.sleep(1.0)
                continue

            return_code = await self._process.wait()
            logger.warning("Child process exited with returncode %s", return_code)

            if self._stopped:
                break

            logger.info("Restarting child process in 1 second...")
            await asyncio.sleep(1.0)
            if not self._stopped:
                await self._spawn()

    async def stop(self) -> None:
        """Gracefully terminate child process."""
        self._stopped = True
        if self._monitor_task and not self._monitor_task.done():
            self._monitor_task.cancel()

        if self._process and self._process.returncode is None:
            logger.info("Terminating child process (PID %s)...", self._process.pid)
            try:
                self._process.terminate()
            except ProcessLookupError:
                return

            try:
                await asyncio.wait_for(self._process.wait(), timeout=5.0)
                logger.info("Child process terminated cleanly.")
            except asyncio.TimeoutError:
                logger.warning("Child process did not exit within 5s, killing...")
                try:
                    self._process.kill()
                    await self._process.wait()
                except ProcessLookupError:
                    pass

    @property
    def is_running(self) -> bool:
        return self._process is not None and self._process.returncode is None
