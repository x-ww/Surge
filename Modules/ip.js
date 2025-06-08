// Query current IP info (using ip.sb)
;(async () => {
  try {
    const resp = await fetch('https://api.ip.sb/geoip');
    if (!resp.ok) throw new Error("Request failed");
    const data = await resp.json();
    const ip = data.ip || "Unknown";
    const country = data.country || "Unknown";
    const city = data.city || "Unknown";
    const isp = data.isp || "Unknown";
    $done({
      title: ip,
      content: `Country: ${country}\nCity: ${city}\nISP: ${isp}`
    });
  } catch (e) {
    $done({title: "Failed", content: "Failed to fetch"});
  }
})();