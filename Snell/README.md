# Snell Docker

从官方二进制构建的 Snell Server 镜像（amd64/arm64），推送到 `ghcr.io/x-ww/snell`。

## 使用

1. 复制示例配置并填好端口和 PSK：

```bash
cp snell-server.conf.example snell-server.conf
```

2. 启动：

```bash
docker compose up -d
```

- 必须挂载 `snell-server.conf`，容器不再自动生成端口/PSK
- 镜像每天自动跟进官方最新 v6（beta 和正式版都算）并构建
- 容器以非特权用户（uid/gid 1000）运行，并丢弃全部 capabilities；若使用 v5 的 `egress-interface`，需在 compose 里放开 `cap_add: [NET_RAW, NET_ADMIN]`

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

- `SERVER` 改成你 Snell 的监听地址（上面是 53634）
- `PASSWORD` 改成你的密码，客户端的 shadow-tls 密码与这里一致
- `TLS` 是伪装域名

## 从旧版升级

旧版会在数据卷里自动生成配置。新版不再用数据卷，改为挂载配置文件：

- 想沿用旧配置：从卷里取出，写入 `snell-server.conf`：

  ```bash
  docker run --rm -v snell-data:/d alpine cat /d/snell-server.conf > snell-server.conf
  ```

- 确认无用后可删除旧卷：`docker volume rm snell-data`
