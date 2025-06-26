/**
==
 * @description 查询当前设备的公网 IP 地址、地理位置、ISP 等信息，并以美化格式显示在面板上。
 * @author Gemini
 * @version 2.0.0
 * @license MIT
 * 
 * @usage
 * [Panel]
 * IP信息 = script-name=ip-check,update-interval=600
 * 
 * [Script]
 * ip-check = type=generic,timeout=10,script-path=https://path/to/your/ip.js,argument="icon=globe.asia.australia&icon-color=#6699FF"
 * 
 */

// 立即执行的异步函数
;(async () => {
  // 使用 $httpClient 发起 GET 请求到 IP 查询 API
  $httpClient.get('https://api.ip.sb/geoip', (error, response, body) => {
  if (error || response.status !== 200) {
    $done({
      title: "❌ IP 查询失败",
      content: `无法连接到服务器: ${error || `HTTP ${response.status}`}`,
      icon: 'wifi.exclamationmark',
      'icon-color': '#FF3B30'
    });
    return;
  }

  try {
    const data = JSON.parse(body);
    const ip = data.ip || "未知";
    const country = data.country || "未知";
    const region = data.region || "";
    const city = data.city || "未知";
    const isp = data.isp || data.organization || data.org || "未知";
    const asn = data.asn ? `AS${data.asn}` : "";
    const countryCode = data.country_code;

    const getFlagEmoji = (code) => {
      if (!code) return '🌍';
      const codePoints = code.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    };
    const flag = getFlagEmoji(countryCode);

    const location = [country, region, city].filter(Boolean).join(' ').replace(/ +/g, ' ').trim();

    let contentLines = [];
    contentLines.push(`🌐 IP: ${ip}`);
    contentLines.push(`📍 位置: ${flag} ${location}`);
    if (isp) contentLines.push(`🏢 ISP: ${isp}`);
    if (asn) contentLines.push(`🆔 ASN: ${asn}`);

    const icon = ($argument && $argument.icon) || 'globe.asia.australia';
    const iconColor = ($argument && $argument['icon-color']) || '#6699FF';

    $done({
      title: `📍 ${city || region || country}`,
      content: contentLines.join("\n"),
      icon: icon,
      'icon-color': iconColor
    });

  } catch (e) {
    $done({
      title: "❌ 数据解析失败",
      content: `返回的数据格式不正确: ${e.message}`,
      icon: 'xmark.circle',
      'icon-color': '#FF9500'
    });
  }
  });
})();