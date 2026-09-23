# Nuova Copertura — sito + backend form preventivi

Landing statica (in `public/`) servita da un piccolo backend Express che gestisce il
form **Richiedi preventivo** via SMTP.

```
public/          # tutto ciò che è pubblico sul web
  index.html     # landing
  privacy.html   # informativa privacy + cookie policy
  404.html
  style.css  script.js
  img/           # foto in WebP (2 risoluzioni ciascuna)
  fonts/         # Barlow / Bebas Neue self-hosted (nessuna richiesta a Google)
server.js        # Express: statici, /api/contact, /api/health, robots, sitemap
pelican/         # egg per Pelican Panel
```

> **Importante:** solo `public/` è raggiungibile via HTTP. `server.js`, `package.json`,
> il README e l'egg **non** sono serviti.

---

## Configurazione

Copia `.env.example` in `.env` (in locale) oppure imposta le variabili in
**Pelican → Server → Variables**.

| Variabile | Obbl. | Default | Note |
|-----------|:-----:|---------|------|
| `SITE_URL` | Sì | `https://www.nuovacopertura.it` | Usata per canonical, `robots.txt`, `sitemap.xml` e origini CORS |
| `CONTACT_TO` | Sì | `info@nuovacopertura.it` | Casella che riceve i lead |
| `SMTP_HOST` | Sì | `smtp.zoho.eu` | |
| `SMTP_PORT` | No | `587` | `465` per SMTPS |
| `SMTP_SECURE` | No | auto | `true` su porta 465 |
| `SMTP_USER` | Sì | — | Email completa |
| `SMTP_PASS` | Sì | — | Con 2FA serve una **password per app** |
| `SMTP_FROM_NAME` | No | `Preventivo` | |
| `SMTP_FROM` | No | — | Es. `Preventivo <info@nuovacopertura.it>` |
| `NODE_ENV` | No | `production` | `production` = CORS ristretto + health minimale |
| `TRUST_PROXY` | No | `1` (egg: `2`) | **Vedi sotto** |
| `ALLOWED_ORIGINS` | No | da `SITE_URL` | Chi può chiamare `/api/contact` |
| `RATE_MAX` | No | `5` | Invii per IP al minuto |
| `RATE_GLOBAL_MAX` | No | `60` | Tetto complessivo orario |
| `HEALTH_TOKEN` | No | — | Sblocca la diagnostica SMTP |
| `SMTP_DEBUG` | No | — | `1` = log verboso della sessione SMTP |

### ⚠️ `TRUST_PROXY` — leggere prima di andare in produzione

Determina come viene identificato l'IP del client per il rate limit.

Va contato il **numero di hop**, non risposto "c'è un proxy sì/no".

Su `yrb4g.com` la catena è **Cloudflare → Nginx Proxy Manager (VPS Oracle) → CT 202**,
e NPM non ha `real_ip_header CF-Connecting-IP`: accoda quindi l'edge Cloudflare a
`X-Forwarded-For`. Al processo arriva `<client reale>, <edge Cloudflare>` → **`TRUST_PROXY=2`**.

| Valore | `req.ip` con `XFF: 93.45.12.7, 172.68.1.1` |
|--------|-------------------------------------------|
| `0` | indirizzo del socket (NPM) |
| `1` | `172.68.1.1` — **edge Cloudflare**: tutti i visitatori dietro quell'edge condividono lo stesso bucket |
| `2` | `93.45.12.7` — **client reale** ✓ |

Il conteggio parte da destra, quindi un `X-Forwarded-For` falsificato dal client finisce
a sinistra e viene scartato: con `2`, `9.9.9.9, 93.45.12.7, 172.68.1.1` dà comunque
`93.45.12.7`. Alzare il valore oltre il numero reale di hop, invece, rende il limite
aggirabile. Il tetto orario globale (`RATE_GLOBAL_MAX`) resta attivo in ogni caso.

---

## Diagnostica SMTP

All'avvio nei log compare `[smtp] ready — <mittente>` oppure `[smtp] verify failed`
con il motivo.

In produzione `/api/health` restituisce solo `{"ok":true}`: il dettaglio esporrebbe
l'indirizzo di destinazione e i parametri SMTP. Per il payload completo:

```bash
curl -H "x-health-token: $HEALTH_TOKEN" https://<dominio>/api/health
```

**Zoho Mail:** `smtp.zoho.eu`, porta `465`, `SMTP_SECURE=true`, utente = email completa.
Con la 2FA attiva serve una **password per app** (Zoho → Sicurezza → Password
applicazioni), non la password di login.

---

## Deploy su Pelican Panel

1. **Admin → Nests → Eggs → Import Egg** → carica [`pelican/egg-nuovacopertura.json`](pelican/egg-nuovacopertura.json)
2. **Servers → Create Server**, egg **Nuova Copertura (Node.js)**, immagine **Nodejs 24**
3. Alloca almeno una porta: Pelican passa `SERVER_PORT` e l'app ascolta su `0.0.0.0`
4. Compila le variabili (almeno `CONTACT_TO`, `SMTP_*`, `SITE_URL`) e fai **Restart**

**Deploy da Git:** imposta `GIT_ADDRESS`, `BRANCH=main`, `USER_UPLOAD=0`, poi **Reinstall**.

**Aggiornamenti al restart:** con `AUTO_UPDATE=1` (default) ogni avvio esegue
`git pull --ff-only`. Nei log vedrai `[deploy] git pull...` e il commit corrente.
Senza cartella `.git` (upload SFTP) serve **Reinstall**.

**Upload manuale (SFTP):** `USER_UPLOAD=1`, carica i file in `/home/container`,
poi **Reinstall** (esegue solo `npm install`).

---

## Sviluppo locale

Serve Node ≥ 22 (`--env-file-if-exists` legge `.env` senza dotenv).

```bash
npm install
cp .env.example .env      # e compila SMTP_*
npm run dev               # http://localhost:3000, con --watch
npm run check             # controllo sintassi
```

---

## Modificare i contenuti

- **Testi e servizi** → `public/index.html`. Il testo lungo di ogni servizio sta nel
  `div.service-detail` dentro la card: è indicizzabile da Google e alimenta il modale.
- **Elenco del form** → il `<select id="servizio">` deve restare allineato all'array
  `SERVIZI` in `server.js`, che rifiuta valori fuori lista.
- **Social** → profilo Instagram e pagina Facebook sono incorporati (`.social-embed`
  in `index.html`), ma gli iframe di Meta partono solo dopo il click su "Mostra i
  contenuti social" (`script.js`, chiave `social-consent`): un click li carica
  entrambi. Non serve un banner cookie globale; la revoca è nel footer. Il plugin
  Pagina di Facebook resta bianco se l'URL non è una Pagina pubblica senza
  restrizioni di età/paese. Nuovi domini da incorporare vanno aggiunti a
  `frame-src` in `server.js` e all'informativa.
- **Foto** → sostituisci i file in `public/img/` mantenendo i nomi
  (`<servizio>-800.webp` e `<servizio>-1600.webp`).
- **Script inline** → gli hash CSP sono calcolati all'avvio da `server.js`:
  se modifichi lo script inline nell'`<head>` non devi aggiornare nulla a mano.
