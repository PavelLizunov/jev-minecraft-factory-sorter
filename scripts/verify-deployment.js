import https from 'node:https';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = process.env.TEST_URL || 'https://jev.ninitux.com';
const evidence = { url: base, verifiedAt: new Date().toISOString(), checks: [] };
const ok = name => { evidence.checks.push(name); console.log('PASS', name); };
for (const route of ['/', '/api/health', '/api/blocks', '/data/blocks.json', '/textures/modded/create_mechanical_press.png']) {
  const response = await fetch(base + route);
  assert.equal(response.status, 200, `Anonymous ${route}`);
  assert.equal(response.headers.has('www-authenticate'), false);
  ok(`Anonymous ${route} accessible without password`);
}
const invalid = await fetch(base + '/api/classify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
assert.equal(invalid.status, 400); ok('Anonymous API reaches input validation without paid call');
const response = await fetch(base + '/api/health');
assert.equal(response.status, 200);
const healthData = await response.json();
assert.equal(healthData.status, 'ok');
assert.equal(healthData.apiKeyPresent, true);
assert.ok(healthData.blocksCount >= 700, `Expected at least 700 blocks, got ${healthData.blocksCount}`);
ok('Anonymous application health and complete catalog (700+ blocks & mobs)');
const redirected = await fetch(base.replace('https:', 'http:'), { redirect: 'manual' });
assert.ok([301, 302, 307, 308].includes(redirected.status));
assert.equal(new URL(redirected.headers.get('location')).protocol, 'https:');
ok('HTTP redirects to HTTPS');
evidence.certificate = await new Promise((resolve, reject) => {
  const request = https.get(base, res => {
    const certificate = res.socket.getPeerCertificate();
    assert.equal(res.socket.authorized, true);
    resolve({ subject: certificate.subject, issuer: certificate.issuer, validFrom: certificate.valid_from, validTo: certificate.valid_to, fingerprint256: certificate.fingerprint256 });
    res.resume();
  }); request.on('error', reject);
});
ok('Public TLS certificate validates without insecure overrides');
const main = await fetch('https://ninitux.com/'); assert.equal(main.status, 200); ok('Existing main website remains healthy');
await fs.mkdir('artifacts/public-deployment', { recursive: true });
await fs.writeFile('artifacts/public-deployment/https-auth-report.json', JSON.stringify(evidence, null, 2));
