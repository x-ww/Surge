#!/bin/sh
# Snell 容器启动脚本：
# 1. 手动挂载的 /app/snell-server.conf 优先
# 2. 否则用数据卷中的配置；没有则自动生成随机端口 + 随机 PSK
# 3. 打印端口、PSK 和现成的 Surge 客户端配置行，然后启动 snell-server
set -e

MANUAL_CONF=/app/snell-server.conf
DATA_DIR=/app/data
GEN_CONF=$DATA_DIR/snell-server.conf

if [ -f "$MANUAL_CONF" ]; then
  CONF="$MANUAL_CONF"
  echo "==> 使用手动挂载的配置文件"
else
  mkdir -p "$DATA_DIR"
  CONF="$GEN_CONF"
  if [ ! -f "$CONF" ]; then
    PORT=${SNELL_PORT:-$(shuf -i 20000-60000 -n 1)}
    PSK=${SNELL_PSK:-$(tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 32)}
    {
      echo "[snell-server]"
      echo "listen = 0.0.0.0:$PORT"
      echo "psk = $PSK"
      echo "mode = default"
      echo "dns-ip-preference = default"
    } > "$CONF"
    echo "==> 已生成随机配置（保存在数据卷中，重启不会变）"
  else
    echo "==> 使用已生成的配置"
  fi
fi

SHOW_PORT=$(sed -n 's/^listen *=.*:\([0-9][0-9]*\).*/\1/p' "$CONF" | head -1)
SHOW_PSK=$(sed -n 's/^psk *= *//p' "$CONF" | head -1 | tr -d ' \t\r')
echo "==> 端口: $SHOW_PORT"
echo "==> PSK: $SHOW_PSK"
echo "==> Surge 客户端: snell, 服务器IP, $SHOW_PORT, psk=$SHOW_PSK, version=6, mode=default, reuse=true"

exec /app/snell-server -c "$CONF"
