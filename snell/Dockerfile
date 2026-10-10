FROM debian:stable-slim

ARG SNELL_VERSION=6.0.0rc2
ARG SNELL_ARCH=amd64

RUN apt-get update \
 && apt-get install -y --no-install-recommends unzip ca-certificates \
 && rm -rf /var/lib/apt/lists

ADD https://dl.nssurge.com/snell/snell-server-v${SNELL_VERSION}-linux-${SNELL_ARCH}.zip /tmp/snell.zip
RUN unzip /tmp/snell.zip -d /app \
 && rm /tmp/snell.zip \
 && chmod +x /app/snell-server

WORKDIR /app
ENTRYPOINT ["/app/snell-server"]
CMD ["-c", "/app/snell-server.conf"]
