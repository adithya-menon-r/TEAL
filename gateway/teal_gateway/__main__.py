"""
gateway/teal_gateway/__main__.py
--------------------------------
CLI entrypoint for teal-gateway.
Supervises the interface command and serves the gateway HTTP server on $PORT (default 8080).
"""

import argparse
import asyncio
import json
import logging
import os
import sys

from aiohttp import web

from .server import GatewayApp
from .supervisor import ProcessSupervisor


class JsonFormatter(logging.Formatter):
    """Outputs structured JSON lines to stdout matching Cloud Logging conventions."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "time": self.formatTime(record),
            "severity": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_entry)


def setup_logging():
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.handlers = [handler]


def main():
    setup_logging()
    logger = logging.getLogger("teal.gateway")

    parser = argparse.ArgumentParser(description="TEAL Lab Gateway")
    parser.add_argument(
        "--upstream",
        default=os.environ.get("TEAL_UPSTREAM_URL", "http://127.0.0.1:7681"),
        help="Upstream interface URL (default: http://127.0.0.1:7681)",
    )
    parser.add_argument(
        "--prefix",
        default=os.environ.get("TEAL_PREFIX", "/terminal"),
        help="Path prefix to reverse-proxy to upstream (default: /terminal)",
    )
    parser.add_argument(
        "--host",
        default="0.0.0.0",
        help="Host address to bind to (default: 0.0.0.0)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("PORT", "8080")),
        help="Port to listen on (default: 8080)",
    )
    parser.add_argument(
        "command",
        nargs=argparse.REMAINDER,
        help="Interface command to supervise (after --)",
    )

    args = parser.parse_args()

    # If the user passed '--', strip leading '--' from command args
    child_cmd = args.command
    if child_cmd and child_cmd[0] == "--":
        child_cmd = child_cmd[1:]

    logger.info(
        "Starting TEAL gateway on %s:%s (upstream: %s, prefix: %s)",
        args.host,
        args.port,
        args.upstream,
        args.prefix,
    )

    supervisor = ProcessSupervisor(child_cmd) if child_cmd else None

    gateway = GatewayApp(
        upstream_url=args.upstream,
        prefix=args.prefix,
        supervisor=supervisor,
    )

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    if supervisor:
        loop.run_until_complete(supervisor.start())

    web.run_app(
        gateway.app,
        host=args.host,
        port=args.port,
        access_log=None,  # Handled by custom logging
    )


if __name__ == "__main__":
    main()
