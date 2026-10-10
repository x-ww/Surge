# Snell Docker

从官方二进制（dl.nssurge.com）构建的 Snell Server Docker 镜像，支持 amd64 / arm64。

## 开箱即用：自动生成随机端口和 PSK

**无需任何配置**，直接启动即可：

```bash
docker compose up -d
```

首次启动时自动生成随机端口（20000–60000）和随机 32 位 PSK，打印在日志里：

```bash
docker compose logs snell
# ==>
# ==> 端口: 32903
# ==> PSK: 5LKCFeKlofDwIqD8NGwPoeEdZmfu4K06
# ==> Surge 客户端: snell, 服务器IP, 32903, psk=5LKCFeKlofDwIqD8NGwPoeEdZmfu4K06, version=6, mode=default, reuse=true
```

- 生成的配置保存在数据卷中，**重启不会变**
- 想重新生成：`docker compose down -v` 后再 `up -d`
- 想固定端口/PSK：在 `docker-compose.yml` 的 environment 里填 `SNELL_PORT` / `SNELL_PSK`
- 想完全自己写配置：把 `snell-server.conf.example` 复制为 `snell-server.conf`，取消 compose 里那组 volumes 注释挂载进去（手动配置优先于自动生成）

## 文件

- `Dockerfile` — 构建镜像。不指定版本时自动解析官方最新 v6（正式版优先）；`--build-arg SNELL_VERSION=` 锁定版本；架构自动识别
- `entrypoint.sh` — 启动脚本：生成/加载配置，打印端口、PSK 和现成的 Surge 客户端配置行
- `docker-compose.yml` — 服务定义（host 网络模式 + 数据卷持久化配置）
- `snell-server.conf.example` — 手动配置示例
- `../.github/workflows/docker-snell.yml` — GitHub Actions 自动构建多架构镜像并推送 GHCR（`ghcr.io/x-ww/snell`）

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
myserver = snell, 服务器IP, 端口, psk=密钥, version=6, mode=default, reuse=true
```
（端口和密钥从 `docker compose logs snell` 里抄）

注意：
- v6 的 `mode` 服务端和客户端必须一致（default / unshaped / unsafe-raw）
- 使用 host 网络模式：端口直接占用宿主机端口，无需映射；Mac 的 Docker Desktop 不支持 host 模式（Linux 服务器没问题）
- 云服务器防火墙放行实际使用的端口（TCP 和 UDP）
