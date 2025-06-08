// Query current IP info (prefer IPv4, fallback to IPv6, using ip.sb)
;(async () => {
  function countryFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(c => 127397 + c.charCodeAt());
    return String.fromCodePoint(...codePoints);
  }

  async function fetchIP(version = 4) {
    const resp = await fetch(`https://api.ip.sb/geoip?ip_version=${version}`);
    if (!resp.ok) throw new Error("Request failed");
    return await resp.json();
  }

  try {
    let data;
    try {
      data = await fetchIP(4); // 优先请求IPv4
    } catch {
      data = await fetchIP(6); // 失败则请求IPv6
    }
    const ip = data.ip || "Unknown";
    const country = data.country || "Unknown";
    const countryCode = data.country_code || "";
    const city = data.city || "Unknown";
    const isp = data.isp || "Unknown";
    const flag = countryFlagEmoji(countryCode);
    $done({
      title: ip,
      content: `Location: ${flag} ${country} ${city}\nISP: ${isp}`
    });
  } catch (e) {
    $done({title: "Failed", content: "Failed to fetch"});
  }
})();