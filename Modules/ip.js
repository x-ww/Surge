(async () => {
  // 数据链路(最小化):
  //   ip.sb api-ipv4/api-ipv6 -> 各栈地址 + 位置 + ASN/ISP(geoip 自带,不再逐地址二次查询)
  //   HackMyIP /api/score     -> 只给"当前调用者"打质量分/类型,按 IP 匹配后才归属,绝不张冠李戴
  //   AbuseIPDB(可选)         -> 各栈信誉分,需要模块参数 abuseipdb_key
  // 任一栈失败不拖累另一栈;全失败回退上次缓存并标 alert。
  const CACHE_KEY = "x-ww.ip-panel.last";
  const LEGACY_CACHE_KEY = "ip-panel-last";

  const decode = (value) => {
    try { return decodeURIComponent(value); } catch (_) { return value; }
  };

  const args = Object.fromEntries(
    ($argument || "").split("&").filter(Boolean).map(s => {
      const i = s.indexOf("=");
      if (i < 0) return [s, ""];
      return [s.slice(0, i), decode(s.slice(i + 1))];
    })
  );

  // style 一旦给出,icon / icon-color 会被忽略,所以成功态不传 style
  const done = (title, content, style) => $done({
    title,
    content,
    ...(style ? { style } : {}),
    ...(args.icon ? { icon: args.icon, "icon-color": args["icon-color"] || "#5B7FA6" } : {}),
  });

  const fetchWithTimeout = (url, timeout = 8000, headers) =>
    new Promise((resolve, reject) => {
      $httpClient.get({ url, timeout: timeout / 1000, ...(headers ? { headers } : {}) }, (err, resp, body) => {
        if (err) return reject(new Error(err));
        if (!resp) return reject(new Error("无响应"));
        resolve({ resp, body });
      });
    });

  const fetchJson = async (url, headers) => {
    const { resp, body } = await fetchWithTimeout(url, 8000, headers);
    if (resp.status !== 200) return null;
    try { return JSON.parse(body); } catch (_) { return null; }
  };

  const fetchGeo = async (url) => {
    const r = await fetchJson(url);
    if (!r || !r.ip) return null;
    return {
      ip:      r.ip,
      city:    r.city || "",
      country: r.country || r.country_code || "",
      asn:     r.asn || "",
      isp:     r.isp || r.organization || "",
    };
  };

  const fetchQuality = async () => {
    const r = await fetchJson("https://hackmyip.com/api/score");
    const p = r && r.success && r.data && r.data.privacy;
    if (!p || !r.data.ip) return null;
    return {
      ip:          r.data.ip,
      score:       typeof p.score === "number" ? p.score : "",
      grade:       p.grade || "",
      type:        p.type || "",
      vpn:         p.is_vpn === true,
      proxy:       p.proxy === true,
      datacenter:  p.is_datacenter === true || p.hosting === true,
      mobile:      p.mobile === true,
      residential: p.is_residential === true,
    };
  };

  // abuseConfidenceScore 越高越脏,反转为 0-100 的信誉分
  const fetchAbuse = async (ip) => {
    if (!ip || !args.abuseipdb_key) return null;
    const r = await fetchJson(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`,
      { Accept: "application/json", Key: args.abuseipdb_key }
    );
    const data = r && r.data;
    if (!data || typeof data.abuseConfidenceScore !== "number") return null;
    return { abuse: data.abuseConfidenceScore, reports: data.totalReports || 0 };
  };

  const locationInfo = (geo) => [geo.city, geo.country]
    .filter(Boolean)
    .filter((part, index, parts) => index === 0 || part.toLowerCase() !== parts[index - 1].toLowerCase())
    .join(", ");

  const networkInfo = (geo) => [geo.asn ? `AS${geo.asn}` : null, geo.isp].filter(Boolean).join(" · ");

  // 质量 + 类型 + 信誉合成一行;缺的段直接不出现
  const statusText = (geo) => {
    const q = geo.quality || geo.privacy; // 兼容旧缓存里的 privacy
    const parts = [];
    if (q && q.score !== "") parts.push(`质量 ${q.score}${q.grade ? `/${q.grade}` : ""}`);
    if (q) {
      const type = q.type ? ({ datacenter: "数据中心", residential: "住宅", vpn: "VPN" }[q.type] || q.type) : null;
      const flags = [...new Set([
        type,
        q.vpn ? "VPN" : null,
        q.proxy ? "代理" : null,
        q.datacenter ? "数据中心" : null,
        q.mobile ? "移动网络" : null,
        q.residential ? "住宅" : null,
      ].filter(Boolean))].join(" · ");
      if (flags) parts.push(flags);
    }
    if (geo.reputation) parts.push(`信誉 ${100 - geo.reputation.abuse}${geo.reputation.reports ? `（举报 ${geo.reputation.reports}）` : ""}`);
    return parts.join(" · ");
  };

  const render = (ips, geo4, geo6) => {
    const families = [
      { label: "IPv4", short: "v4", ip: ips.ipv4, geo: geo4 },
      { label: "IPv6", short: "v6", ip: ips.ipv6, geo: geo6 },
    ].filter(item => item.ip && item.geo);
    if (!families.length) return "";

    // 各栈相同就一行;有差异才每栈各占一行(v4/v6 前缀)
    const merge = (values) => {
      const shown = values.filter(Boolean);
      if (!shown.length) return [];
      const uniform = shown.length === values.length && shown.every(value => value === shown[0]);
      if (uniform) return [shown[0]];
      return values.map((value, index) => (value ? `${families[index].short} ${value}` : null)).filter(Boolean);
    };

    // 标题已经是主 IP,正文只列另一栈
    const primaryLabel = ips.ipv4 ? "IPv4" : "IPv6";
    const lines = families.filter(item => item.label !== primaryLabel).map(item => `${item.label}: ${item.ip}`);

    [locationInfo, networkInfo, statusText].forEach((field) => {
      merge(families.map(item => field(item.geo))).forEach(line => lines.push(line));
    });
    return lines.join("\n");
  };

  const cachedData = (cached) => ({
    ips: cached.ips || { ipv4: cached.geo && cached.geo.ip || "", ipv6: "" },
    geo4: cached.geo4 || cached.geo || null,
    geo6: cached.geo6 || null,
  });

  const primaryIp = (ips) => ips.ipv4 || ips.ipv6 || "Unknown";

  const stamp = (ts) => {
    const d = new Date(ts);
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  const staleFallback = (reason) => {
    let cached = null;
    try {
      const raw = $persistentStore.read(CACHE_KEY) || $persistentStore.read(LEGACY_CACHE_KEY) || "null";
      cached = JSON.parse(raw);
    } catch (_) {}
    if (cached && cached.at && (cached.geo4 || cached.geo6 || cached.geo)) {
      const data = cachedData(cached);
      return done(primaryIp(data.ips), `${render(data.ips, data.geo4, data.geo6)}\n更新于 ${stamp(cached.at)}`, "alert");
    }
    // ponytail: 首次运行且请求失败时无值可回落,只能裸报错
    return done("查询失败", reason, "error");
  };

  try {
    const [geo4, geo6, quality] = await Promise.all([
      fetchGeo("https://api-ipv4.ip.sb/geoip").catch(() => null),
      fetchGeo("https://api-ipv6.ip.sb/geoip").catch(() => null),
      fetchQuality().catch(() => null),
    ]);
    if (!geo4 && !geo6) return staleFallback("IPv4/IPv6 查询失败");

    // /api/score 只评当前调用出口;IP 对得上谁就归谁
    if (quality) {
      if (geo4 && geo4.ip === quality.ip) geo4.quality = quality;
      if (geo6 && geo6.ip === quality.ip) geo6.quality = quality;
    }
    const [rep4, rep6] = await Promise.all([
      fetchAbuse(geo4 && geo4.ip).catch(() => null),
      fetchAbuse(geo6 && geo6.ip).catch(() => null),
    ]);
    if (geo4 && rep4) geo4.reputation = rep4;
    if (geo6 && rep6) geo6.reputation = rep6;

    const ips = { ipv4: geo4 ? geo4.ip : "", ipv6: geo6 ? geo6.ip : "" };
    $persistentStore.write(JSON.stringify({ ips, geo4, geo6, at: Date.now() }), CACHE_KEY);
    done(primaryIp(ips), render(ips, geo4, geo6));

  } catch (e) {
    staleFallback(e.message || "未知错误");
  }
})();
