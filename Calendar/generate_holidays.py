#!/usr/bin/env python3
"""生成中国节假日订阅日历 china-holidays.ics。

数据来源：NateScarlet/holiday-cn（自动抓取国务院办公厅放假安排公告）
https://github.com/NateScarlet/holiday-cn

覆盖当年 + 次年，含法定节假日（放假）与调休上班日。
纯标准库，无外部依赖。
"""

import json
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

UPSTREAM = "https://raw.githubusercontent.com/NateScarlet/holiday-cn/master/{year}.json"
OUTPUT = Path(__file__).with_name("china-holidays.ics")


def fetch_year(year: int) -> list[dict]:
    try:
        with urllib.request.urlopen(UPSTREAM.format(year=year), timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        print(f"{year}: HTTP {e.code}，跳过", file=sys.stderr)
        return []
    except (urllib.error.URLError, json.JSONDecodeError, TimeoutError) as e:
        print(f"{year}: 拉取失败 {e}，跳过", file=sys.stderr)
        return []
    days = data.get("days") or []
    print(f"{year}: {len(days)} 条")
    return days


def escape_text(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )


def fold_line(line: str) -> str:
    """RFC 5545：每行最多 75 个 octet，超长按字节折行，续行以空格开头。"""
    raw = line.encode("utf-8")
    if len(raw) <= 75:
        return line
    parts, start = [], 0
    first = True
    while start < len(raw):
        limit = 75 if first else 74
        chunk = raw[start : start + limit]
        # 不在多字节字符中间截断
        while chunk and (chunk[-1] & 0xC0) == 0x80:
            chunk = chunk[:-1]
        parts.append(chunk.decode("utf-8"))
        start += len(chunk)
        first = False
    return "\r\n ".join(parts)


def build_ics(days: list[dict]) -> str:
    now = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//x-ww//China Holidays//CN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:中国节假日",
        "X-WR-TIMEZONE:Asia/Shanghai",
    ]
    for day in sorted(days, key=lambda d: d["date"]):
        d = date.fromisoformat(day["date"])
        end = d + timedelta(days=1)
        name = day["name"]
        if day["isOffDay"]:
            summary = name
            description = f"法定节假日 · {name}"
            category = "节假日"
        else:
            summary = f"上班（调休·{name}）"
            description = f"调休上班 · {name}"
            category = "调休上班"
        lines += [
            "BEGIN:VEVENT",
            f"UID:china-holiday-{d.isoformat()}@x-ww",
            f"DTSTAMP:{now}",
            f"DTSTART;VALUE=DATE:{d.strftime('%Y%m%d')}",
            f"DTEND;VALUE=DATE:{end.strftime('%Y%m%d')}",
            f"SUMMARY:{escape_text(summary)}",
            f"DESCRIPTION:{escape_text(description)}",
            f"CATEGORIES:{category}",
            "TRANSP:TRANSPARENT",
            "END:VEVENT",
        ]
    lines.append("END:VCALENDAR")
    return "\r\n".join(fold_line(line) for line in lines) + "\r\n"


def main() -> int:
    today = date.today()
    days: list[dict] = []
    for year in (today.year, today.year + 1):
        days.extend(fetch_year(year))
    if not days:
        print("没有任何数据，不写文件", file=sys.stderr)
        return 1
    OUTPUT.write_text(build_ics(days), encoding="utf-8")
    print(f"写入 {OUTPUT}，共 {len(days)} 个事件")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
