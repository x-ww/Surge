// ip-panel.js
// 仅显示落地 IP、地理位置（含国旗、国家、地区、城市）、运营商，使用 ip.sb API，兼容 Surge 面板

async function getLandingDetail() {
  return new Promise((resolve) => {
    $httpClient.get('https://api.ip.sb/geoip', (err, resp, data) => {
      if (err) return resolve({ ip: '查询失败', country: '', region: '', city: '', country_code: '', isp: '' });
      try {
        const obj = JSON.parse(data);
        resolve({
          ip: obj.ip || '-',
          country: obj.country || '',
          region: obj.region || obj.region_name || '',
          city: obj.city || '',
          country_code: obj.country_code || obj.countryCode || '',
          isp: obj.organization || obj.isp || obj.org || ''
        });
      } catch {
        resolve({ ip: '查询失败', country: '', region: '', city: '', country_code: '', isp: '' });
      }
    });
  });
}

function getFlagEmoji(cc) {
  if (!cc || typeof cc !== 'string' || cc.length !== 2) return '';
  const codePoints = [...cc.toUpperCase()].map(c => 127397 + c.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

function isSurgePanel() {
  return typeof $input !== 'undefined' && $input.purpose === 'panel';
}

(async () => {
  try {
    const landing = await getLandingDetail();
    const flag = getFlagEmoji(landing.country_code);
    const location = `${flag ? flag + ' ' : ''}${landing.country} ${landing.region} ${landing.city}`.trim();
    const now = new Date();
    const time = now.toLocaleTimeString('zh-CN', { hour12: false });
    const content =
      `落地 IP: ${landing.ip}\n位置: ${location}\n运营商: ${landing.isp}\n执行时间: ${time}`;
    $done({ content });
  } catch (e) {
    $done({ content: '查询失败' });
  }
})();
