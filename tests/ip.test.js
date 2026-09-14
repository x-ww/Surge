const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'Modules', 'ip.js'), 'utf8');
const v4 = { ip: '203.0.113.42', city: 'Tokyo', country: 'Japan', asn: 64500, isp: 'Example ISP' };
const v6 = { ip: '2001:db8::42', city: 'Singapore', country: 'Singapore', asn: 64501, isp: 'Other ISP' };
const v6SamePlace = { ...v6, city: v4.city, country: v4.country };
// Privacy-score payload is keyed by which stack (v4/v6) the request belongs to,
// independent of whatever ipv4/ipv6 override is passed into run().
const privacy4 = { score: 82, grade: 'B', label: 'Moderate', is_vpn: true, proxy: false, hosting: false, is_datacenter: false, mobile: false };
const privacy6 = { score: 82, grade: 'B', label: 'Moderate', is_vpn: true, proxy: false, hosting: false, is_datacenter: false, mobile: false };

function run({ ipv4 = v4, ipv6 = v6, argument = '', cache = null, scoreless = false } = {}) {
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
        const isV6 = url.includes('ipv6') || (ipv6 && url.includes(encodeURIComponent(ipv6.ip)));
        if (url.includes('api.abuseipdb.com')) {
          // AbuseIPDB is the only per-IP numeric score source (needs a key).
          const data = isV6 ? ipv6 : ipv4;
          if (!data) return callback(new Error('offline'));
          return callback(null, { status: 200 }, JSON.stringify({ data: {
            abuseConfidenceScore: isV6 ? 0 : 16,
            totalReports: isV6 ? 0 : 12,
          } }));
        }
        if (url.includes('hackmyip.com')) {
          // FIX: use the run()-scoped ipv4/ipv6 (which may be overridden or null),
          // not the outer fixed v4/v6 constants — otherwise overrides/null are ignored.
          const data = isV6 ? ipv6 : ipv4;
          if (!data) return callback(new Error('offline'));
          // /api/v1/ip and /api/score both return the full privacy block;
          // only the per-address lookup is missing score fields.
          const isCurrent = url.endsWith('/api/v1/ip') || url.includes('/api/score');
          const privacy = isV6 ? privacy6 : privacy4;
          return callback(null, { status: 200 }, JSON.stringify({ success: true, data: {
            ip: data.ip,
            location: { city: data.city, country_name: data.country },
            network: { asn: data.asn, isp: data.isp, org: data.isp },
            privacy: isCurrent && !scoreless ? privacy : { proxy: true, hosting: false, mobile: false },
          }}));
        }
        const data = isV6 ? ipv6 : ipv4;
        if (!data) return callback(new Error('offline'));
        callback(null, { status: 200 }, JSON.stringify({ ip: data.ip }));
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
    // FIX: vm.createContext doesn't inherit Node's console; without this,
    // any console.* call inside ip.js throws ReferenceError and the test hangs/fails.
    console: { log() {}, warn() {}, error() {} },
  };
  vm.runInNewContext(source, context);

  // FIX: clear the guard timer once settled so node doesn't keep a dangling
  // 2s timeout alive after the real result/timeout has already resolved.
  let timer;
  const guard = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('test timeout')), 2000);
  });
  return Promise.race([result, guard]).finally(() => clearTimeout(timer));
}

(async () => {
  let output = await run();
  assert.strictEqual(output.title, v4.ip);
  assert(output.content.includes(`IPv6: ${v6.ip}`));
  assert(!output.content.includes(`IPv4: ${v4.ip}`));
  // differing stacks are marked inline on one line, not repeated as two blocks
  assert(output.content.includes('v4 Tokyo, Japan · v6 Singapore'), 'differing locations inline');
  assert(!output.content.includes('Singapore, Singapore'), 'repeated city/region segment must be deduped');
  assert(output.content.includes('v4 AS64500 · Example ISP · v6 AS64501 · Other ISP'));
  // FIX: folded the old redundant `run({})` case in here — same defaults,
  // so it belongs with the first assertion block instead of a separate call.
  assert(output.content.includes('质量分 82/B'));
  assert(output.content.includes('类型 VPN'));
  assert.strictEqual((output.content.match(/质量分/g) || []).length, 1, 'shared quality line must appear once');

  // AbuseIPDB key present -> real per-stack reputation, differences marked v4/v6
  output = await run({ argument: 'abuseipdb_key=test-key' });
  assert(output.content.includes('质量分 82/B'), 'HackMyIP score lost when key set');
  assert(output.content.includes('信誉分 v4 84（举报 12） · v6 100'), 'per-stack reputation missing');

  // No key -> no reputation line at all
  output = await run();
  assert(!output.content.includes('信誉分'), 'reputation line must be absent without a key');

  // HackMyIP without a score must not print "未提供"
  output = await run({ scoreless: true });
  assert(!output.content.includes('未提供'), 'absent score must not render a placeholder');
  assert(!output.content.includes('质量分'), 'scoreless response must omit the score line');
  assert(output.content.includes('类型 代理'), 'flags should survive a missing score');

  output = await run({ ipv6: v6SamePlace });
  assert.strictEqual((output.content.match(/Tokyo, Japan/g) || []).length, 1);
  assert(!output.content.includes(`IPv4: ${v4.ip}`));
  assert(output.content.includes(`IPv6: ${v6SamePlace.ip}`));
  assert(output.content.includes('v4 AS64500 · Example ISP · v6 AS64501 · Other ISP'));

  output = await run({ ipv6: null });
  assert.strictEqual(output.title, v4.ip);
  assert(!output.content.includes('IPv6:'));
  // single stack: no v4/v6 prefix noise
  assert(!output.content.includes('v4 '), 'single-stack output must not be prefixed');

  output = await run({ argument: '%E0%A4%A' });
  assert.strictEqual(output.title, v4.ip);

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
