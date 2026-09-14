(async () => {
  // 面板只有 4 个槽位:title / content / icon / icon-color,没有 CSS,不可点击。
  // 显示文本保持不变,设计预算全花在"文本不出丑"上:
  //   1. 空字段不产出残缺行(原版 city 为空时会渲染出 ", China")
  //   2. 失败不显示"查询失败"裸错误,回落到上次成功值并标注时间
  //   3. 失败态用原生 style=alert,深浅色由系统着色,对比度不会崩
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

  // style 一旦给出,icon / icon-color 会被忽略,所以成功态不传 style,
  // 保留原脚本自定义 icon 的能力。
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

  const fetchFamilyIp = async (familyUrl) => {
    const source = await fetchJson(familyUrl);
    return source && source.ip;
  };

  const normalizeInfo = (data, ip) => {
    if (!ip) return null;
    if (!data) return null;
    const location = data.location || {};
    const network = data.network || {};
    const privacy = data.privacy || {};
    return {
      ip:      data.ip || ip,
      city:    location.city || "",
      region:  location.region || "",
      country: location.country_name || location.country || "",
      asn:     network.asn || "",
      isp:     network.isp || network.org || "",
      org:     network.org || "",
      privacy: {
        score:       typeof privacy.score === "number" ? privacy.score : "",
        grade:       privacy.grade || "",
        label:       privacy.label || "",
        type:        privacy.type || "",
        vpn:         privacy.is_vpn === true || privacy.vpn === true,
        proxy:       privacy.proxy === true || privacy.is_proxy === true,
        tor:         privacy.tor === true || privacy.is_tor === true,
        datacenter:  privacy.is_datacenter === true || privacy.hosting === true,
        mobile:      privacy.mobile === true || privacy.is_mobile === true,
        residential: privacy.is_residential === true,
      },
    };
  };

  const fetchIpInfo = async (ip) => {
    if (!ip) return null;
    const result = await fetchJson(`https://hackmyip.com/api/v1/ip/${encodeURIComponent(ip)}`);
    return result && result.success ? normalizeInfo(result.data, ip) : null;
  };

  const fetchScore = async (ip) => {
    if (!ip) return null;
    const result = await fetchJson(`https://hackmyip.com/api/score?ip=${encodeURIComponent(ip)}`);
    return result && result.success ? normalizeInfo(result.data, result.data.ip) : null;
  };

  // HackMyIP /api/score 只评当前出口,无法查指定 IP;任意 IP 的数字分只能靠 AbuseIPDB。
  // abuseConfidenceScore: 0 干净, 100 高度滥用;免费额度 1000 次/天。key 只放本地模块 argument。
  const fetchAbuse = async (ip) => {
    if (!ip || !args.abuseipdb_key) return null;
    const result = await fetchJson(
      `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`,
      { Accept: "application/json", Key: args.abuseipdb_key }
    );
    const data = result && result.data;
    if (!data || typeof data.abuseConfidenceScore !== "number") return null;
    return { abuse: data.abuseConfidenceScore, reports: data.totalReports || 0 };
  };

  // 相邻同名段只留一个(Seoul, Seoul, South Korea -> Seoul, South Korea)
  const locationInfo = (geo) => [geo.city, geo.region, geo.country]
    .filter(Boolean)
    .filter((part, index, parts) => index === 0 || part.toLowerCase() !== parts[index - 1].toLowerCase())
    .join(", ");

  // 同一品牌的 isp/org 只留更具体的那个(Cloudflare, Inc. + Cloudflare WARP -> Cloudflare WARP)
  const brand = (name) => (name || "").split(/[,\s]/)[0].toLowerCase();
  const networkInfo = (geo) => {
    const names = [geo.isp, geo.org].filter(Boolean);
    const picked = names.length === 2 && brand(names[0]) === brand(names[1]) ? [names[1]] : names;
    return [geo.asn ? `AS${geo.asn}` : null, ...picked].filter(Boolean).join(" · ");
  };

  const flagText = (geo) => {
    const p = geo.privacy || {};
    const type = p.type ? ({ datacenter: "数据中心", residential: "住宅", vpn: "VPN" }[p.type] || p.type) : null;
    return [...new Set([
      type,
      p.vpn ? "VPN" : null,
      p.proxy ? "代理" : null,
      p.tor ? "Tor" : null,
      p.datacenter ? "数据中心" : null,
      p.mobile ? "移动网络" : null,
      p.residential ? "住宅" : null,
    ].filter(Boolean))].join(" · ");
  };

  // HackMyIP 的质量分;没有分数时整行省略,不写"未提供"
  const scoreText = (geo) => {
    const p = geo.privacy || {};
    return p.score === "" ? null : `${p.score}${p.grade ? `/${p.grade}` : ""}`;
  };

  // AbuseIPDB: abuseConfidenceScore 越高越脏,面板显示成 0-100 的信誉分
  const trustText = (geo) => {
    const r = geo.reputation;
    if (!r) return null;
    return `${100 - r.abuse}${r.reports ? `（举报 ${r.reports}）` : ""}`;
  };

  const render = (ips, geo4, geo6) => {
    const families = [
      { label: "IPv4", short: "v4", ip: ips.ipv4, geo: geo4 },
      { label: "IPv6", short: "v6", ip: ips.ipv6, geo: geo6 },
    ].filter(item => item.ip && item.geo);
    if (!families.length) return "";

    // 各栈取到相同值就只输出一次,有差异才内联标成 v4/v6;label 只写一次
    const merge = (values, label) => {
      const shown = values.filter(Boolean);
      if (!shown.length) return null;
      const head = label ? `${label} ` : "";
      const uniform = shown.length === values.length && shown.every(value => value === shown[0]);
      if (uniform) return head + shown[0];
      return head + values.map((value, index) => (value ? `${families[index].short} ${value}` : null)).filter(Boolean).join(" · ");
    };

    // 标题已经是主 IP,正文只列另一栈
    const primaryLabel = ips.ipv4 ? "IPv4" : "IPv6";
    const lines = families.filter(item => item.label !== primaryLabel).map(item => `${item.label}: ${item.ip}`);

    [
      { field: locationInfo },
      { field: networkInfo },
      { field: scoreText, label: "质量分" },
      { field: flagText, label: "类型" },
      { field: trustText, label: "信誉分" },
    ].forEach(({ field, label }) => {
      const line = merge(families.map(item => field(item.geo)), label);
      if (line) lines.push(line);
    });

    return lines.join("\n");
  };

  const cachedData = (cached) => ({
    ips: cached.ips || { ipv4: cached.geo && cached.geo.ip || "", ipv6: "" },
    geo4: cached.geo4 || cached.geo || null,
    geo6: cached.geo6 || null,
  });

  const primaryIp = (ips) => ips.ipv4 || ips.ipv6 || "Unknown";

  // 时间戳只用在失败路径
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
    const [ipv4Ip, ipv6Ip] = await Promise.all([
      fetchFamilyIp("https://api-ipv4.ip.sb/geoip").catch(() => null),
      fetchFamilyIp("https://api-ipv6.ip.sb/geoip").catch(() => null),
    ]);
    const [ipv4, ipv6, score4, score6, rep4, rep6] = await Promise.all([
      fetchIpInfo(ipv4Ip).catch(() => null),
      fetchIpInfo(ipv6Ip).catch(() => null),
      fetchScore(ipv4Ip).catch(() => null),
      fetchScore(ipv6Ip).catch(() => null),
      fetchAbuse(ipv4Ip).catch(() => null),
      fetchAbuse(ipv6Ip).catch(() => null),
    ]);
    if (!ipv4 && !ipv6) return staleFallback("IPv4/IPv6 查询失败");

    // /api/v1/ip/{address} lacks score fields; /api/score enriches each family
    const enrich = (info, score) => info && score && score.ip === info.ip
      ? { ...info, privacy: score.privacy }
      : info;
    const geo4 = enrich(ipv4, score4);
    const geo6 = enrich(ipv6, score6);
    if (geo4 && rep4) geo4.reputation = rep4;
    if (geo6 && rep6) geo6.reputation = rep6;

    const ips = { ipv4: geo4 ? geo4.ip : "", ipv6: geo6 ? geo6.ip : "" };
    $persistentStore.write(JSON.stringify({ ips, geo4, geo6, at: Date.now() }), CACHE_KEY);
    done(primaryIp(ips), render(ips, geo4, geo6));

  } catch (e) {
    staleFallback(e.message || "未知错误");
  }
})();
