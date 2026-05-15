import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

/** Pelican/panel values may include wrapping quotes or stray spaces */
function env(name) {
  const raw = process.env[name];
  if (raw == null) return '';
  let v = String(raw).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Pelican / reverse-proxy: use X-Forwarded-For for rate limiting
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json({ limit: '256kb' }));

// Security Headers
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Serve static files (HTML in root)
app.use(express.static(__dirname, { extensions: ['html'] }));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/health', async (_req, res) => {
  const smtp = await verifySmtp();
  res.json({
    ok: true,
    contactTo: env('CONTACT_TO') || null,
    smtp
  });
});

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const e = email.trim();
  if (e.length < 6 || e.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function requiredString(value, maxLen) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!v) return null;
  if (maxLen && v.length > maxLen) return null;
  return v;
}

let cachedTransporter = null;

function buildMailFrom() {
  const explicit = env('SMTP_FROM');
  if (explicit) return explicit;
  const user = env('SMTP_USER');
  if (!user) return null;
  const name = env('SMTP_FROM_NAME') || 'Preventivo';
  return `${name} <${user}>`;
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
  if (secureEnv.length > 0) {
    return secureEnv.toLowerCase() === 'true' || secureEnv === '1';
  }
  return port === 465;
}

async function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = env('SMTP_HOST');
  const user = env('SMTP_USER');
  const pass = env('SMTP_PASS');

  if (!host || !user || !pass) return null;

  const port = Number(env('SMTP_PORT') || '587');
  const secure = smtpSecureForPort(port);
  const debug = env('SMTP_DEBUG') === '1';

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 20_000,
    greetingTimeout: 20_000,
    socketTimeout: 30_000,
    tls: { minVersion: 'TLSv1.2' },
    ...(secure ? {} : { requireTLS: true }),
    ...(debug ? { logger: true, debug: true } : {})
  });
  return cachedTransporter;
}

async function verifySmtp() {
  const transporter = await getTransporter();
  if (!transporter) {
    return { ok: false, error: 'missing_config', summary: smtpConfigSummary() };
  }
  try {
    await transporter.verify();
    return { ok: true, from: buildMailFrom(), summary: smtpConfigSummary() };
  } catch (e) {
    cachedTransporter = null;
    return {
      ok: false,
      error: e?.message || String(e),
      code: e?.code || null,
      summary: smtpConfigSummary()
    };
  }
}

async function logSmtpStatus() {
  const result = await verifySmtp();
  if (!result.ok) {
    if (result.error === 'missing_config') {
      console.warn('[smtp] not configured:', result.summary);
      console.warn('[smtp] in Pelican: Server → Variables → SMTP_HOST, SMTP_USER, SMTP_PASS, CONTACT_TO');
    } else {
      console.error('[smtp] verify failed:', result.error, result.code ? `(${result.code})` : '');
      console.error('[smtp] config:', result.summary);
    }
    return;
  }
  console.log('[smtp] ready —', result.from);
}

// very small in-memory rate limit (per-IP)
const rateWindowMs = 60_000;
const rateMax = 10;
const rateMap = new Map();
function rateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateMap.get(ip) || { start: now, count: 0 };
  if (now - entry.start > rateWindowMs) {
    entry.start = now;
    entry.count = 0;
  }
  entry.count += 1;
  rateMap.set(ip, entry);
  if (entry.count > rateMax) return res.status(429).json({ ok: false, error: 'Too many requests' });
  return next();
}

app.post('/api/contact', rateLimit, async (req, res) => {
  const nome = requiredString(req.body?.nome, 80);
  const cognome = requiredString(req.body?.cognome, 80);
  const email = requiredString(req.body?.email, 160);
  const servizio = requiredString(req.body?.servizio, 80);
  const messaggio = typeof req.body?.messaggio === 'string' ? req.body.messaggio.trim().slice(0, 2000) : '';
  const source = typeof req.body?.source === 'string' ? req.body.source.trim().slice(0, 120) : '';

  if (!nome || !cognome || !email || !servizio) {
    return res.status(400).json({ ok: false, error: 'Missing required fields' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email' });
  }

  const to = env('CONTACT_TO');
  if (!to) {
    console.error('[contact] CONTACT_TO not set');
    return res.status(500).json({ ok: false, error: 'contact_not_configured' });
  }

  const transporter = await getTransporter();

  if (!transporter) {
    console.error('[contact] SMTP missing:', smtpConfigSummary());
    return res.status(500).json({ ok: false, error: 'smtp_not_configured' });
  }

  const from = buildMailFrom();
  if (!from) {
    console.error('[contact] SMTP_FROM / SMTP_USER not set');
    return res.status(500).json({ ok: false, error: 'sender_not_configured' });
  }

  const subject = `Richiesta preventivo — ${servizio}`;
  const text = [
    `Nome: ${nome}`,
    `Cognome: ${cognome}`,
    `Email: ${email}`,
    `Servizio: ${servizio}`,
    source ? `Sorgente: ${source}` : null,
    '',
    'Messaggio:',
    messaggio || '(nessun messaggio)'
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const info = await transporter.sendMail({
      from,
      to,
      replyTo: email,
      subject,
      text
    });
    // eslint-disable-next-line no-console
    console.log('[contact] email sent', info?.messageId || '');
    return res.json({ ok: true });
  } catch (e) {
    cachedTransporter = null;
    // eslint-disable-next-line no-console
    console.error('[contact] send failed:', e?.code || '', e?.message || e);
    return res.status(502).json({
      ok: false,
      error: 'delivery_failed',
      detail: e?.code || null
    });
  }
});

// Pelican Panel injects SERVER_PORT from the primary allocation; PORT for local/.env
const port = Number(process.env.SERVER_PORT || process.env.PORT || '3000');
const host = process.env.HOST || '0.0.0.0';

app.listen(port, host, () => {
  // eslint-disable-next-line no-console
  console.log(`[Nuova Copertura] Listening on ${host}:${port}`);
  void logSmtpStatus();
});

