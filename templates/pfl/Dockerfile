# templates/pfl/Dockerfile
ARG GATEWAY_IMAGE
FROM ${GATEWAY_IMAGE} AS gateway

FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive

COPY templates/base/ /tmp/base/
RUN bash /tmp/base/install-base.sh \
 && apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libffi-dev \
    libgmp-dev \
    libncurses-dev \
    zlib1g-dev \
 && rm -rf /var/lib/apt/lists/* \
 && rm -rf /tmp/base

# Install GHCup toolchain as student user
USER student
ENV HOME=/home/student
ENV PATH=/home/student/.ghcup/bin:/home/student/.cabal/bin:/home/student/.local/bin:$PATH
RUN curl --proto '=https' --tlsv1.2 -sSf https://get-ghcup.haskell.org | \
    BOOTSTRAP_HASKELL_NONINTERACTIVE=1 \
    BOOTSTRAP_HASKELL_GHC_VERSION=recommended \
    BOOTSTRAP_HASKELL_CABAL_VERSION=recommended \
    BOOTSTRAP_HASKELL_STACK_VERSION=recommended \
    BOOTSTRAP_HASKELL_INSTALL_HLS=0 \
    BOOTSTRAP_HASKELL_ADJUST_BASHRC=1 \
    sh

USER root
COPY --from=gateway /opt/teal-gateway /opt/teal-gateway
RUN python3 -m venv /opt/teal-gateway/venv \
 && /opt/teal-gateway/venv/bin/pip install --no-cache-dir -r /opt/teal-gateway/requirements.txt \
 && chown -R student:student /opt/teal-gateway/venv

ENV PYTHONPATH=/opt/teal-gateway
USER student
WORKDIR /home/student/work

ENTRYPOINT ["/opt/teal-gateway/venv/bin/python", "-m", "teal_gateway", "--upstream=http://127.0.0.1:7681", "--prefix=/terminal", "--", \
            "ttyd", "-W", "-i", "lo", "-p", "7681", "-b", "/terminal", "-t", "fontSize=15", "tmux", "new", "-A", "-s", "lab"]
