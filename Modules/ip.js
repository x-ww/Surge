(async () => {
  const args = Object.fromEntries(
    ($argument || "").split("&").filter(Boolean).map(s => {
      const i = s.indexOf("=");
      return [s.slice(0, i), decodeURIComponent(s.slice(i + 1))];
    })
  );

  const icon      = args.icon || "";
  const iconColor = args["icon-color"] || "#6699FF";

  const showError = (msg) => $done({
    title:       "查询失败",
    content:     msg,
    icon,
    "icon-color": iconColor,
  });

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
      city         = "",
      organization = "",
      asn          = "",
    } = JSON.parse(body);

    const isp    = organization || "";
    const parts  = [city, country].filter(Boolean).join(", ");
    const asnIsp = [asn ? `AS${asn}` : null, isp || null].filter(Boolean).join(" · ");

    const lines = [parts, asnIsp].filter(Boolean);

    $done({
      title:       ip,
      content:     lines.join("\n"),
      icon,
      "icon-color": iconColor,
    });

  } catch (e) {
    showError(e.message || "未知错误");
  }
})();
