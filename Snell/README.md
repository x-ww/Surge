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
sudo docker stop $(docker ps -q)

# 删除所有容器
docker rm $(docker ps -a -q)

# 删除所有镜像
docker rmi $(docker images -q)

# 删除所有网络
docker network rm $(docker network ls -q)

# 删除所有卷
docker volume rm $(docker volume ls -q)

# 清理未使用的资源
docker system prune -a --volumes -f
```
