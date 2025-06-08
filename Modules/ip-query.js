module.exports = async (ctx) => {
  const data = ctx.body;
  return `落地 IP: ${data.query}\n位置: :flag_${data.countryCode.toLowerCase()}: ${data.country} ${data.regionName} ${data.city}\n运营商: ${data.org}`;
};
