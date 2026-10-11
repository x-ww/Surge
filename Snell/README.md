# Snell Docker

从官方二进制构建的 Snell Server 镜像（amd64/arm64），推送到 `ghcr.io/x-ww/snell`。

## 使用

```bash
docker compose up -d
docker compose logs snell   # 看端口和 PSK，含现成的 Surge 配置行
```

- 首次启动自动生成随机端口（20000–60000）和 32 位 PSK，保存在数据卷，重启不变
- 重新生成：`docker compose down -v` 后再 `up -d`
- 固定端口/PSK：在 compose 的 environment 里填 `SNELL_PORT` / `SNELL_PSK`
- 镜像每天自动跟进官方最新 v6（正式版优先）并构建
