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
- 镜像每天自动跟进官方最新 v6（beta 和正式版都算）并构建
- 容器以非特权用户（uid/gid 1000）运行，并丢弃全部 capabilities；若使用 v5 的 `egress-interface`，需在 compose 里放开 `cap_add: [NET_RAW, NET_ADMIN]`

## 从旧版（root 运行）升级

旧镜像以 root 运行，若 `snell-data` 卷是它创建的，属主仍是 root，新镜像里的非特权用户会因无写权限而启动失败。任选一种处理：

- `docker compose down -v` 后 `up -d`（会重新生成端口/PSK）
- 保留原配置，手动改属主：
  ```bash
  docker run --rm -v snell-data:/d alpine chown -R 1000:1000 /d
  ```
