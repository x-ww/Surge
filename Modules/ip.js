// Query current IP info (using ip-api.com)
;(async () => {
  function countryFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return '';
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(c => 127397 + c.charCodeAt());
    return String.fromCodePoint(...codePoints);
  }

  try {
    const resp = await fetch('https://ip.sb/geoip');
    if (!resp.ok) throw new Error("Request failed");
    const data = await resp.json();
    const ip = data.ip || "Unknown";
    const country = data.country || "Unknown";
    const countryCode = data.country_code || "";
    const city = data.city || "Unknown";
    const isp = data.organization || "Unknown";
    const flag = countryFlagEmoji(countryCode);
    $done({
      title: ip,
      content: `Location: ${flag} ${country} ${city}\nISP: ${isp}`
    });
  } catch (e) {
    $done({title: "Failed", content: "Failed to fetch"});
  }
})();