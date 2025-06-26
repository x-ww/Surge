/**
 * Surge/Quantumult X/Loon IP 查询脚本
 * 
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
    
    // 1. 处理网络请求错误
    // 如果有错误对象或 HTTP 状态码不是 200，则判断为请求失败
    if (error || response.status !== 200) {
      $done({
        title: "❌ IP 查询失败",
        content: `无法连接到服务器: ${error || `HTTP ${response.status}`}`,
        icon: 'wifi.exclamationmark',
        'icon-color': '#FF3B30' // 红色，表示错误
      });
      return; // 终止脚本
    }

    // 2. 解析返回的 JSON 数据
    try {
      const data = JSON.parse(body);

      // 提取所需信息，并提供默认值以防数据缺失
      const ip = data.ip || "未知";
      const country = data.country || "未知";
      const region = data.region || "";
      const city = data.city || "未知";
      const isp = data.isp || data.organization || data.org || "未知";
      const asn = data.asn ? `AS${data.asn}` : "";
      const countryCode = data.country_code;

      // 3. 美化输出内容
      
      // 将国家代码转换为国旗 emoji
      const getFlagEmoji = (code) => {
        if (!code) return '🌍'; // 默认地球 emoji
        // 使用 Unicode 码点转换
        const codePoints = code.toUpperCase().split('').map(char => 127397 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
      };
      const flag = getFlagEmoji(countryCode);

      // 拼接地理位置，过滤空值并整理空格
      const location = [country, region, city].filter(Boolean).join(' ').replace(/ +/g, ' ').trim();

      // 构建最终显示在面板上的内容行
      let contentLines = [];
      contentLines.push(`🌐 IP: ${ip}`);
      contentLines.push(`📍 位置: ${flag} ${location}`);
      if (isp) contentLines.push(`🏢 ISP: ${isp}`);
      if (asn) contentLines.push(`🆔 ASN: ${asn}`);
      
      // 4. 构建 $done 的返回对象
      
      // 尝试从脚本参数中获取图标和颜色，提供默认值
      // Surge 会将 argument 字符串解析为 $argument 对象
      const icon = ($argument && $argument.icon) || 'globe.asia.australia';
      const iconColor = ($argument && $argument['icon-color']) || '#6699FF';

      $done({
        title: `📍 ${city || region || country}`, // 使用最详细的地理位置作为标题
        content: contentLines.join("
"),
        icon: icon,
        'icon-color': iconColor
      });

    } catch (e) {
      // 5. 处理 JSON 解析错误
      $done({
        title: "❌ 数据解析失败",
        content: `返回的数据格式不正确: ${e.message}`,
        icon: 'xmark.circle',
        'icon-color': '#FF9500' // 橙色，表示警告
      });
    }
  });
})();