// 兼容 Surge 面板 webhook 调用，主动请求 IP 信息
async function main(ctx) {
  const url = ctx?.request?.url || ctx?.argument?.url || 'https://ip-api.com/json';
  const response = await ctx.http.get(url);
  const data = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
  return `落地 IP: ${data.query}\n位置: :flag_${data.countryCode.toLowerCase()}: ${data.country} ${data.regionName} ${data.city}\n运营商: ${data.org}`;
}

main(ctx);
