/**
 * Smoke test: boots the real server and asserts the contact endpoint's guards.
 * Run with `npm test`. No SMTP needed — every case here is rejected before send.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const PORT = 3999;
const BASE = `http://127.0.0.1:${PORT}`;

const server = spawn(process.execPath, ['server.js'], {
  env: { ...process.env, PORT: String(PORT), SERVER_PORT: '', NODE_ENV: 'production', SITE_URL: 'https://www.example.test' },
  stdio: ['ignore', 'ignore', 'inherit']
});

const post = (body, headers = {}) =>
  fetch(`${BASE}/api/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });

const valid = {
  nome: 'Mario', cognome: 'Rossi', email: 'mario@example.com',
  servizio: 'Linea vita', privacy: true
};

try {
  // wait for boot
  for (let i = 0; ; i++) {
    try {
      await fetch(`${BASE}/api/health`);
      break;
    } catch {
      assert.ok(i < 50, 'server did not start');
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  const csp = (await fetch(BASE)).headers.get('content-security-policy');
  assert.match(csp, /script-src 'self' 'sha256-/, 'inline script hashes missing from CSP');
  assert.doesNotMatch(csp, /instagram|fbcdn|unsafe-inline'[^;]*script/, 'third-party sources back in CSP');
  // over plain HTTP this directive would upgrade every asset to https:// and break the page
  assert.doesNotMatch(csp, /upgrade-insecure-requests/, 'upgrade-insecure-requests sent over plain HTTP');
  const secureCsp = (await fetch(BASE, { headers: { 'X-Forwarded-Proto': 'https' } }))
    .headers.get('content-security-policy');
  assert.match(secureCsp, /upgrade-insecure-requests/, 'upgrade-insecure-requests missing behind TLS');

  assert.equal((await post(valid, { Origin: 'https://evil.test' })).status, 403, 'cross-origin not blocked');
  assert.equal((await post({ ...valid, servizio: 'Piscine' })).status, 400, 'service allow-list not enforced');
  assert.equal((await post({ ...valid, privacy: false })).status, 400, 'privacy consent not enforced');
  assert.equal((await post({ ...valid, email: 'nope' })).status, 400, 'email validation not enforced');

  // honeypot answers 200 without sending, so it must not need SMTP
  assert.equal((await post({ ...valid, website: 'spam' })).status, 200, 'honeypot changed');

  console.log('ok — all guards hold');
} finally {
  server.kill();
}
