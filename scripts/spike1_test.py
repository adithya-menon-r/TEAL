"""
scripts/spike1_test.py
----------------------
Spike 1 verification script: validates TEAL lab gateway runtime and contract.
Can test either a locally spawned mock environment or a live deployed Cloud Run lab service.

Usage:
  # 1. Run full local automated verification:
  python scripts/spike1_test.py --local

  # 2. Run against a deployed Cloud Run lab (from §12.7):
  python scripts/spike1_test.py --url https://<lab-service>.asia-south1.run.app --token <token>
"""

import argparse
from datetime import datetime, timezone, timedelta
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import urllib.error
import urllib.request
import http.cookiejar

# ANSI colors
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
RESET = "\033[0m"


def log_pass(msg: str):
    print(f" {GREEN}[PASS]{RESET} {msg}")


def log_fail(msg: str):
    print(f" {RED}[FAIL]{RESET} {msg}")


def log_info(msg: str):
    print(f" {CYAN}[INFO]{RESET} {msg}")


def test_lab_url(base_url: str, token: str):
    base_url = base_url.rstrip("/")
    log_info(f"Testing TEAL lab endpoint: {base_url}")
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

    all_passed = True

    # Check 1: GET / without cookie serves bootstrap
    log_info("Check 1: Requesting / without cookie...")
    try:
        req = urllib.request.Request(f"{base_url}/")
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8", errors="ignore")
            if "Connecting to Lab" in body or "/__teal/auth" in body:
                log_pass("Unauthenticated root request correctly returns bootstrap page.")
            else:
                log_fail("Unexpected response for unauthenticated root request.")
                all_passed = False
    except Exception as e:
        log_fail(f"Root request failed: {e}")
        all_passed = False

    # Check 2: GET /__teal/healthz
    log_info("Check 2: Requesting /__teal/healthz...")
    try:
        req = urllib.request.Request(f"{base_url}/__teal/healthz")
        with urllib.request.urlopen(req) as resp:
            text = resp.read().decode("utf-8").strip()
            if resp.status == 200 and text == "ok":
                log_pass("/__teal/healthz returned HTTP 200 'ok'.")
            else:
                log_fail(f"/__teal/healthz returned status {resp.status} ({text})")
                all_passed = False
    except Exception as e:
        log_fail(f"Healthz request failed: {e}")
        all_passed = False

    # Check 3: POST /__teal/auth with invalid token
    log_info("Check 3: Testing /__teal/auth with invalid token...")
    try:
        data = json.dumps({"token": "invalid-dummy-token"}).encode("utf-8")
        req = urllib.request.Request(
            f"{base_url}/__teal/auth",
            data=data,
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req) as resp:
            log_fail("Expected 401 for invalid token but got 200.")
            all_passed = False
    except urllib.error.HTTPError as e:
        if e.code == 401:
            log_pass("Invalid token was correctly rejected with HTTP 401.")
        else:
            log_fail(f"Expected 401, got HTTP {e.code}")
            all_passed = False
    except Exception as e:
        log_fail(f"Auth test error: {e}")
        all_passed = False

    # Check 4: POST /__teal/auth with valid token
    log_info("Check 4: Testing /__teal/auth with valid token...")
    try:
        data = json.dumps({"token": token}).encode("utf-8")
        req = urllib.request.Request(
            f"{base_url}/__teal/auth",
            data=data,
            headers={"Content-Type": "application/json"},
        )
        with opener.open(req) as resp:
            if resp.status == 200:
                cookies = [c.name for c in cj]
                if "teal_lab" in cookies:
                    log_pass("Valid token exchanged successfully and 'teal_lab' cookie set.")
                else:
                    log_fail("teal_lab cookie missing in response cookies.")
                    all_passed = False
            else:
                log_fail(f"Token auth returned status {resp.status}")
                all_passed = False
    except Exception as e:
        log_fail(f"Valid token auth failed: {e}")
        all_passed = False

    # Check 5: GET /__teal/info with cookie
    log_info("Check 5: Requesting /__teal/info with authenticated cookie...")
    try:
        req = urllib.request.Request(f"{base_url}/__teal/info")
        with opener.open(req) as resp:
            if resp.status == 200:
                info = json.loads(resp.read().decode("utf-8"))
                log_pass(f"Info retrieved: session={info.get('sessionId')} lab={info.get('lab', {}).get('name')}")
            else:
                log_fail(f"/__teal/info returned status {resp.status}")
                all_passed = False
    except Exception as e:
        log_fail(f"/__teal/info request failed: {e}")
        all_passed = False

    # Check 6: GET /__teal/files with cookie
    log_info("Check 6: Requesting /__teal/files directory listing...")
    try:
        req = urllib.request.Request(f"{base_url}/__teal/files")
        with opener.open(req) as resp:
            if resp.status == 200:
                files_data = json.loads(resp.read().decode("utf-8"))
                item_count = len(files_data.get("items", []))
                log_pass(f"Files listing functional (found {item_count} items).")
            else:
                log_fail(f"/__teal/files returned status {resp.status}")
                all_passed = False
    except Exception as e:
        log_fail(f"/__teal/files request failed: {e}")
        all_passed = False

    print("\n" + "=" * 60)
    if all_passed:
        print(f" {GREEN}ALL SPIKE 1 VERIFICATION CHECKS PASSED SUCCESSFULLY!{RESET}")
    else:
        print(f" {RED}SOME SPIKE 1 CHECKS FAILED.{RESET}")
    print("=" * 60 + "\n")
    return all_passed


def run_local_spike():
    import subprocess
    import tempfile
    import threading

    log_info("Starting local Spike 1 verification...")
    token = "spike1-local-test-token"
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    port = 8899

    env = os.environ.copy()
    env["TEAL_TOKEN_SHA256"] = token_hash
    env["TEAL_SESSION_ID"] = "spike1-local"
    env["TEAL_EXPIRES_AT"] = (datetime.now(timezone.utc) + timedelta(minutes=60)).isoformat()
    env["TEAL_LAB_INFO"] = json.dumps({
        "name": "Linux Lab",
        "description": "Local Spike 1 Verification",
        "interface": "terminal",
        "tools": ["bash", "git", "tmux"],
        "cpu": "1",
        "memory": "1Gi",
    })
    env["PORT"] = str(port)

    # Launch gateway process
    cmd = [
        sys.executable,
        "-m",
        "teal_gateway",
        f"--port={port}",
        "--upstream=http://127.0.0.1:9999",
        "--prefix=/terminal",
    ]

    log_info(f"Spawning local teal_gateway on port {port}...")
    cwd = Path(__file__).resolve().parent.parent / "gateway"
    proc = subprocess.Popen(cmd, env=env, cwd=cwd)

    time.sleep(1.5)  # Allow server to bind and start

    try:
        success = test_lab_url(f"http://127.0.0.1:{port}", token)
    finally:
        log_info("Stopping local gateway process...")
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()

    return success


def main():
    parser = argparse.ArgumentParser(description="TEAL Spike 1 Verification")
    parser.add_argument("--url", help="Lab URL (e.g. https://lab-test-xxx.asia-south1.run.app)")
    parser.add_argument("--token", help="Session token matching TEAL_TOKEN_SHA256")
    parser.add_argument("--local", action="store_true", help="Run local automated gateway test")

    args = parser.parse_args()

    if args.local or (not args.url and not args.token):
        run_local_spike()
    elif args.url and args.token:
        test_lab_url(args.url, args.token)
    else:
        print("Please provide both --url and --token, or use --local")
        sys.exit(1)


if __name__ == "__main__":
    main()
