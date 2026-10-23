#!/usr/bin/env python3
"""
Surge 模块离线校验器

用法：
    python3 Assets/check-module.py Modules/adblock.sgmodule [更多文件...]
    python3 Assets/check-module.py --no-network Modules/*.sgmodule

检查项：
    1. 元数据完整性（#!name / #!desc）
    2. 规则语法（规则类型、策略名、选项组合）
    3. pre-matching 语义（只能配 REJECT 系策略）
    4. 远程资源可达性（HEAD 请求，非 200 即失败；--no-network 可跳过）
    5. 许可证卫生（禁止内联大量域名，防止误引入 copyleft 数据）

退出码：0 = 全部通过，1 = 存在问题
"""

from __future__ import annotations

import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# ---------------------------------------------------------------------------
# 规则定义
# ---------------------------------------------------------------------------

# 模块规则只能使用内建策略
ALLOWED_POLICIES = {
    "DIRECT",
    "REJECT",
    "REJECT-TINYGIF",
    "REJECT-DROP",
    "REJECT-NO-DROP",
}

# 可以配 pre-matching 的策略（必须属于 REJECT 系）
PREMETCHING_POLICIES = {"REJECT", "REJECT-TINYGIF", "REJECT-DROP", "REJECT-NO-DROP"}

# 合法规则类型
RULE_TYPES = {
    "DOMAIN",
    "DOMAIN-SUFFIX",
    "DOMAIN-KEYWORD",
    "DOMAIN-SET",
    "DOMAIN-WILDCARD",
    "IP-CIDR",
    "IP-CIDR6",
    "IP-ASN",
    "GEOIP",
    "RULE-SET",
    "PROCESS-NAME",
    "PROCESS-PATH",
    "USER-AGENT",
    "URL-REGEX",
    "DEST-PORT",
    "SRC-PORT",
    "SRC-IP",
    "SUBNET",
    "PROTOCOL",
    "AND",
    "OR",
    "NOT",
    "FINAL",
    "INLINE",
}

# 需要远程 URL 的规则类型
REMOTE_RULE_TYPES = {"RULE-SET", "DOMAIN-SET"}

# 内联域名条数上限：超过即视为「把别人的列表抄进来了」
MAX_INLINE_DOMAIN_LINES = 50


class Checker:
    def __init__(self, path: Path, network: bool = True) -> None:
        self.path = path
        self.network = network
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.remote_urls: list[str] = []

    # -- 报告 ---------------------------------------------------------------
    def error(self, line_no: int | None, msg: str) -> None:
        prefix = f"{self.path.name}:{line_no}" if line_no else self.path.name
        self.errors.append(f"{prefix}: {msg}")

    def warn(self, line_no: int | None, msg: str) -> None:
        prefix = f"{self.path.name}:{line_no}" if line_no else self.path.name
        self.warnings.append(f"{prefix}: {msg}")

    # -- 解析 ---------------------------------------------------------------
    def run(self) -> bool:
        text = self.path.read_text(encoding="utf-8")
        lines = text.splitlines()

        self.check_metadata(lines)
        self.check_rules(lines)
        self.check_license_hygiene(lines)
        self.check_remote_urls()

        return not self.errors

    def check_metadata(self, lines: list[str]) -> None:
        meta = {}
        for line in lines:
            m = re.match(r"^#!(\w[\w-]*)\s*=\s*(.*)$", line)
            if m:
                meta[m.group(1)] = m.group(2).strip()

        for required in ("name", "desc"):
            if required not in meta:
                self.error(None, f"缺少必需元数据 #!{required}")

        if "requirement" in meta:
            expr = meta["requirement"]
            if not re.match(r"^CORE_VERSION\s*[<>=!]", expr):
                self.warn(None, f"#!requirement 未以 CORE_VERSION 开头：{expr}")

    def check_rules(self, lines: list[str]) -> None:
        in_rule = False
        for idx, raw in enumerate(lines, start=1):
            line = raw.strip()
            if not line or line.startswith("#") or line.startswith("//"):
                continue
            if line.startswith("["):
                in_rule = line.lower() == "[rule]"
                continue
            if not in_rule:
                continue

            parts = [p.strip() for p in line.split(",")]
            rule_type = parts[0].upper()

            if rule_type not in RULE_TYPES:
                self.error(idx, f"未知规则类型 {rule_type}")
                continue

            if rule_type == "FINAL":
                self.error(idx, "模块中不应出现 FINAL 规则（由主配置提供）")
                continue

            # 策略是倒数第二段（最后一段可能是选项）
            if len(parts) < 3:
                self.error(idx, f"规则缺少策略：{line}")
                continue

            # 从右往左找策略名
            policy = None
            policy_pos = None
            for pos in range(len(parts) - 1, 0, -1):
                if parts[pos].upper() in ALLOWED_POLICIES:
                    policy = parts[pos].upper()
                    policy_pos = pos
                    break

            if policy is None:
                # 可能是引用了代理组名 —— 模块不允许
                self.error(
                    idx,
                    f"策略必须是内建策略（{'/'.join(sorted(ALLOWED_POLICIES))}），"
                    f"模块不能用代理组：{line}",
                )
                continue

            options = [p.lower() for p in parts[policy_pos + 1 :]]

            if "pre-matching" in options and policy not in PREMETCHING_POLICIES:
                self.error(idx, f"pre-matching 只能用于 REJECT 系策略，当前是 {policy}")

            if rule_type in REMOTE_RULE_TYPES:
                target = parts[1]
                if target.startswith("http://") or target.startswith("https://"):
                    self.remote_urls.append(target)
                elif not re.match(r"^[A-Za-z][\w-]*$", target):
                    self.error(idx, f"远程资源地址格式可疑：{target}")

    def check_license_hygiene(self, lines: list[str]) -> None:
        """内联域名过多意味着把上游列表抄进了仓库，会有 copyleft 传染风险。"""
        in_rule = False
        inline = 0
        for raw in lines:
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("["):
                in_rule = line.lower() == "[rule]"
                continue
            if not in_rule:
                continue
            if line.upper().startswith(("DOMAIN,", "DOMAIN-SUFFIX,", "DOMAIN-KEYWORD,")):
                inline += 1

        if inline > MAX_INLINE_DOMAIN_LINES:
            self.error(
                None,
                f"内联了 {inline} 条域名（上限 {MAX_INLINE_DOMAIN_LINES}）。"
                "本项目只引用上游 URL，不内联列表内容，以避免 copyleft 传染。",
            )
        elif inline > 0:
            self.warn(None, f"内联了 {inline} 条域名，请确认均为自建白名单")

    def check_remote_urls(self) -> None:
        if not self.network:
            if self.remote_urls:
                self.warn(None, f"跳过 {len(self.remote_urls)} 个远程资源的可达性检查")
            return

        for url in self.remote_urls:
            self._check_one_url(url)

    def _check_one_url(self, url: str, attempts: int = 3) -> None:
        """带重试，避免 CI 环境瞬时网络抖动造成误报。"""
        last_error = ""
        for attempt in range(attempts):
            if attempt:
                time.sleep(2 * attempt)  # 2s, 4s
            try:
                req = urllib.request.Request(url, method="HEAD")
                req.add_header("User-Agent", "surge-module-checker/1.0")
                with urllib.request.urlopen(req, timeout=20) as resp:
                    if resp.status == 200:
                        return
                    last_error = f"HTTP {resp.status}"
            except urllib.error.HTTPError as e:
                # 4xx 是确定性错误，重试无意义
                if 400 <= e.code < 500:
                    self.error(None, f"远程资源返回 HTTP {e.code}：{url}")
                    return
                last_error = f"HTTP {e.code}"
            except Exception as e:  # noqa: BLE001
                last_error = type(e).__name__

        self.error(None, f"远程资源不可达（{last_error}，已重试 {attempts} 次）：{url}")

    # -- 输出 ---------------------------------------------------------------
    def report(self) -> None:
        for w in self.warnings:
            print(f"  WARN  {w}")
        for e in self.errors:
            print(f"  FAIL  {e}")

        if self.errors:
            print(f"\n{self.path}: {len(self.errors)} 个错误")
        elif self.warnings:
            print(f"\n{self.path}: 通过（{len(self.warnings)} 个警告）")
        else:
            print(f"\n{self.path}: 通过")


def main(argv: list[str]) -> int:
    args = argv[1:]
    network = True

    if "--no-network" in args:
        network = False
        args = [a for a in args if a != "--no-network"]

    if not args:
        print(__doc__)
        return 1

    all_ok = True
    for arg in args:
        path = Path(arg)
        if not path.is_file():
            print(f"  FAIL  文件不存在：{path}")
            all_ok = False
            continue
        checker = Checker(path, network=network)
        ok = checker.run()
        checker.report()
        all_ok = all_ok and ok

    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
