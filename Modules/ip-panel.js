// ip-panel.js
// Query landing IP, geolocation, ISP, and display beautifully in Surge panel

async function getLandingDetail() {
  return new Promise((resolve) => {
    $httpClient.get({
      url: 'https://api.ip.sb/geoip',
      headers: { 'User-Agent': 'Surge' }
    }, (err, resp, data) => {
      if (err) return resolve({ ip: 'Query failed', country: '', city: '', isp: '' });
      try {
        const obj = JSON.parse(data);
        resolve({
          ip: obj.ip || '-',
          country: obj.country || '',
          city: obj.city || '',
          isp: obj.organization || obj.isp || obj.org || ''
        });
      } catch {
        resolve({ ip: 'Query failed', country: '', city: '', isp: '' });
      }
    });
  });
}

function getTime() {
  const d = new Date();
  return d.toLocaleTimeString('en-US', { hour12: false });
}

(async () => {
  const landing = await getLandingDetail();
  $done({
    title: '',
    content:
      `Landing IP: ${landing.ip}\nLocation: ${landing.country ? '🌏 ' + landing.country : ''} ${landing.city}\nISP: ${landing.isp}\nTime: ${getTime()}`
  });
})();
