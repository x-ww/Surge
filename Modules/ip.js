// 查询当前 IP 信息（使用 ifconfig.co）
;(async () => {
  try {
    const resp = await fetch('https://ifconfig.co/json');
    if (!resp.ok) throw new Error(`Request failed: ${resp.status}`);
    const data = await resp.json();
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
      content: `Failed to fetch: ${e.message || e}`
    });
  }
})();