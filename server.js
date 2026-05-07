import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json({ limit: '256kb' }));

// Serve static files (HTML in root)
app.use(express.static(__dirname, { extensions: ['html'] }));

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'nuova-copertura-instagram.html'));
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

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT || '587');
  const secureEnv = process.env.SMTP_SECURE;
  const secure =
    typeof secureEnv === 'string'
      ? secureEnv.toLowerCase() === 'true'
      : port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000
  });
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

  const to = process.env.CONTACT_TO || '';
  if (!to) {
    // In development allow testing without configuration.
    // We still validate input and return ok to avoid blocking the frontend.
    // eslint-disable-next-line no-console
    console.warn('[contact] CONTACT_TO not configured; skipping delivery');
    return res.json({ ok: true, warning: 'CONTACT_TO not configured; skipped delivery' });
  }

  const transporter = getTransporter();

  // If SMTP is configured, send an email; otherwise accept and log.
  if (transporter) {
    const from = process.env.SMTP_FROM || `Nuova Copertura <${process.env.SMTP_USER}>`;
    const subject = `Nuova Copertura - Richiesta preventivo (${servizio})`;
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

    // Fire-and-forget: non blocchiamo la risposta HTTP su eventuali ritardi SMTP.
    transporter
      .sendMail({
        from,
        to,
        replyTo: email,
        subject,
        text
      })
      // eslint-disable-next-line no-console
      .then(() => console.log('[contact] email queued/sent'))
      // eslint-disable-next-line no-console
      .catch((e) => console.warn('[contact] email delivery failed', e?.message || e));
  } else {
    // eslint-disable-next-line no-console
    console.log('[contact] (no SMTP configured)', { nome, cognome, email, servizio, messaggio, source });
  }

  return res.json({ ok: true });
});

const port = Number(process.env.PORT || '3000');
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on http://localhost:${port}`);
});

