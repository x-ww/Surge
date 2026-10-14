## 使用

1. 复制示例配置并填好端口和 PSK：

```bash
cp snell-server.conf.example snell-server.conf
```

2. 启动：

```bash
docker compose up -d
```

- 必须挂载 `snell-server.conf`
- 镜像每天自动跟进官方最新 v6（beta 和正式版都算）并构建
- 容器以非特权用户（uid/gid 1000）运行，并丢弃全部 capabilities

## snell-server.conf 配置

```ini
[snell-server]
listen = 0.0.0.0:6160
psk = CHANGE_ME
mode = default
dns = 8.8.8.8, 1.1.1.1
dns-ip-preference = default
```

- `listen`：监听地址和端口
- `psk`：预共享密钥，用 32 位随机字符
- `mode`：`default` 开启流量整形和加密；`unshaped` 只加密、不整形（吞吐高约 10%）；`unsafe-raw` 不加密不整形，仅限内网或已有安全隧道下使用。服务端和客户端的 `mode` 必须一致
- `dns`：服务端解析用的 DNS
- `dns-ip-preference`：DNS 解析结果的地址族偏好（`default` / `prefer-ipv4` / `prefer-ipv6` / `ipv4-only` / `ipv6-only`）

## 配合 Shadow-TLS 使用

snell 和 shadow-tls 一起跑，流量先经 Shadow-TLS 再转发给 Snell：

```yaml
services:
  snell:
    image: ghcr.io/x-ww/snell:6
    container_name: snell
    restart: unless-stopped
    network_mode: host
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    volumes:
      - ./snell-server.conf:/app/snell-server.conf:ro
  shadow-tls:
    image: ghcr.io/ihciah/shadow-tls:latest
    container_name: shadow-tls
    restart: always
    network_mode: "host"
    environment:
      - MODE=server
      - LISTEN=0.0.0.0:443
      - SERVER=127.0.0.1:53634
      - TLS=cloud.tencent.com:443
      - PASSWORD=xxx
      - V3=1
      - STRICT=1
```

## Docker 常用命令

安装 Docker：

```bash
curl -sSL https://get.docker.com | sh
```

免 sudo 使用 Docker：

```bash
sudo usermod -aG docker $USER
newgrp docker
docker ps
```

```bash
# 停止所有正在运行的容器
docker ps -q | xargs -r docker stop

# 清理所有已停止容器、未使用的镜像、网络、卷
docker system prune -a --volumes -f
```
