// Query current IP info (using ip.sb)
;(async () => {
  try {
    const resp = await fetch('https://api.ip.sb/geoip');
    if (!resp.ok) throw new Error("Request failed");
    const data = await resp.json();
    const ip = data.ip || "Unknown";
    const country = data.country || "Unknown";
    const isp = data.isp || "Unknown";
    $done({
      title: "IP Info",
      content: `IP: ${ip}\nCountry: ${country}\nISP: ${isp}`
    });
  } catch (e) {
    $done({title: "IP Info", content: "Failed to fetch"});
  }
})();