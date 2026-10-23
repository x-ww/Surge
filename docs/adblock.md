# AdBlock 模块说明

[`adblock.sgmodule`](./adblock.sgmodule) 是一个 Surge 去广告模块。

**设计原则：本仓库不存储任何拦截域名。** 模块只做两件事——引用上游公开列表、修补已知误杀。
所有拦截域名在运行时由 Surge 直接从原作者服务器下载，本仓库只保存「该装什么、按什么顺序装」这层编排逻辑。

唯一内联的内容是白名单（`DOMAIN-xxx,DIRECT`），用于把上游误拦的合法服务放行。
白名单是本项目原创内容，不涉及第三方版权。

## 安装

```
https://raw.githubusercontent.com/x-ww/Surge/main/Modules/adblock.sgmodule
```

在 Surge 中选择「模块 → 从 URL 安装」，粘贴上面的地址，启用即可。

## 前置条件

| 项目 | 要求 |
|---|---|
| Surge 核心版本 | `CORE_VERSION >= 20`（模块内已声明 `#!requirement`） |
| MITM | 需要开启才能让第 3 层的 `URL-REGEX` 规则生效 |
| CA 证书 | 在 Surge 中生成并安装到系统钥匙串，设为信任 |

不装 MITM 时，第 1、2、4、5 层照常工作，只有路径级拦截失效。

## 规则分层

| 层 | 上游 | 内容 | 为什么需要 |
|---|---|---|---|
| 白名单 | 自建 | 误杀修补 | 上游会拦掉少数合法服务，需在上层放行 |
| 1 | [217heidai/adblockfilters](https://github.com/217heidai/adblockfilters) | 23.6 万条域名 | 覆盖最广，含 5.5 万条其他表都没有的长尾广告域名 |
| 2 | [Cats-Team/AdRules](https://github.com/Cats-Team/AdRules) | 409 条通配符 + 24 条关键词 | `DOMAIN-SET` 无法表达 `*-ad-sign.byteimg.com` 这类模式 |
| 3 | [SukkaW/Surge](https://github.com/SukkaW/Surge) | 161 条精确域名 + 144 条关键词 | 含 `URL-REGEX`，可只拦具体路径而不误伤整站 |
| 4 | SukkaW/Surge | `REJECT-DROP` / `REJECT-NO-DROP` | 静默丢包，广告 SDK 不会重试，比 `REJECT` 省电 |
| 5 | SukkaW/Surge | 广告落地页 IP | 运营商 NXDOMAIN 劫持页 |

顺序不能调整：域名规则必须在 IP 规则之前，否则每次拦截都要先做一次 DNS 解析。

## 上游许可证

| 上游 | 许可证 | 本项目使用方式 |
|---|---|---|
| 217heidai/adblockfilters | GPL-3.0 | **仅引用 URL**，不复制内容 |
| Cats-Team/AdRules | 0BSD | **仅引用 URL**，不复制内容 |
| SukkaW/Surge | AGPL-3.0 | **仅引用 URL**，不复制内容 |

> **为什么不内联域名**：上表中 GPL-3.0 与 AGPL-3.0 是 copyleft 许可证。
> 若把它们的域名列表复制进本仓库，本仓库将被迫采用相同许可证。
> 而通过 URL 引用时，用户是从原作者服务器获取内容，本仓库并未分发这些内容，
> 因此不受 copyleft 约束。这也是 Surge 社区模块的通行做法。

若你确实需要内联域名，请只使用 **0BSD / MIT** 来源（如 AdRules、anti-AD、StevenBlack hosts）。

## 已知误杀与白名单

默认只放行一条：

| 域名 | 原因 |
|---|---|
| `forter.com` | 反欺诈服务，部分电商结账依赖它，拦截可能影响支付 |

模块内还以注释形式列出了几个候选，按需取消注释：

| 域名 | 说明 |
|---|---|
| `newrelic.com` / `sentry.io` | 开发者监控面板，用户侧通常无感 |
| `plausible.io` / `simpleanalytics.com` / `umami.is` | 隐私友好型统计，拦截会破坏站长统计 |

**注意**：`hotjar.com`、`mixpanel.com`、`amplitude.com`、`segment.com`、`clarity.ms`
这类埋点分析域名**不在白名单内**，因为拦截它们正是本模块的目的，不算误杀。

## 本地校验

### 1. 离线检查（无需 Surge，任何平台可用）

```bash
python3 Assets/check-module.py Modules/adblock.sgmodule
```

检查元数据完整性、规则语法、`pre-matching` 语义、远程 URL 可达性、内联域名数量。

### 2. 用真实 Surge 核心校验（仅 macOS）

`.sgmodule` 不能直接交给 `surge-cli --check`（会报 `Rules must end with FINAL`），
需要包一层临时 profile：

```bash
# 抽出 [Rule] 段塞进临时 profile，补 FINAL 后再校验
{
  echo "[General]"; echo "loglevel = notify"
  echo "[Proxy]"; echo "D = direct"
  echo "[Proxy Group]"; echo "P = select, D"
  echo "[Rule]"
  awk '/^\[Rule\]/{f=1;next} /^\[/{f=0} f' Modules/adblock.sgmodule
  echo "FINAL,P"
  awk '/^\[Rule\]/{skip=1;next} /^\[/{skip=0} !skip' Modules/adblock.sgmodule | grep -v '^#!'
} > /tmp/check.conf

/Applications/Surge.app/Contents/Applications/surge-cli --check /tmp/check.conf
```

### 3. 装到 Surge 后验证

```bash
surge-cli rule match "pagead2.googlesyndication.com"   # 应命中 REJECT
surge-cli rule match "forter.com"                      # 应命中 DIRECT（白名单）
surge-cli external-resource list                       # 确认远程表加载成功
surge-cli log memory 200 | grep REJECT                 # 看实际拦截
surge-cli benchmark rule-matching                      # 对比性能开销
```

> **坑**：`surge-cli rule temp add` 添加的远程 `RULE-SET` / `DOMAIN-SET` **不会真正加载**，
> 日志会报 `Try to load resource without define object`。测试新规则必须真装模块。

## 国内加速

若拉取上游列表缓慢，可改用镜像（改完请确认内容与主站一致）：

| 上游 | 镜像 |
|---|---|
| 217heidai | `https://cdn.jsdelivr.net/gh/217heidai/adblockfilters@main/rules/adblocksurge.list` |
| Sukka | `https://ruleset-mirror.skk.moe/List/...` |
| AdRules | `https://gp.adrules.top/adrules-surge.conf` |

jsDelivr 有约 12 小时缓存延迟。

## 已知限制

1. **只能做域名级拦截**。App 内广告（开屏、信息流、悬浮窗）多数走主 App 自己的域名，
   必须靠 MITM + `[Map Local]` 返回空 JSON 才能去掉。本模块不包含这类规则。
2. **模块规则只能使用内建策略**（`DIRECT` / `REJECT` / `REJECT-TINYGIF` 等），
   不能用代理组，因此本模块无法参与分流。
3. **不能替代浏览器扩展**。Surge 只能拦整个域名，对同一域名下的具体路径无能为力
   （除非启用开销较大的 `URL-REGEX` + MITM）。浏览器内的广告请用 uBlock Origin 等扩展。

## 维护

上游列表由各作者自动更新，本模块**无需跟随更新**。仅在以下情况需要改动：

- 上游 URL 变更（CI 会因可达性检查失败而报警）
- 发现新的误杀，需要补充白名单
- Surge 核心版本要求变化
