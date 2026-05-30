ARG BUILD_FROM=ghcr.io/home-assistant/amd64-base-python:3.12-alpine3.20
FROM ${BUILD_FROM}

RUN apk add --no-cache bash coreutils util-linux pciutils usbutils docker-cli
RUN pip install --no-cache-dir fastapi uvicorn jinja2 psutil pyyaml

WORKDIR /app
COPY app /app
COPY run.sh /run.sh
RUN chmod a+x /run.sh

CMD ["/run.sh"]
