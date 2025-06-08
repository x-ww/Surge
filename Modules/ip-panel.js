// ip-panel.js
// 查询国内IP和国外IP并展示在Surge面板

async function getCNIP() {
  return new Promise((resolve) => {
    $httpClient.get({
      url: 'http://ip.taobao.com/outGetIpInfo?ip=myip&accessKey=alibaba',
      headers: { 'User-Agent': 'Surge' }
    }, (err, resp, data) => {
      if (err) return resolve('查询失败');
      try {
        const obj = JSON.parse(data);
        resolve(obj && obj.data && obj.data.ip ? obj.data.ip : '查询失败');
      } catch {
        resolve('查询失败');
      }
    });
  });
}

async function getGlobalIP() {
  return new Promise((resolve) => {
    $httpClient.get({
      url: 'https://ifconfig.me/ip',
      headers: { 'User-Agent': 'curl/7.64.1' }
    }, (err, resp, data) => {
      if (err) return resolve('查询失败');
      const ip = (data || '').trim().match(/^((?:\d{1,3}\.){3}\d{1,3})$|^([a-fA-F0-9:]{2,})$/m);
      resolve(ip ? ip[0] : '查询失败');
    });
  });
}

(async () => {
  const cnIP = await getCNIP();
  const globalIP = await getGlobalIP();
  $done({
    title: '本机IP信息',
    content: `国内IP: ${cnIP}\n国外IP: ${globalIP}`
  });
})();
