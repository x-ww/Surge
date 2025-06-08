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
    const resp = await fetch('http://ip-api.com/json');
    if (!resp.ok) throw new Error("Request failed");
    const data = await resp.json();
    const ip = data.query || "Unknown";
    const country = data.country || "Unknown";
    const countryCode = data.countryCode || "";
    const city = data.city || "Unknown";
    const isp = data.isp || "Unknown";
    const flag = countryFlagEmoji(countryCode);
    $done({
      title: `🌐 IP 信息`,
      content: 
`| 项目   | 内容                |
| ------ | ------------------- |
| IP     | \`${ip}\`           |
| 位置   | ${flag} ${country} ${city} |
| 运营商 | ${isp}              |`
    });
  } catch (e) {
    $done({title: "Failed", content: "Failed to fetch"});
  }
})();