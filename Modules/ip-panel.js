// ip-panel.js
// 完全参考 net-lsp-x.sgmodule 和 net-lsp-x.js 的结构，适配 Surge 面板，使用自有API

async function getDetail(type) {
  return new Promise((resolve) => {
    $httpClient.get({
      url: `https://net-lsp-x.com?type=${type}`,
      headers: { 'User-Agent': 'Surge' }
    }, (err, resp, data) => {
      if (err) return resolve({ ip: '查询失败', info: '', isp: '', country: '', city: '' });
      try {
        const obj = JSON.parse(data);
        resolve({
          ip: obj.ip || '-',
          info: obj.info || obj.loc || obj.location || '',
          isp: obj.isp || obj.org || '',
          country: obj.country || '',
          city: obj.city || ''
        });
      } catch {
        resolve({ ip: '查询失败', info: '', isp: '', country: '', city: '' });
      }
    });
  });
}

function getTime() {
  const d = new Date();
  return d.toLocaleTimeString('zh-CN', { hour12: false });
}

(async () => {
  const cn = await getDetail('cn');
  const global = await getDetail('global');
  let policy = '未知';
  if (typeof $network !== 'undefined' && $network.policy) {
    policy = $network.policy;
  } else if (typeof $surge !== 'undefined' && $surge.selectGroup) {
    policy = $surge.selectGroup;
  }
  $done({
    title: `代理策略: ${policy}`,
    content:
      `IP: ${cn.ip}\n位置: 🇨🇳 ${cn.info}\n运营商: ${cn.isp}\n\n落地 IP: ${global.ip}\n位置: ${global.country ? '🌏 ' + global.country : ''} ${global.city}\n运营商: ${global.isp}\n执行时间: ${getTime()}`
  });
})();
