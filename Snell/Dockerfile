# 下载层：curl/unzip 只在这里用，不进最终镜像
FROM debian:stable-slim AS download

# SNELL_VERSION 为空时自动解析官方最新 v6；也可锁定具体版本，如 6.0.0rc2 / 5.0.1
ARG SNELL_VERSION=
# buildx 自动传入目标架构；手动 docker build 时回退到本机架构
ARG TARGETARCH

# 工具层与版本层分开写，Snell 升版时 apt 那层还能命中缓存（QEMU 下 arm64 装包很慢）
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl unzip \
 && rm -rf /var/lib/apt/lists/*

COPY resolve-version.sh /tmp/resolve-version.sh

# 官方包名的架构后缀与 TARGETARCH 不同，先归一化（v6 只发 aarch64/amd64/i386，没有 armv7l）
RUN set -e; \
    case "${TARGETARCH:-$(uname -m)}" in \
      arm64|aarch64) SA=aarch64 ;; \
      386|i386|i686) SA=i386 ;; \
      amd64|x86_64) SA=amd64 ;; \
      *) echo "ERROR: 官方无 '$TARGETARCH' 的 Snell 构建"; exit 1 ;; \
    esac; \
    if [ -z "$SNELL_VERSION" ]; then \
      SNELL_VERSION=$(sh /tmp/resolve-version.sh "$SA"); \
    fi; \
    [ -n "$SNELL_VERSION" ] || { echo "ERROR: 无法确定 Snell 版本"; exit 1; }; \
    echo "==> Snell version: $SNELL_VERSION ($SA)"; \
    curl -fsSL --max-time 60 -o /tmp/snell.zip \
      "https://dl.nssurge.com/snell/snell-server-v${SNELL_VERSION}-linux-${SA}.zip"; \
    unzip /tmp/snell.zip -d /srv; \
    rm /tmp/snell.zip; \
    chmod +x /srv/snell-server; \
    /srv/snell-server -v

FROM debian:stable-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd -g 1000 snell \
 && useradd -u 1000 -g snell -d /app -s /usr/sbin/nologin snell

COPY --from=download /srv/ /app/
COPY entrypoint.sh /app/entrypoint.sh

# snell-server 监听的都是 >1024 的端口，不需要 root；
# 以非特权用户运行，并把数据目录交给它，保证自动生成的配置可写
RUN chmod +x /app/entrypoint.sh \
 && mkdir -p /app/data \
 && chown -R snell:snell /app

WORKDIR /app
USER snell
ENTRYPOINT ["/app/entrypoint.sh"]
