# Surge

个人 Surge 模块与规则集合。

## 模块

### IP Info

显示当前 IPv4、IPv6（如果可用）、位置、ASN 和 ISP：

```text
https://raw.githubusercontent.com/x-ww/Surge/main/Modules/ip.sgmodule
```

模块会分别查询 IPv4 和 IPv6，单个地址族失败不会影响另一个；请求失败时保留上次成功结果。

可选参数 `abuseipdb_key`：填入免费的 AbuseIPDB API key 后，面板会为 IPv4、IPv6
分别显示真实信誉分（`信誉分：84（举报 12）`）。key 只放在本地模块的 `argument` 里，
不要提交到仓库。

### 扫描全能王

`Modules/camscanner.sgmodule`：扫描全能王相关模块。

## 规则

- `Rules/d.conf`：直连/特殊用途规则
- `Rules/p.conf`：代理规则

## 本地检查

```bash
node --check Modules/ip.js
node tests/ip.test.js
```

`.sgmodule` 是模块片段，安装到 Surge 后由 Surge 解析；完整 profile 可用 Surge 的配置检查功能验证。
