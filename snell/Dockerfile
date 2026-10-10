FROM debian:stable-slim

# SNELL_VERSION 为空时，构建时自动解析官方最新 v6 版本；
# 也可指定具体版本锁定，如 6.0.0rc2 / 5.0.1
ARG SNELL_VERSION=
# buildx 自动传入目标架构（amd64 / arm64 / ...）
ARG TARGETARCH

RUN apt-get update \
 && apt-get install -y --no-install-recommends unzip ca-certificates curl \
 && rm -rf /var/lib/apt/lists

# 官方下载包的架构命名与 TARGETARCH 不完全一致，先做映射；
# 再从官方 release notes 页面提取该架构的所有 v6 版本号，
# 优先选正式版（纯数字），没有正式版才选最新的 rc/beta
RUN set -e; \
    case "$TARGETARCH" in \
      arm64) SA=aarch64 ;; \
      arm/v7|armv7) SA=armv7l ;; \
      386|i386) SA=i386 ;; \
      *) SA="$TARGETARCH" ;; \
    esac; \
    [ -n "$SA" ] || { echo "ERROR: 无法确定目标架构"; exit 1; }; \
    if [ -z "$SNELL_VERSION" ]; then \
      VERSIONS=$(curl -sL --max-time 20 https://kb.nssurge.com/surge-knowledge-base/release-notes/snell.md \
        | grep -oE "snell-server-v[0-9][0-9a-z.]*-linux-${SA}\\.zip" \
        | sed -E 's/^snell-server-v//; s/-linux-.*$//' \
        | grep -E '^6\.' | sort -u); \
      SNELL_VERSION=$(echo "$VERSIONS" | grep -E '^[0-9.]+$' | sort -V | tail -1); \
      [ -n "$SNELL_VERSION" ] || SNELL_VERSION=$(echo "$VERSIONS" | sort -V | tail -1); \
    fi; \
    [ -n "$SNELL_VERSION" ] || { echo "ERROR: 无法解析 Snell 版本"; exit 1; }; \
    echo "==> Snell version: $SNELL_VERSION ($SA)"; \
    curl -sL --max-time 60 -o /tmp/snell.zip \
      "https://dl.nssurge.com/snell/snell-server-v${SNELL_VERSION}-linux-${SA}.zip"; \
    unzip /tmp/snell.zip -d /app; \
    rm /tmp/snell.zip; \
    chmod +x /app/snell-server; \
    /app/snell-server -v

COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

WORKDIR /app
ENTRYPOINT ["/app/entrypoint.sh"]
