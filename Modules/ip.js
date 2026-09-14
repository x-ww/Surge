(async () => {
  // 面板只有 4 个槽位:title / content / icon / icon-color,没有 CSS,不可点击。
  // 显示文本保持不变,设计预算全花在"文本不出丑"上:
  //   1. 空字段不产出残缺行(原版 city 为空时会渲染出 ", China")
  //   2. 失败不显示"查询失败"裸错误,回落到上次成功值并标注时间
  //   3. 失败态用原生 style=alert,深浅色由系统着色,对比度不会崩
  const CACHE_KEY = "ip-panel-last";

  const args = Object.fromEntries(
    ($argument || "").split("&").filter(Boolean).map(s => {
      const i = s.indexOf("=");
      if (i < 0) return [s, ""];
      return [s.slice(0, i), decodeURIComponent(s.slice(i + 1))];
    })
  );

  // style 一旦给出,icon / icon-color 会被忽略,所以成功态不传 style,
  // 保留原脚本自定义 icon 的能力。
  const done = (title, content, style) => $done({
    title,
    content,
    ...(style ? { style } : {}),
    ...(args.icon ? { icon: args.icon, "icon-color": args["icon-color"] || "#5B7FA6" } : {}),
  });

  const fetchWithTimeout = (url, timeout = 8000) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("请求超时")), timeout);
      $httpClient.get({ url, timeout: timeout / 1000 }, (err, resp, body) => {
        clearTimeout(timer);
        if (err) return reject(new Error(err));
        resolve({ resp, body });
      });
    });

  const fetchGeo = async (url) => {
    const { resp, body } = await fetchWithTimeout(url);
    if (resp.status !== 200) return null;
    const data = JSON.parse(body);
    if (!data.ip) return null;
    return {
      ip:      data.ip,
      city:    data.city || "",
      country: data.country || data.country_code || "",
      asn:     data.asn || "",
      isp:     data.isp || data.organization || "",
    };
  };

  // 只有两个字段都有才拼 "city, country";否则单出一个,避免残缺分隔符
  const joinCityCountry = (city, country) => [city, country].filter(Boolean).join(", ");

  const render = (ips, geo) => {
    const addresses = [
      ips.ipv4 ? `IPv4: ${ips.ipv4}` : null,
      ips.ipv6 ? `IPv6: ${ips.ipv6}` : null,
    ];
    const line1 = joinCityCountry(geo.city, geo.country);
    const line2 = [geo.asn ? `AS${geo.asn}` : null, geo.isp].filter(Boolean).join(" · ");
    return [...addresses, line1, line2].filter(Boolean).join("\n");
  };

  // 时间戳只用在失败路径
  const stamp = (ts) => {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  const staleFallback = (reason) => {
    let cached = null;
    try { cached = JSON.parse($persistentStore.read(CACHE_KEY) || "null"); } catch (_) {}
    if (cached && cached.geo && cached.at) {
      const ips = cached.ips || { ipv4: cached.geo.ip || "", ipv6: "" };
      return done("IP 信息", `${render(ips, cached.geo)}\n更新于 ${stamp(cached.at)}`, "alert");
    }
    // ponytail: 首次运行且请求失败时无值可回落,只能裸报错
    return done("查询失败", reason, "error");
  };

  try {
    const [ipv4, ipv6] = await Promise.all([
      fetchGeo("https://api-ipv4.ip.sb/geoip").catch(() => null),
      fetchGeo("https://api-ipv6.ip.sb/geoip").catch(() => null),
    ]);
    if (!ipv4 && !ipv6) return staleFallback("IPv4/IPv6 查询失败");

    const ips = { ipv4: ipv4 ? ipv4.ip : "", ipv6: ipv6 ? ipv6.ip : "" };
    const geo = ipv4 || ipv6;
    $persistentStore.write(JSON.stringify({ ips, geo, at: Date.now() }), CACHE_KEY);
    done("IP 信息", render(ips, geo));

  } catch (e) {
    staleFallback(e.message || "未知错误");
  }
})();
