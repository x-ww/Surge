// 查询当前 IP 信息（使用 ip.sb）
;(async () => {
  try {
    const resp = await fetch('https://api.ip.sb/geoip');
    if (!resp.ok) throw new Error("请求失败");
    const data = await resp.json();
    const ip = data.ip || "未知";
    const country = data.country || "未知";
    const isp = data.isp || "未知";
    $done({
      title: "IP 查询",
      content: `IP: ${ip}\n国家: ${country}\n运营商: ${isp}`
    });
  } catch (e) {
    $done({title: "IP 查询", content: "获取失败"});
  }
})();