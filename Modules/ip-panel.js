// ip-panel.js
// 查询国内IP和国外IP并展示在Surge面板

async function getCNDetail() {
  return new Promise((resolve) => {
    $httpClient.get({
      url: 'https://myip.ipip.net',
      headers: { 'User-Agent': 'Surge' }
    }, (err, resp, data) => {
      if (err) return resolve({ ip: '查询失败', loc: '', isp: '' });
      // 例：当前 IP：49.77.188.64 来自于：中国 江苏省 南京市 电信
      const match = (data || '').match(/当前 IP：([\d.]+) 来自于：(.*?)(\s+)([\u4e00-\u9fa5]+)$/);
      if (match) {
        resolve({ ip: match[1], loc: match[2], isp: match[4] });
      } else {
        resolve({ ip: '查询失败', loc: '', isp: '' });
      }
    });
  });
}

async function getGlobalDetail() {
  return new Promise((resolve) => {
    $httpClient.get({
      url: 'http://ip-api.com/json/?lang=zh-CN',
      headers: { 'User-Agent': 'Surge' }
    }, (err, resp, data) => {
      if (err) return resolve({ ip: '查询失败', country: '', city: '', isp: '' });
      try {
        const obj = JSON.parse(data);
        resolve({
          ip: obj.query || '查询失败',
          country: obj.country || '',
          city: obj.city || '',
          isp: obj.isp || ''
        });
      } catch {
        resolve({ ip: '查询失败', country: '', city: '', isp: '' });
      }
    });
  });
}

function getTime() {
  const d = new Date();
  return d.toLocaleTimeString('zh-CN', { hour12: false });
}

(async () => {
  const cn = await getCNDetail();
  const global = await getGlobalDetail();
  $done({
    title: `代理策略: $network.policy` || 'IP信息',
    content:
      `IP: ${cn.ip}\n位置: 🇨🇳 ${cn.loc}\n运营商: ${cn.isp}\n\n落地 IP: ${global.ip}\n位置: ${global.country ? '🌏 ' + global.country : ''} ${global.city}\n运营商: ${global.isp}\n执行时间: ${getTime()}`
  });
})();
