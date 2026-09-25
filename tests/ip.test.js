const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'Modules', 'ip.js'), 'utf8');
const v4 = { ip: '203.0.113.42', city: 'Tokyo', country: 'Japan', asn: 64500, isp: 'Example ISP' };
const v6 = { ip: '2001:db8::42', city: 'Singapore', country: 'Singapore', asn: 64501, isp: 'Other ISP' };
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
          const dirty = url.includes(encodeURIComponent(v6.ip)) ? 0 : 16;
          return callback(null, { status: 200 }, JSON.stringify({ data: {
            abuseConfidenceScore: dirty,
            totalReports: dirty ? 12 : 0,
          } }));
        }
        if (url.includes('hackmyip.com')) {
          const caller = scoreFor; // /api/score answers for the current caller, if any
          if (!caller) return callback(new Error('offline'));
          return callback(null, { status: 200 }, JSON.stringify({ success: true, data: {
            ip: caller.ip, privacy: quality(caller.ip),
          }}));
        }
        const data = url.includes('ipv6') ? ipv6 : ipv4;
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

const lines = (out) => out.content.split('\n');

(async () => {
  // v6 is the caller -> it is the one stack shown, labels gone
  let output = await run({ scoreFor: v6 });
  assert.strictEqual(output.title, v6.ip);
  assert(!output.content.includes(v4.ip), 'the other stack must not appear anywhere');
  assert(!output.content.includes('v4 ') && !output.content.includes('v6 '), 'no stack prefixes');
  assert.deepStrictEqual(lines(output), ['Singapore', 'AS64501 · Other ISP', '质量 82/B · VPN'], 'exactly one stack rendered');
  assert.strictEqual(output.style, undefined, 'success must not pass style (keeps icon possible)');

  // score follows the caller even when IPv4 is the more obvious choice
  output = await run({ scoreFor: v6 });
  assert.strictEqual(output.title, v6.ip, 'scored caller wins over IPv4 preference');

  // v4 is the caller -> IPv4 shown, v6 never borrows the score
  output = await run({ scoreFor: v4 });
  assert.strictEqual(output.title, v4.ip);
  assert.deepStrictEqual(lines(output), ['Tokyo, Japan', 'AS64500 · Example ISP', '质量 82/B · VPN']);
  assert(!output.content.includes(v6.ip));

  // no score endpoint (blocked/offline) -> IPv4 is the default stack, no quality line
  output = await run();
  assert.strictEqual(output.title, v4.ip, 'no score available -> IPv4 preferred');
  assert.deepStrictEqual(lines(output), ['Tokyo, Japan', 'AS64500 · Example ISP'], 'no empty/placeholder line');

  // single-stack environments
  output = await run({ ipv6: null, scoreFor: v4 });
  assert.strictEqual(output.title, v4.ip);
  output = await run({ ipv4: null, scoreFor: v6 });
  assert.strictEqual(output.title, v6.ip);

  // no AbuseIPDB key -> no reputation line
  output = await run({ scoreFor: v4 });
  assert(!output.content.includes('信誉'), 'reputation must be absent without a key');

  // key present -> reputation for the shown address only
  output = await run({ argument: 'abuseipdb_key=test-key', scoreFor: v4 });
  assert(lines(output).some(l => l.includes('信誉 84(举报 12)')), 'v4 reputation missing');
  output = await run({ argument: 'abuseipdb_key=test-key', scoreFor: v6 });
  assert(lines(output).some(l => l.includes('信誉 100')), 'v6 reputation missing');
  assert(!output.content.includes('举报 12'), 'only the shown address is queried');

  // bad argument encoding must not crash
  output = await run({ argument: '%E0%A4%A', scoreFor: v4 });
  assert.strictEqual(output.title, v4.ip);

  // total failure falls back to the cached single stack with alert style
  output = await run({
    ipv4: null, ipv6: null,
    cache: { ip: v6.ip, geo: { ...v6, quality: quality(v6.ip) }, at: Date.now() },
  });
  assert.strictEqual(output.title, v6.ip);
  assert(output.content.includes('质量 82/B · VPN') && output.content.includes('更新于'));
  assert.strictEqual(output.style, 'alert');

  // a cache written by the previous dual-stack build still renders
  output = await run({
    ipv4: null, ipv6: null,
    cache: { geo4: v4, geo6: v6, at: Date.now() },
  });
  assert.strictEqual(output.title, v4.ip, 'old cache shape still usable');
  assert.strictEqual(output.style, 'alert');

  // first run + total failure -> bare error when nothing is cached
  output = await run({ ipv4: null, ipv6: null });
  assert.strictEqual(output.style, 'error');

  console.log('ip.js self-check: PASS');
})().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});