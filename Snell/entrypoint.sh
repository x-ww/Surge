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

CUR_PORT=$(sed -n 's/^listen *=.*:\([0-9][0-9]*\).*/\1/p' "$CONF" | head -1)
CUR_PSK=$(sed -n 's/^psk *= *//p' "$CONF" | head -1 | tr -d ' \t\r')

echo "==> 端口: $CUR_PORT"
echo "==> PSK: $CUR_PSK"
echo "==> Surge 客户端: snell, 服务器IP, $CUR_PORT, psk=$CUR_PSK, version=6, mode=default, reuse=true"

exec /app/snell-server -c "$CONF"
