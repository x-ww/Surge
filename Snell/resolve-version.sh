#!/bin/sh
# 解析官方 release notes，输出该架构可用的最新 Snell 版本号。
# 用法: sh resolve-version.sh <amd64|aarch64|i386>
# 正式版和 beta/rc 一视同仁，只按新旧取最新；失败则退出非 0。
set -e

SA=${1:?用法: sh resolve-version.sh '<amd64|aarch64|i386>'}
MAJOR=${SNELL_MAJOR:-6}
NOTES=${SNELL_NOTES_URL:-https://kb.nssurge.com/surge-knowledge-base/release-notes/snell.md}

VERSIONS=$(curl -fsSL --max-time 20 "$NOTES" \
  | grep -oE "snell-server-v[0-9][0-9a-z.]*-linux-${SA}\.zip" \
  | sed -E 's/^snell-server-v//; s/-linux-.*$//' \
  | grep -E "^${MAJOR}\." | sort -u)
[ -n "$VERSIONS" ] || { echo "ERROR: release notes 里没有 v${MAJOR} 的 ${SA} 下载包" >&2; exit 1; }

STABLE=$(echo "$VERSIONS" | grep -E '^[0-9.]+$' | sort -V | tail -1)
PRE=$(echo "$VERSIONS" | grep -E '[^0-9.]' | sort -V | tail -1)

if [ -z "$STABLE" ]; then
  V="$PRE"
elif [ -z "$PRE" ]; then
  V="$STABLE"
else
  # rc 只在其基线版本确实更新时才采用：6.0.1rc 胜过 6.0.0，6.0.0rc 不胜过 6.0.0
  PRE_BASE=$(echo "$PRE" | sed -E 's/[^0-9.].*//')
  NEWER=$(printf '%s\n%s\n' "$PRE_BASE" "$STABLE" | sort -V | tail -1)
  if [ "$NEWER" = "$PRE_BASE" ] && [ "$PRE_BASE" != "$STABLE" ]; then
    V="$PRE"
  else
    V="$STABLE"
  fi
fi

[ -n "$V" ] || { echo "ERROR: 无法解析 Snell 版本" >&2; exit 1; }
echo "$V"
