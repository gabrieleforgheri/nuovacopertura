import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';
import dns from 'node:dns';
import { fileURLToPath } from 'url';
import { isValidEmail, requiredString } from './utils.js';

dotenv.config();

// Nodemailer uses dns.resolve4/6 (c-ares) before falling back to dns.lookup.
// If the system's configured DNS server is unreachable (e.g. 127.0.0.1 with no
// local resolver), resolve4/6 hang for 30s+ and SMTP times out with
// "queryA ETIMEOUT". Override Node's resolver list with public DNS servers
// (configurable via DNS_SERVERS, comma separated) to avoid that.
const dnsServers = (process.env.DNS_SERVERS || '1.1.1.1,8.8.8.8')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
if (dnsServers.length) dns.setServers(dnsServers);

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

// Resolve SMTP host via the OS resolver (dns.lookup) once and pass the IP to
// nodemailer. Nodemailer otherwise uses dns.resolve4/6 (c-ares) which can fail
// on machines where outbound DNS is filtered (VPN, corporate firewall) even
// though the system resolver still works fine.
let smtpHostIpCache = null;
async function resolveSmtpHostIp(host) {
  if (smtpHostIpCache && smtpHostIpCache.host === host) return smtpHostIpCache.ip;
  const { lookup } = await import('node:dns/promises');
  const { address } = await lookup(host, { family: 4 });
  smtpHostIpCache = { host, ip: address };
  return address;
}

async function getTransporter() {
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

  let connectHost = host;
  try {
    connectHost = await resolveSmtpHostIp(host);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[smtp] dns.lookup failed, falling back to host name:', e?.message || e);
  }

  return nodemailer.createTransport({
    host: connectHost,
    port,
    secure,
    auth: { user, pass },
    tls: { servername: host },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000
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

  const transporter = await getTransporter();

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
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[contact] email delivery failed', e?.message || e);
      return res.status(502).json({ ok: false, error: 'Email delivery failed' });
    }
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

