// 查询当前 IP 信息（使用 ip.sb）
(async () => {
  const args = Object.fromEntries(
    ($argument || "").split("&").filter(Boolean).map(s => {
      const i = s.indexOf("=");
      return [s.slice(0, i), decodeURIComponent(s.slice(i + 1))];
    })
  );

  const icon      = args.icon || "globe.asia.australia";
  const iconColor = args["icon-color"] || "#6699FF";

  const showError = (msg) => $done({
    title:       "❌ 查询失败",
    content:     msg,
    icon,
    "icon-color": iconColor,
  });

  const flag = (code) => {
    if (!code) return "";
    return [...code.toUpperCase()]
      .map(c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0)))
      .join("");
  };

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
    const { resp, body } = await fetchWithTimeout("https://api.ip.sb/geoip");

    if (resp.status !== 200) return showError(`HTTP 错误：${resp.status}`);

    const {
      ip           = "Unknown",
      country      = "",
      country_code = "",
      city         = "",
      organization = "",
      asn          = "",
    } = JSON.parse(body);

    const isp      = organization || "";
    const emoji    = flag(country_code);
    const now      = new Date();
    const time     = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    // 地理位置：城市 + 国家，前置国旗
    const parts    = [city, country].filter(Boolean).join(", ");
    const location = emoji ? `${emoji} ${parts}` : parts;

    const lines = [
      `🌐 ${ip}`,
      location,
      asn  ? `🔢 AS${asn}`  : null,
      isp  ? `🏢 ${isp}`    : null,
    ].filter(Boolean);

    $done({
      title:       `IP 信息 · ${time}`,
      content:     lines.join("\n"),
      icon,
      "icon-color": iconColor,
    });

  } catch (e) {
    showError(e.message || "未知错误");
  }
})();
