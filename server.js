import express from 'express';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

/** Pelican/panel values may include wrapping quotes or stray spaces */
function env(name, fallback = '') {
  const raw = process.env[name];
  if (raw == null) return fallback;
  let v = String(raw).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v || fallback;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');

const app = express();
app.disable('x-powered-by');

/**
 * How many reverse-proxy hops sit in front of this process.
 *   1 → behind exactly one proxy (nginx, Traefik, Cloudflare): req.ip is the
 *       address that proxy appended to X-Forwarded-For, which a client cannot forge.
 *   0 → the app is exposed directly: ignore X-Forwarded-For entirely and use the
 *       socket address, otherwise anyone could rotate the header to dodge limits.
 * Getting this wrong in the "too trusting" direction re-opens the rate-limit bypass,
 * so it is explicit rather than assumed.
 */
const TRUST_PROXY = Number(env('TRUST_PROXY', '1'));
app.set('trust proxy', Number.isFinite(TRUST_PROXY) ? TRUST_PROXY : 1);

app.use(express.json({ limit: '64kb' }));

/**
 * The pages carry two kinds of inline <script>: the anti-FOUC theme switch and
 * the JSON-LD block. Rather than weakening the policy with 'unsafe-inline', hash
 * every inline script found in public/*.html at boot and allow exactly those.
 * Editing the HTML therefore can never silently break the CSP.
 */
function inlineScriptHashes() {
  const hashes = new Set();
  let files = [];
  try {
    files = fs.readdirSync(PUBLIC_DIR).filter((f) => f.endsWith('.html'));
  } catch {
    return hashes;
  }
  for (const file of files) {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, file), 'utf8');
    for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)) {
      hashes.add(`'sha256-${crypto.createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
    }
  }
  return hashes;
}

const scriptHashes = [...inlineScriptHashes()];

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  `script-src 'self' ${scriptHashes.join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  // Social embeds, loaded only after consent (public/script.js).
  'frame-src https://www.instagram.com https://www.facebook.com',
  "connect-src 'self'"
];

/**
 * `upgrade-insecure-requests` only makes sense once TLS is actually available.
 * Sent on a plain-HTTP response it rewrites every stylesheet/image/font request
 * to https:// against a server that does not speak it, so the page renders
 * unstyled — which is what happens when you hit the container by IP:port
 * instead of going through the proxy. req.secure honours X-Forwarded-Proto.
 */
const CSP_SECURE = [...CSP_DIRECTIVES, 'upgrade-insecure-requests'].join('; ');
const CSP_PLAIN = CSP_DIRECTIVES.join('; ');

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', req.secure ? CSP_SECURE : CSP_PLAIN);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), interest-cohort=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  // Only meaningful over TLS; harmless (and ignored) on plain HTTP.
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

/**
 * Static assets live in ./public — the repo root is NOT served, so server.js,
 * package.json, README.md and pelican/egg-*.json stay private.
 */
app.use(
  express.static(PUBLIC_DIR, {
    extensions: ['html'],
    dotfiles: 'ignore',
    setHeaders(res, filePath) {
      if (/[\\/](fonts|img)[\\/]/.test(filePath) || /\.(woff2|webp|png|jpe?g|ico|svg)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (/\.(css|js)$/i.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=86400, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      }
    }
  })
);

/** Liveness probe for the panel/proxy; SMTP status goes to the boot log instead. */
app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ── validation ────────────────────────────────────────────────────────────────

/** Strip CR/LF so user input can never inject extra mail headers. */
function oneLine(value, maxLen) {
  if (typeof value !== 'string') return null;
  const v = value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, maxLen);
  return v || null;
}

/**
 * Display name for Reply-To. Nodemailer already quotes/encodes it safely, but
 * dropping address-special characters keeps the header readable instead of
 * turning junk input into a mangled quoted string.
 */
function displayName(value) {
  return value.replace(/["<>:;,@\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const e = email.trim();
  if (e.length < 6 || e.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

/** Must stay in sync with the <select> in public/index.html */
const SERVIZI = [
  'Rifacimento coperture industriali e civili',
  'Linea vita',
  'Parapetti permanenti',
  'Scale marinare',
  'Montaggio e lavaggio fotovoltaico',
  'Manutenzione e pulizia tetto',
  'Smaltimento amianto',
  'Altro'
];

/** Accepts +39 388 784 1511, 3887841511, 0059 123456 … */
function normalizePhone(value) {
  if (typeof value !== 'string') return null;
  const v = value.replace(/[^\d+]/g, '');
  if (v.length < 8 || v.length > 16) return null;
  return v;
}

// ── SMTP ──────────────────────────────────────────────────────────────────────

let cachedTransporter = null;

function buildMailFrom() {
  const user = env('SMTP_USER');
  return env('SMTP_FROM') || (user ? `Preventivo <${user}>` : null);
}

function smtpConfigSummary() {
  return {
    contactTo: Boolean(env('CONTACT_TO')),
    host: env('SMTP_HOST') || null,
    port: env('SMTP_PORT') || '587',
    secure: env('SMTP_SECURE') || '(auto)',
    user: env('SMTP_USER') ? 'set' : 'missing',
    pass: env('SMTP_PASS') ? 'set' : 'missing'
  };
}

function smtpSecureForPort(port) {
  const secureEnv = env('SMTP_SECURE');
  if (secureEnv.length > 0) return secureEnv.toLowerCase() === 'true' || secureEnv === '1';
  return port === 465;
}

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = env('SMTP_HOST');
  const user = env('SMTP_USER');
  const pass = env('SMTP_PASS');
  if (!host || !user || !pass) return null;

  const port = Number(env('SMTP_PORT', '587'));
  const secure = smtpSecureForPort(port);
  const debug = env('SMTP_DEBUG') === '1';

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    pool: true,
    maxConnections: 2,
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
    tls: { minVersion: 'TLSv1.2' },
    ...(secure ? {} : { requireTLS: true }),
    ...(debug ? { logger: true, debug: true } : {})
  });
  return cachedTransporter;
}

/** Boot-time SMTP check: the log says whether the form can send, and why not. */
async function logSmtpStatus() {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn('[smtp] not configured:', smtpConfigSummary());
    console.warn('[smtp] in Pelican: Server → Variables → SMTP_HOST, SMTP_USER, SMTP_PASS, CONTACT_TO');
    return;
  }
  try {
    await transporter.verify();
    console.log('[smtp] ready —', buildMailFrom());
  } catch (e) {
    cachedTransporter?.close?.();
    cachedTransporter = null;
    console.error('[smtp] verify failed:', e?.message || e, e?.code ? `(${e.code})` : '');
    console.error('[smtp] config:', smtpConfigSummary());
  }
}

// ── rate limiting ─────────────────────────────────────────────────────────────

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = Number(env('RATE_MAX', '5'));
const rateMap = new Map();

// Drop stale buckets so a flood of unique IPs cannot grow the map without bound.
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS;
  for (const [ip, entry] of rateMap) if (entry.start < cutoff) rateMap.delete(ip);
}, RATE_WINDOW_MS).unref();

/**
 * Backstop: even if the per-IP key were ever defeated (misconfigured TRUST_PROXY,
 * a botnet with real distinct addresses), this caps how much mail the mailbox can
 * be made to send in an hour. Sized far above any plausible real demand.
 */
const GLOBAL_WINDOW_MS = 3_600_000;
const GLOBAL_MAX = Number(env('RATE_GLOBAL_MAX', '60'));
let globalWindowStart = Date.now();
let globalCount = 0;

function rateLimit(req, res, next) {
  const now = Date.now();

  if (now - globalWindowStart > GLOBAL_WINDOW_MS) {
    globalWindowStart = now;
    globalCount = 0;
  }
  if (globalCount >= GLOBAL_MAX) {
    console.warn('[contact] global hourly cap reached');
    res.setHeader('Retry-After', Math.ceil((globalWindowStart + GLOBAL_WINDOW_MS - now) / 1000));
    return res.status(429).json({ ok: false, error: 'rate_limited' });
  }

  // req.ip honours `trust proxy`, so a client-supplied X-Forwarded-For cannot
  // be used to rotate identities and bypass the limit.
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const entry = rateMap.get(ip) || { start: now, count: 0 };
  if (now - entry.start > RATE_WINDOW_MS) {
    entry.start = now;
    entry.count = 0;
  }
  entry.count += 1;
  rateMap.set(ip, entry);

  if (entry.count > RATE_MAX) {
    res.setHeader('Retry-After', Math.ceil((entry.start + RATE_WINDOW_MS - now) / 1000));
    return res.status(429).json({ ok: false, error: 'rate_limited' });
  }
  return next();
}

// ── contact endpoint ──────────────────────────────────────────────────────────

/**
 * Real cross-origin guard.
 *
 * The `cors` middleware alone is NOT enough: refusing an origin merely omits the
 * CORS headers, so the request still reaches the handler and the mail is still
 * sent — the browser only blocks the *response* from being read, which an abuser
 * does not care about. This rejects the request outright instead.
 *
 * The form posts from its own page, so only an Origin matching the Host it was
 * sent to is allowed. Requests without an Origin (curl, server-to-server) can't
 * be classified this way and are left to the rate limiter.
 */
function originGuard(req, res, next) {
  const origin = req.get('origin');
  if (!origin) return next();

  let host;
  try {
    host = new URL(origin).host;
  } catch {
    return res.status(403).json({ ok: false, error: 'forbidden_origin' });
  }

  if (host === req.get('host')) return next();

  console.warn('[contact] blocked cross-origin request from', origin);
  return res.status(403).json({ ok: false, error: 'forbidden_origin' });
}

app.post('/api/contact', originGuard, rateLimit, async (req, res) => {
  const body = req.body ?? {};

  // Honeypot: hidden field that only bots fill in. Answer 200 so they stop retrying.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    console.warn('[contact] honeypot hit from', req.ip);
    return res.json({ ok: true });
  }

  const nome = oneLine(body.nome, 80);
  const cognome = oneLine(body.cognome, 80);
  const email = oneLine(body.email, 160);
  const telefono = normalizePhone(body.telefono);
  const servizio = oneLine(body.servizio, 80);
  const messaggio =
    typeof body.messaggio === 'string' ? body.messaggio.trim().slice(0, 2000) : '';
  const source = oneLine(body.source, 120) || 'sito';

  if (!nome || !cognome || !email || !servizio) {
    return res.status(400).json({ ok: false, error: 'missing_fields' });
  }
  if (!isValidEmail(email)) return res.status(400).json({ ok: false, error: 'invalid_email' });
  if (body.telefono && !telefono) return res.status(400).json({ ok: false, error: 'invalid_phone' });
  if (!SERVIZI.includes(servizio)) return res.status(400).json({ ok: false, error: 'invalid_service' });
  if (body.privacy !== true) return res.status(400).json({ ok: false, error: 'privacy_required' });

  const to = env('CONTACT_TO');
  if (!to) {
    console.error('[contact] CONTACT_TO not set');
    return res.status(503).json({ ok: false, error: 'contact_not_configured' });
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.error('[contact] SMTP missing:', smtpConfigSummary());
    return res.status(503).json({ ok: false, error: 'smtp_not_configured' });
  }

  const from = buildMailFrom();
  if (!from) {
    console.error('[contact] SMTP_FROM / SMTP_USER not set');
    return res.status(503).json({ ok: false, error: 'sender_not_configured' });
  }

  const text = [
    `Nome: ${nome} ${cognome}`,
    `Email: ${email}`,
    telefono ? `Telefono: ${telefono}` : null,
    `Servizio: ${servizio}`,
    `Sorgente: ${source}`,
    `Ricevuto: ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}`,
    '',
    'Messaggio:',
    messaggio || '(nessun messaggio)',
    '',
    '— Consenso privacy prestato dall’utente al momento dell’invio.'
  ]
    .filter((line) => line !== null)
    .join('\n');

  try {
    const info = await transporter.sendMail({
      from,
      to,
      replyTo: `${displayName(`${nome} ${cognome}`)} <${email}>`,
      subject: `Richiesta preventivo — ${servizio}`,
      text
    });
    globalCount += 1; // only counted once delivery is accepted
    console.log('[contact] email sent', info?.messageId || '');
    return res.json({ ok: true });
  } catch (e) {
    cachedTransporter?.close?.();
    cachedTransporter = null;
    console.error('[contact] send failed:', e?.code || '', e?.message || e);
    return res.status(502).json({ ok: false, error: 'delivery_failed' });
  }
});

// ── fallbacks ─────────────────────────────────────────────────────────────────

app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ ok: false, error: 'not_found' });
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
});

app.use((err, _req, res, _next) => {
  console.error('[error]', err?.message || err);
  res.status(500).json({ ok: false, error: 'server_error' });
});

// Pelican Panel injects SERVER_PORT from the primary allocation; PORT for local/.env
const port = Number(process.env.SERVER_PORT || process.env.PORT || '3000');
const host = process.env.HOST || '0.0.0.0';

const server = app.listen(port, host, () => {
  console.log(`[Nuova Copertura] Listening on ${host}:${port}`);
  void logSmtpStatus();
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    console.log(`[Nuova Copertura] ${signal} — shutting down`);
    server.close(() => {
      cachedTransporter?.close?.();
      process.exit(0);
    });
  });
}
