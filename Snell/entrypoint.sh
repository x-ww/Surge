#!/bin/sh
# Snell 容器启动脚本：必须挂载配置文件 /app/snell-server.conf，不再自动生成端口/PSK。
set -e

CONF=/app/snell-server.conf

if [ ! -f "$CONF" ]; then
  echo "ERROR: 找不到 $CONF" >&2
  echo "请复制 Snell/snell-server.conf.example 为 snell-server.conf，填好端口和 PSK，再挂载到容器：" >&2
  echo "  volumes:" >&2
  echo "    - ./snell-server.conf:/app/snell-server.conf:ro" >&2
  exit 1
fi

echo "==> 使用配置文件: $CONF"

exec /app/snell-server -c "$CONF"
