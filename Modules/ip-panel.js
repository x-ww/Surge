// ip-panel.js
// 查询国内IP和国外IP并展示在Surge面板

async function getCNDetail() {
  return new Promise((resolve) => {
    $httpClient.get({
      url: 'https://net-lsp-x.com?type=cn',
      headers: { 'User-Agent': 'Surge' }
    }, (err, resp, data) => {
      if (err) return resolve({ ip: '查询失败', loc: '', isp: '' });
      try {
        const obj = JSON.parse(data);
        resolve({
          ip: obj.ip || '查询失败',
          loc: obj.loc || obj.location || '',
          isp: obj.isp || obj.org || ''
        });
      } catch {
        resolve({ ip: '查询失败', loc: '', isp: '' });
      }
    });
  });
}

async function getGlobalDetail() {
  return new Promise((resolve) => {
    $httpClient.get({
      url: 'https://net-lsp-x.com?type=global',
      headers: { 'User-Agent': 'Surge' }
    }, (err, resp, data) => {
      if (err) return resolve({ ip: '查询失败', country: '', city: '', isp: '' });
      try {
        const obj = JSON.parse(data);
        resolve({
          ip: obj.ip || '查询失败',
          country: obj.country || '',
          city: obj.city || '',
          isp: obj.isp || obj.org || ''
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
  // 兼容 Surge 5+ 面板变量
  const policy = typeof $network !== 'undefined' && $network.policy ? $network.policy : (typeof $surge !== 'undefined' && $surge.selectGroup ? $surge.selectGroup : '未知');
  $done({
    title: `代理策略: ${policy}`,
    content:
      `IP: ${cn.ip}\n位置: 🇨🇳 ${cn.loc}\n运营商: ${cn.isp}\n\n落地 IP: ${global.ip}\n位置: ${global.country ? '🌏 ' + global.country : ''} ${global.city}\n运营商: ${global.isp}\n执行时间: ${getTime()}`
  });
})();
