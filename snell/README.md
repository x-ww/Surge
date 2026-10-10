# Snell Docker

从官方二进制（dl.nssurge.com）构建的 Snell Server Docker 镜像。

## 文件

- `Dockerfile` — 构建镜像。默认 v6.0.0rc2；换版本用 `--build-arg SNELL_VERSION=x.y.z`，ARM 服务器用 `--build-arg SNELL_ARCH=aarch64`
- `docker-compose.yml` — 启动服务
- `snell-server.conf.example` — 配置示例，复制为 `snell-server.conf` 后填入自己的密钥（`.gitignore` 已忽略该文件，不会误提交密钥）

## 使用

```bash
# 1. 生成密钥
openssl rand -hex 16

# 2. 复制配置并填入密钥
cp snell-server.conf.example snell-server.conf
# 编辑 snell-server.conf，把 psk 换成上一步生成的密钥

# 3. 构建并启动
docker compose up -d --build

# 4. 看日志确认
docker compose logs snell
```

## Surge 客户端配置

```
myserver = snell, 服务器IP, 6160, psk=你的密钥, version=6, mode=default, reuse=true
```

注意：
- v6 的 `mode` 服务端和客户端必须一致（default / unshaped / unsafe-raw）
- 云服务器安全组/防火墙放行 6160 的 TCP 和 UDP
