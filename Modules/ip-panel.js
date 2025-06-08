// ip-panel.js
// 查询国内IP和国外IP并展示在Surge面板

async function getIP(url) {
  return new Promise((resolve) => {
    $httpClient.get(url, (err, resp, data) => {
      if (err) return resolve('查询失败');
      resolve((data || '').trim());
    });
  });
}

(async () => {
  const cnIP = await getIP('http://ip.sb/ip');
  const globalIP = await getIP('https://ifconfig.me/ip');
  $done({
    title: '本机IP信息',
    content: `国内IP: ${cnIP}\n国外IP: ${globalIP}`
  });
})();
