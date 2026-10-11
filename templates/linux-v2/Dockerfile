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
    wget \
    tar \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && rm -rf /tmp/base

# Install openvscode-server (supports native subpath hosting via --server-base-path)
ENV OPENVSCODE_VERSION=v1.109.5
RUN wget -q https://github.com/gitpod-io/openvscode-server/releases/download/openvscode-server-${OPENVSCODE_VERSION}/openvscode-server-${OPENVSCODE_VERSION}-linux-x64.tar.gz -O /tmp/openvscode.tar.gz \
 && tar -xzf /tmp/openvscode.tar.gz -C /opt/ \
 && mv /opt/openvscode-server-${OPENVSCODE_VERSION}-linux-x64 /opt/openvscode-server \
 && rm /tmp/openvscode.tar.gz

COPY --from=gateway /opt/teal-gateway /opt/teal-gateway
RUN python3 -m venv /opt/teal-gateway/venv \
 && /opt/teal-gateway/venv/bin/pip install --no-cache-dir -r /opt/teal-gateway/requirements.txt \
 && chown -R student:student /opt/openvscode-server

# Configure default Dark Modern theme for VS Code
RUN mkdir -p /home/student/.openvscode-server/data/User \
             /home/student/.openvscode-server/data/Machine \
             /home/student/.vscode-remote/data/Machine \
             /home/student/work/.vscode
COPY templates/linux-v2/settings.json /home/student/.openvscode-server/data/User/settings.json
COPY templates/linux-v2/settings.json /home/student/.openvscode-server/data/Machine/settings.json
COPY templates/linux-v2/settings.json /home/student/.vscode-remote/data/Machine/settings.json
COPY templates/linux-v2/settings.json /home/student/work/.vscode/settings.json
RUN chown -R student:student /home/student

ENV PYTHONPATH=/opt/teal-gateway
USER student
WORKDIR /home/student/work

ENTRYPOINT ["/opt/teal-gateway/venv/bin/python", "-m", "teal_gateway", "--upstream=http://127.0.0.1:7681", "--prefix=/vscode", "--", \
            "/opt/openvscode-server/bin/openvscode-server", "--server-base-path", "/vscode", "--without-connection-token", "--host", "127.0.0.1", "--port", "7681", "--telemetry-level", "off", "/home/student/work"]
