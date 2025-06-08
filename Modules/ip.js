// Query current IP info (using ip-api.com and IPIP.net)
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
    const [resp1, resp2] = await Promise.all([
      fetch('http://ip-api.com/json'),
      fetch('https://myip.ipip.net/json')
    ]);
    if (!resp1.ok || !resp2.ok) throw new Error("Request failed");
    const data1 = await resp1.json();
    const data2 = await resp2.json();

    const ip = data1.query || "Unknown";
    const country = data1.country || "";
    const city = data1.city || "";
    const isp = data1.isp || "";

    let ipipIp = "";
    let ipipLocation = "";
    let ipipIsp = "";
    if (data2.data) {
      ipipIp = data2.data.ip || "";
      const locArr = data2.data.location || [];
      ipipLocation = locArr.slice(0, 3).filter(Boolean).join(" ");
      ipipIsp = locArr[4] || "";
    }

    $done({
      title: "",
      content: 
        `ip-api.com: ${ip} ${country} ${city} ${isp}\n` +
        `IPIP.net: ${ipipIp} ${ipipLocation} ${ipipIsp}`.trim()
    });
  } catch (e) {
    $done({title: "Failed", content: "Failed to fetch"});
  }
})();