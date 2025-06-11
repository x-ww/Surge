// 查询当前 IP 信息（使用 ifconfig.co）
;(async () => {
  try {
    $httpClient.get('https://ifconfig.co/json', (err, resp, body) => {
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
        const org = data.org || "Unknown";
        $done({
          title: ip,
          content: `Location: ${country} ${city}\nISP: ${org}`
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