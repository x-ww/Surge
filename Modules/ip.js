// 查询当前 IP 信息（使用 ip.sb）
(async () => {
  const showError = (msg) => $done({ 
    title: "❌ 查询失败", 
    content: msg 
  });

  $httpClient.get('https://api.ip.sb/geoip', (err, resp, body) => {
    if (err) return showError(`获取信息失败：${err}`);
    
    try {
      const { 
        ip = "Unknown", 
        country = "Unknown", 
        region = "", 
        city = "Unknown",
        isp = data.organization || data.org || "Unknown",
        asn 
      } = JSON.parse(body);
      
      const location = `📍 ${country}${region ? ' ' + region : ''} ${city}`.replace(/ +/g, ' ').trim();
      
      const lines = [
        `🌐 ${ip}`,
        location,
        asn && `🆔 ASN: AS${asn}`,
        isp !== "Unknown" && `🏢 ISP: ${isp}`
      ].filter(Boolean);
      
      $done({ 
        title: "IP 信息", 
        content: lines.join("\n") 
      });
    } catch (e) {
      showError(`数据解析失败：${e.message || e}`);
    }
  });
})();
