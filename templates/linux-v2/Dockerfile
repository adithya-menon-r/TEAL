# templates/linux-v2/Dockerfile
ARG GATEWAY_IMAGE
FROM ${GATEWAY_IMAGE} AS gateway

FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive

COPY templates/base/ /tmp/base/
RUN bash /tmp/base/install-base.sh \
 && apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    man-db \
    curl \
    git \
 && curl -fsSL https://code-server.dev/install.sh | sh \
 && rm -rf /var/lib/apt/lists/* \
 && rm -rf /tmp/base

COPY --from=gateway /opt/teal-gateway /opt/teal-gateway
RUN python3 -m venv /opt/teal-gateway/venv \
 && /opt/teal-gateway/venv/bin/pip install --no-cache-dir -r /opt/teal-gateway/requirements.txt

ENV PYTHONPATH=/opt/teal-gateway
USER student
WORKDIR /home/student/work

# code-server arguments:
# --auth none: we don't need a password because teal_gateway handles auth
# --bind-addr 127.0.0.1:7681: bind to the port teal_gateway proxies
# --disable-telemetry: standard best practice
ENTRYPOINT ["/opt/teal-gateway/venv/bin/python", "-m", "teal_gateway", "--upstream=http://127.0.0.1:7681", "--prefix=/vscode", "--", \
            "code-server", "--auth", "none", "--bind-addr", "127.0.0.1:7681", "--disable-telemetry", "."]
