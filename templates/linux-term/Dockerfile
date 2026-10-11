# templates/linux-term/Dockerfile
ARG GATEWAY_IMAGE
FROM ${GATEWAY_IMAGE} AS gateway

FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive

COPY templates/base/ /tmp/base/
RUN bash /tmp/base/install-base.sh \
 && apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    man-db \
 && rm -rf /var/lib/apt/lists/* \
 && rm -rf /tmp/base

COPY --from=gateway /opt/teal-gateway /opt/teal-gateway
RUN python3 -m venv /opt/teal-gateway/venv \
 && /opt/teal-gateway/venv/bin/pip install --no-cache-dir -r /opt/teal-gateway/requirements.txt

ENV PYTHONPATH=/opt/teal-gateway
USER student
WORKDIR /home/student/work

ENTRYPOINT ["/opt/teal-gateway/venv/bin/python", "-m", "teal_gateway", "--upstream=http://127.0.0.1:7681", "--prefix=/terminal", "--", \
            "ttyd", "-W", "-i", "lo", "-p", "7681", "-b", "/terminal", "-t", "fontSize=15", "-t", "theme={\"background\": \"#000000\", \"foreground\": \"#f8fafc\", \"cursor\": \"#2dd4bf\", \"cursorAccent\": \"#000000\", \"selectionBackground\": \"#134e4a\"}", "tmux", "new", "-A", "-s", "lab"]
