// 兼容 Surge 面板 webhook 调用，主动请求 IP 信息
(async () => {
  const url = typeof $argument === 'object' && $argument.url ? $argument.url : 'https://ip-api.com/json';
  const response = await httpAPI(url);
  const data = typeof response === 'string' ? JSON.parse(response) : response;
  $done({
    title: 'IP 查询',
    content: `落地 IP: ${data.query}\n位置: :flag_${data.countryCode.toLowerCase()}: ${data.country} ${data.regionName} ${data.city}\n运营商: ${data.org}`
  });
})();

function httpAPI(url) {
  return new Promise((resolve, reject) => {
    $httpClient.get(url, (err, resp, body) => {
      if (err) return reject(err);
      resolve(body);
    });
  });
}
