// 查询当前 IP 信息（使用 ip.sb）
;(async () => {
  try {
    $httpClient.get('https://api.ip.sb/geoip', (err, resp, body) => {
      if (err) {
        $done({
          title: "❌ 查询失败",
          content: `获取信息失败：${err}`
        });
        return;
      }
      try {
        const data = JSON.parse(body);
        const ip = data.ip || "Unknown";
        const country = data.country || "Unknown";
        const region = data.region || "";
        const city = data.city || "Unknown";
        const isp = data.isp || data.organization || data.org || "Unknown";
        const asn = data.asn ? `AS${data.asn}` : "";
        let lines = [];
        lines.push(`🌐 <b>${ip}</b>`);
        lines.push(`📍 <b>${country}${region ? ' ' + region : ''} ${city}</b>`.replace(/ +/g, ' ').trim());
        if (asn) lines.push(`🆔 ASN: <b>${asn}</b>`);
        if (isp) lines.push(`🏢 ISP: <b>${isp}</b>`);
        $done({
          title: `IP 信息`,
          content: lines.join("\n")
        });
      } catch (e) {
        $done({
          title: "❌ 解析失败",
          content: `数据解析失败：${e.message || e}`
        });
      }
    });
  } catch (e) {
    $done({
      title: "❌ 查询失败",
      content: `获取信息失败：${e.message || e}`
    });
  }
})();