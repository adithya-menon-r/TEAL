# templates/nndl/Dockerfile
ARG GATEWAY_IMAGE
FROM ${GATEWAY_IMAGE} AS gateway

FROM python:3.12-slim
ENV DEBIAN_FRONTEND=noninteractive

COPY templates/base/ /tmp/base/
RUN bash /tmp/base/install-base.sh \
 && rm -rf /tmp/base

# Install scientific and ML packages
RUN pip install --no-cache-dir \
    jupyterlab \
    tensorflow-cpu \
    keras \
    numpy \
    pandas \
    matplotlib \
    scikit-learn

COPY --from=gateway /opt/teal-gateway /opt/teal-gateway
RUN python3 -m venv /opt/teal-gateway/venv \
 && /opt/teal-gateway/venv/bin/pip install --no-cache-dir -r /opt/teal-gateway/requirements.txt \
 && chown -R student:student /opt/teal-gateway/venv

ENV PYTHONPATH=/opt/teal-gateway
USER student
WORKDIR /home/student/work

ENTRYPOINT ["/opt/teal-gateway/venv/bin/python", "-m", "teal_gateway", "--upstream=http://127.0.0.1:8888", "--prefix=/jupyter", "--", \
            "jupyter", "lab", "--ip=127.0.0.1", "--port=8888", "--ServerApp.base_url=/jupyter/", "--IdentityProvider.token=", "--ServerApp.password=", "--ServerApp.root_dir=/home/student/work", "--no-browser"]
