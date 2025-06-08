// ip-panel.js
// Query landing IP, geolocation, ISP, and display beautifully in Surge panel

async function getLandingDetail() {
  return new Promise((resolve) => {
    $httpClient.get('https://api.ip.sb/geoip', (err, resp, data) => {
      if (err) return resolve({ ip: '查询失败', country: '', region: '', city: '', country_code: '', isp: '', flag: {} });
      try {
        const obj = JSON.parse(data);
        resolve({
          ip: obj.ip || '-',
          country: obj.country || '',
          region: obj.region || '',
          city: obj.city || '',
          country_code: obj.country_code || '',
          isp: obj.connection && obj.connection.isp ? obj.connection.isp : (obj.org || obj.organization || ''),
          flag: obj.flag || {}
        });
      } catch {
        resolve({ ip: '查询失败', country: '', region: '', city: '', country_code: '', isp: '', flag: {} });
      }
    });
  });
}

function getFlagEmoji(flagObj, cc) {
  if (flagObj && flagObj.emoji) return flagObj.emoji;
  if (!cc || typeof cc !== 'string' || cc.length !== 2) return '';
  const codePoints = [...cc.toUpperCase()].map(c => 127397 + c.charCodeAt());
  return String.fromCodePoint(...codePoints);
}

function getTime() {
  const d = new Date();
  return d.toLocaleTimeString('zh-CN', { hour12: false });
}

function isSurgePanel() {
  return typeof $input !== 'undefined' && $input.purpose === 'panel';
}

(async () => {
  try {
    const landing = await getLandingDetail();
    const flag = getFlagEmoji(landing.flag, landing.country_code);
    const location = `${flag ? flag + ' ' : ''}${landing.country} ${landing.region} ${landing.city}`.trim();
    const content =
      `落地 IP: ${landing.ip}\n位置: ${location}\n运营商: ${landing.isp}`;
    $done({ content });
  } catch (e) {
    $done({ content: '查询失败' });
  }
})();
