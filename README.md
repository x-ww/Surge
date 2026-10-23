# Surge

个人使用的 Surge 配置、模块与脚本集合。

## 目录结构

| 目录 | 内容 |
|---|---|
| `Modules/` | **仅存放 `.sgmodule` 模块文件**，可直接通过 URL 安装 |
| `Assets/` | 模块依赖的脚本、规则片段、说明文档与校验工具 |
| `Snell/` | Snell 服务端 Docker 镜像构建文件 |

## 模块

| 模块 | 说明 | 安装 |
|---|---|---|
| `adblock.sgmodule` | 去广告。引用上游公开列表 + 修补已知误杀，不内联拦截域名 | [安装](https://raw.githubusercontent.com/x-ww/Surge/main/Modules/adblock.sgmodule) · [说明](./Assets/adblock.md) |
| `ip.sgmodule` | IP 信息面板，显示 IP、位置、网络类型与信誉分 | [安装](https://raw.githubusercontent.com/x-ww/Surge/main/Modules/ip.sgmodule) |

## Assets 说明

| 文件 | 用途 |
|---|---|
| `ip.js` | `ip.sgmodule` 的面板脚本，由模块通过 raw URL 引用 |
| `check-module.py` | 模块离线校验器，CI 使用 |
| `adblock.md` | `adblock.sgmodule` 的详细说明：来源、许可证、误杀、校验方法 |
| `d.conf` / `p.conf` | 直连 / 代理规则片段，手动粘贴到 profile 使用 |

## 模块校验

```bash
# 离线检查：元数据、规则语法、pre-matching 语义、内联域名数量
python3 Assets/check-module.py --no-network Modules/*.sgmodule

# 含远程资源可达性检查（需要网络）
python3 Assets/check-module.py Modules/adblock.sgmodule
```

CI 在每次推送到 `Modules/` 或 `Assets/` 时自动运行。

## 许可证

[MIT](./LICENSE)

`Modules/adblock.sgmodule` 仅引用上游规则列表的 URL，不复制其内容。
各上游许可证详见 [Assets/adblock.md](./Assets/adblock.md#上游许可证)。
