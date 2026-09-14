const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'Modules', 'ip.js'), 'utf8');
const v4 = { ip: '203.0.113.42', city: 'Tokyo', country: 'Japan', asn: 64500, isp: 'Example ISP' };
const v6 = { ip: '2001:db8::42', city: 'Singapore', country: 'Singapore', asn: 64501, isp: 'Other ISP' };
const v6SamePlace = { ...v6, city: v4.city, country: v4.country };
// HackMyIP /api/score scores the caller only; quality is attributed by exact ip match.
const quality = (ip) => ({ ip, type: 'vpn', score: 82, grade: 'B', is_vpn: true, proxy: false, hosting: false, is_datacenter: false, mobile: false });

function run({ ipv4 = v4, ipv6 = v6, argument = '', cache = null, scoreFor = null } = {}) {
  const store = {};
  if (cache) store['x-ww.ip-panel.last'] = JSON.stringify(cache);
  let resolveResult;
  const result = new Promise(resolve => { resolveResult = resolve; });
  const context = {
    $argument: argument,
    $persistentStore: {
      read: key => store[key] || null,
      write: (value, key) => { store[key] = value; },
    },
    $httpClient: {
      get: ({ url }, callback) => setTimeout(() => {
        if (url.includes('api.abuseipdb.com')) {
          const data = url.includes('2001') || (ipv6 && url.includes(encodeURIComponent(ipv6.ip))) ? ipv6 : ipv4;
          if (!data) return callback(new Error('offline'));
          const dirty = url.includes(encodeURIComponent(v6.ip)) ? 0 : 16;
          return callback(null, { status: 200 }, JSON.stringify({ data: {
            abuseConfidenceScore: dirty,
            totalReports: dirty ? 12 : 0,
          } }));
        }
        if (url.includes('hackmyip.com')) {
          const caller = scoreFor || ipv6; // /api/score answers for the current caller
          if (!caller) return callback(new Error('offline'));
          return callback(null, { status: 200 }, JSON.stringify({ success: true, data: {
            ip: caller.ip, privacy: quality(caller.ip),
          }}));
        }
        const isV6 = url.includes('ipv6');
        const data = isV6 ? ipv6 : ipv4;
        if (!data) return callback(new Error('offline'));
        callback(null, { status: 200 }, JSON.stringify({
          ip: data.ip, city: data.city, country: data.country, asn: data.asn, isp: data.isp,
        }));
      }, 0),
    },
    $done: resolveResult,
    setTimeout,
    Promise,
    JSON,
    Date,
    Error,
    decodeURIComponent,
    Object,
    console: { log() {}, warn() {}, error() {} },
  };
  vm.runInNewContext(source, context);
  let timer;
  const guard = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('test timeout')), 2000);
  });
  return Promise.race([result, guard]).finally(() => clearTimeout(timer));
}

(async () => {
  // dual stack; score is attributed to the caller only (v6 here)
  let output = await run();
  assert.strictEqual(output.title, v4.ip);
  assert(output.content.includes(`IPv6: ${v6.ip}`));
  assert(!output.content.includes(`IPv4: ${v4.ip}`));
  assert(output.content.includes('v4 Tokyo, Japan'), 'differing locations on own line');
  assert(output.content.includes('v6 Singapore'), 'differing locations on own line');
  assert(output.content.includes('v4 AS64500 · Example ISP'));
  assert(output.content.includes('v6 AS64501 · Other ISP'));
  // 82/B belongs to v6 (the caller); v4 must not borrow it
  assert(output.content.includes('v4 代理') === false);
  assert(output.content.includes('v6 质量 82/B · VPN'), 'score attached to caller only');
  assert(!output.content.includes('v4 质量'), 'non-caller stack must not receive the score');

  // score lands on v4 when v4 is the caller
  output = await run({ scoreFor: v4 });
  assert(output.content.includes('v4 质量 82/B · VPN'), 'v4 caller gets score');
  assert(!output.content.includes('v6 质量'), 'v6 must not borrow v4 score');

  // no AbuseIPDB key -> no reputation
  output = await run();
  assert(!output.content.includes('信誉'), 'reputation must be absent without a key');

  // key present -> both stacks scored per address
  output = await run({ argument: 'abuseipdb_key=test-key' });
  assert(output.content.includes('v4 质量 82/B · VPN · 信誉 84（举报 12）') || output.content.includes('信誉 84（举报 12）'), 'v4 reputation missing');
  assert(output.content.includes('v6') && output.content.includes('信誉 100'), 'v6 reputation missing');

  // IPv4 only
  output = await run({ ipv6: null, scoreFor: v4 });
  assert.strictEqual(output.title, v4.ip);
  assert(!output.content.includes('IPv6:'));
  assert(!output.content.includes('v4 '), 'single-stack output must not be prefixed');
  assert(output.content.includes('质量 82/B · VPN'));

  // identical stacks merge onto shared lines (location & network collapse; status may differ
  // because only the scored caller has quality)
  output = await run({ ipv6: v6SamePlace, scoreFor: v4 });
  assert(!output.content.includes('v4 Tokyo'), 'equal locations must collapse without prefixes');
  assert(output.content.includes('Tokyo, Japan'));
  assert(output.content.includes('v4 质量 82/B · VPN'), 'differing status stays prefixed');

  // bad argument encoding must not crash
  output = await run({ argument: '%E0%A4%A' });
  assert.strictEqual(output.title, v4.ip);

  // total failure falls back to cache with alert style
  output = await run({
    ipv4: null,
    ipv6: null,
    cache: { ips: { ipv4: v4.ip, ipv6: v6.ip }, geo4: v4, geo6: v6, at: Date.now() },
  });
  assert.strictEqual(output.title, v4.ip);
  assert(output.content.includes(`IPv6: ${v6.ip}`));
  assert.strictEqual(output.style, 'alert');

  console.log('ip.js self-check: PASS');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
