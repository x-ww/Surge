// 查询当前 IP 信息（使用 ip.sb）
;(async () => {
  try {
    $httpClient.get('https://api.ip.sb/geoip', (err, resp, body) => {
      if (err) {
        $done({
          title: "Failed",
          content: `Failed to fetch: ${err}`
        });
        return;
      }
      try {
        const data = JSON.parse(body);
        const ip = data.ip || "Unknown";
        const country = data.country || "Unknown";
        const city = data.city || "Unknown";
        const isp = data.isp || data.organization || data.org || "Unknown";
        $done({
          title: ip,
          content: `Location: ${country} ${city}\nISP: ${isp}`
        });
      } catch (e) {
        $done({
          title: "Failed",
          content: `Failed to parse: ${e.message || e}`
        });
      }
    });
  } catch (e) {
    $done({
      title: "Failed",
      content: `Failed to fetch: ${e.message || e}`
    });
  }
})();