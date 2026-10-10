# Snell Docker

从官方二进制（dl.nssurge.com）构建的 Snell Server Docker 镜像，支持 amd64 / arm64。

## 文件

- `Dockerfile` — 构建镜像。不指定版本时自动解析官方最新 v6（正式版优先）；用 `--build-arg SNELL_VERSION=` 锁定版本；目标架构自动识别（buildx 的 TARGETARCH）
- `docker-compose.yml` — 启动服务，默认使用 GHCR 预构建镜像
- `snell-server.conf.example` — 配置示例，复制为 `snell-server.conf` 后填入自己的密钥（`.gitignore` 已忽略该文件，不会误提交密钥）
- `../.github/workflows/docker-snell.yml` — GitHub Actions 自动构建：`snell/` 目录有改动、每周定时检查、手动触发，都会构建多架构镜像并推送到 GHCR（`ghcr.io/x-ww/snell`）

## 使用（推荐：GHCR 镜像，无需本地构建）

```bash
# 1. 生成密钥
openssl rand -hex 16

# 2. 复制配置并填入密钥
cp snell-server.conf.example snell-server.conf
# 编辑 snell-server.conf，把 psk 换成上一步生成的密钥

# 3. 拉取并启动（需等 Actions 首次构建完成；镜像公开后无需登录）
docker compose pull && docker compose up -d

# 4. 看日志确认
docker compose logs snell
```

> 首次推送后，去 GHCR 的 package 页面把可见性改成 Public，否则服务器上 `pull` 需要先 `docker login ghcr.io`。

## 本地构建（不用 GHCR 时）

把 `docker-compose.yml` 里 `image:` 那行注释掉，打开 `build:` 两行，然后：

```bash
docker compose up -d --build
```

## 版本说明

- Actions 和本地构建默认都用官方最新 v6（有正式版用正式版，否则用最新的 rc/beta）
- 锁定版本：Actions 手动触发时填写版本号；本地构建用 `docker compose build --build-arg SNELL_VERSION=5.0.1`
- 镜像 tag：`6`（v6 最新）、`6.0.0rc2`（具体版本号，可用于锁定）

## Surge 客户端配置

```
myserver = snell, 服务器IP, 6160, psk=你的密钥, version=6, mode=default, reuse=true
```

注意：
- v6 的 `mode` 服务端和客户端必须一致（default / unshaped / unsafe-raw）
- 云服务器安全组/防火墙放行 6160 的 TCP 和 UDP
