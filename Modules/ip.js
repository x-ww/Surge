// 查询当前 IP 信息（使用 ip.sb）
(async () => {
  const args = Object.fromEntries(
    ($argument || "").split("&").filter(Boolean).map(s => {
      const i = s.indexOf("=");
      return [s.slice(0, i), decodeURIComponent(s.slice(i + 1))];
    })
  );

  const icon = args.icon || "globe.asia.australia";
  const iconColor = args["icon-color"] || "#6699FF";

  const showError = (msg) => $done({
    title: "❌ 查询失败",
    content: msg,
    icon,
    "icon-color": iconColor
  });

  const flag = (code) =>
    code
      ? [...code.toUpperCase()].map(c =>
          String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))
        ).join("")
      : "🌍";

  const fetchWithTimeout = (url, timeout = 8000) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("请求超时")), timeout);
      $httpClient.get(url, (err, resp, body) => {
        clearTimeout(timer);
        if (err) return reject(new Error(err));
        resolve({ resp, body });
      });
    });

  try {
    const { resp, body } = await fetchWithTimeout('https://api.ip.sb/geoip');
    if (resp.status !== 200) return showError(`HTTP 错误：${resp.status}`);

    const data = JSON.parse(body);
    console.log(JSON.stringify(data)); // 调试用，确认字段后可删除

    const {
      ip = "Unknown",
      country = "Unknown",
      country_code = "",
      region = "",
      city = "Unknown",
      organization = "",
      asn = ""
    } = data;

    const isp = organization || "Unknown";

    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const location = `${flag(country_code)} ${country}${region ? ' ' + region : ''} ${city}`
      .replace(/ +/g, ' ').trim();

    const lines = [
      `🌐 ${ip}`,
      location,
      asn ? `🔢 ASN: AS${asn}` : null,
      isp !== "Unknown" ? `🏢 ISP: ${isp}` : null
    ].filter(Boolean);

    $done({
      title: `IP 信息   🕐 ${time}`,
      content: lines.join("\n"),
      icon,
      "icon-color": iconColor
    });
  } catch (e) {
    showError(e.message || "未知错误");
  }
})();
