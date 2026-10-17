# 中国节假日订阅日历

`china-holidays.ics`：中国法定节假日 + 调休上班日，含当年与次年。

## 订阅

订阅链接：

```
https://raw.githubusercontent.com/x-ww/Surge/main/Calendar/china-holidays.ics
```

- Mac：日历 App → 文件 → 新建日历订阅 → 粘贴链接 → 订阅
- iPhone：设置 → 日历 → 帐户 → 添加帐户 → 其他 → 添加已订阅日历 → 粘贴链接

## 自动更新

GitHub Actions 每周日自动同步上游数据，有变化时自动提交。国务院公布次年放假安排后，新一年的节假日会自动出现。

数据来源：[NateScarlet/holiday-cn](https://github.com/NateScarlet/holiday-cn)（自动抓取国务院办公厅放假安排公告）。
