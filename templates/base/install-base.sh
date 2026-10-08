#!/usr/bin/env bash
# templates/base/install-base.sh
# Sets up base tools, ttyd, student user, and tmux configuration.
set -euo pipefail

echo "=== [TEAL] Installing base packages ==="
export DEBIAN_FRONTEND=noninteractive

apt-get update
apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    less \
    nano \
    python3 \
    python3-venv \
    tmux \
    vim

# Clean apt cache to keep image layers small
rm -rf /var/lib/apt/lists/*

echo "=== [TEAL] Installing static ttyd binary ==="
TTYD_URL="https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.x86_64"
curl -sSL "$TTYD_URL" -o /usr/local/bin/ttyd
chmod +x /usr/local/bin/ttyd

echo "=== [TEAL] Creating student user (UID 1000, no sudo) ==="
if ! id -u student >/dev/null 2>&1; then
    # Ubuntu 24.04 creates an 'ubuntu' user with UID 1000 by default.
    # If UID 1000 exists, rename it to 'student'.
    if id -nu 1000 >/dev/null 2>&1; then
        EXISTING_USER=$(id -nu 1000)
        groupmod -n student "$EXISTING_USER" 2>/dev/null || true
        usermod -l student -m -d /home/student "$EXISTING_USER"
    else
        useradd -m -u 1000 -s /bin/bash student
    fi
fi

mkdir -p /home/student/work
chown -R student:student /home/student

echo "=== [TEAL] Installing tmux configuration ==="
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/tmux.conf" ]; then
    cp "$SCRIPT_DIR/tmux.conf" /etc/tmux.conf
    cp "$SCRIPT_DIR/tmux.conf" /home/student/.tmux.conf
    chown student:student /home/student/.tmux.conf
fi

echo "=== [TEAL] Base installation complete ==="
