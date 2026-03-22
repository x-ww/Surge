// 查询当前 IP 信息（使用 ip.sb）
(async () => {
  const showError = (msg) => $done({
    title: "❌ 查询失败",
    content: msg
  });

  $httpClient.get('https://api.ip.sb/geoip', (err, resp, body) => {
    if (err) return showError(`请求失败：${err}`);
    if (resp.status !== 200) return showError(`HTTP 错误：${resp.status}`);

    try {
      const data = JSON.parse(body);
      const {
        ip = "Unknown",
        country = "Unknown",
        region = "",
        city = "Unknown",
        organization = "",
        asn = ""
      } = data;

      const isp = organization || "Unknown";
      const location = `📍 ${country}${region ? ' ' + region : ''} ${city}`.replace(/ +/g, ' ').trim();

      const lines = [
        `🌐 ${ip}`,
        location,
        asn ? `🆔 ASN: AS${asn}` : null,
        isp !== "Unknown" ? `🏢 ISP: ${isp}` : null
      ].filter(Boolean);

      $done({
        title: "IP 信息",
        content: lines.join("\n")
      });
    } catch (e) {
      showError(`解析失败：${e.message || e}`);
    }
  });
})();
