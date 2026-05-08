# Nuova Copertura

Sito vetrina di **Nuova Copertura Srl** (Modena) — azienda specializzata in coperture, sicurezza in quota e manutenzioni edili. Una sola pagina HTML statica + un piccolo backend Node/Express che gestisce il form **Contattaci**.

## Deploy con Docker (Portainer)

Il progetto è pronto per il deploy tramite Docker e `docker-compose`.
Questo approccio include:
- Un **Dockerfile** multi-stage minimale basato su Alpine Linux.
- Un container che gira in ambiente sicuro senza utente `root`.
- Limiti di risorsa di CPU e RAM.
- Un **docker-compose.yml** con rete isolata bridge per sicurezza.

### Istruzioni (Portainer Stacks)

1. Vai nella tua istanza **Portainer**.
2. Scegli l'environment (es. `local`) > **Stacks** > **Add stack**.
3. Dai un nome allo stack (es. `nuova-copertura`).
4. **Metodo 1: Editor Web**
   - Copia e incolla il contenuto del file `docker-compose.yml` nell'editor.
   - Nella sezione **Environment variables**, definisci le variabili copiando quelle del `.env.example` (es. `SMTP_HOST`, `CONTACT_TO`, ecc.).
5. **Metodo 2: Repository Git**
   - Inserisci l'URL di questo repository GitHub.
   - Usa `docker-compose.yml` come percorso del compose file.
   - Aggiungi le variabili d'ambiente necessarie nell'interfaccia Portainer.
6. Clicca **Deploy the stack**.
7. L'applicazione sarà esposta sulla porta `3000` mappata all'host, quindi naviga a `http://<IP-SERVER>:3000`.

## Sviluppo Locale (Senza Docker)
## Stack

- HTML/CSS/JS vanilla (nessun framework, nessun build step)
- Backend: Node.js + Express + Nodemailer
- Hosting statico: lo stesso server Express serve sia l'HTML che l'endpoint API

## Cosa contiene la landing

- **Hero** con tagline "Leader nelle coperture di qualità" e CTA verso preventivo / servizi
- **Servizi** (Linea vita, Parapetti, Scale marinare, Manutenzione e pulizia) con card animate
- **Chi siamo** con badge "20+ anni di esperienza" e punti di forza
- **Clienti** — carosello loghi a scorrimento infinito
- **Instagram** — sezione dedicata con embed dei reel `@nuovacopertura`
- **Numeri** (counter animati: anni, interventi, clienti)
- **Contattaci** — form con invio reale (vedi sotto) + dati di contatto (indirizzo, telefono, email)
- **Footer** + nav mobile con menu hamburger
- Animazioni di reveal allo scroll, intersection observer, layout responsive

## Avvio (sviluppo)

```bash
git clone https://github.com/gabrieleforgheri/nuovacopertura.git
cd nuovacopertura
npm install
cp .env.example .env   # poi compila i valori (almeno CONTACT_TO)
npm run dev
```

Apri `http://localhost:3000/`.

## Variabili d'ambiente (`.env`)

| Variabile      | Default     | Descrizione                                                            |
| -------------- | ----------- | ---------------------------------------------------------------------- |
| `PORT`         | `3000`      | Porta del server                                                       |
| `CONTACT_TO`   | —           | Indirizzo email che riceve i messaggi del form (richiesto in prod)     |
| `SMTP_HOST`    | —           | Host SMTP (es. `smtp.zoho.eu`)                                         |
| `SMTP_PORT`    | `587`       | Porta SMTP (`465` per SSL implicito)                                   |
| `SMTP_SECURE`  | auto da port | `true` per TLS implicito (porta 465), `false` per STARTTLS             |
| `SMTP_USER`    | —           | Utente SMTP                                                            |
| `SMTP_PASS`    | —           | Password / app-password SMTP                                           |
| `SMTP_FROM`    | `<SMTP_USER>` | Header `From:` della mail in uscita                                  |
| `DNS_SERVERS`  | `1.1.1.1,8.8.8.8` | DNS pubblici usati da Node per `dns.resolve` (vedi note)         |

Senza `SMTP_HOST/USER/PASS` la richiesta del form viene comunque accettata e loggata in console (utile in sviluppo). Senza `CONTACT_TO` il backend ritorna `ok: true` con un warning ma non invia nulla.

## API

### `POST /api/contact`

Body JSON:

```json
{
  "nome": "Mario",
  "cognome": "Rossi",
  "email": "mario.rossi@example.com",
  "servizio": "Manutenzione",
  "messaggio": "(opzionale)",
  "source": "(opzionale, traccia da quale pagina arriva)"
}
```

Risposte:

- `200 { ok: true }` — richiesta accettata e mail inviata (oppure SMTP non configurato in dev)
- `400 { ok: false, error: "Missing required fields" | "Invalid email" }`
- `429 { ok: false, error: "Too many requests" }` — rate limit (max 10/minuto per IP, in memoria)
- `502 { ok: false, error: "Email delivery failed" }` — SMTP raggiungibile ma consegna fallita

### Note implementative

- Validazione lato server di nome/cognome/email/servizio
- Rate limit semplice in memoria per IP (`x-forwarded-for` se presente)
- L'host SMTP viene risolto con `dns.lookup` (resolver di sistema) prima di passare l'IP a Nodemailer, perché Nodemailer userebbe `dns.resolve4/6` (c-ares) che fallisce in ambienti con DNS in uscita filtrato (VPN, firewall corporate). Vedi `getTransporter()` in `server.js`.

## Cose che non funzionano / da fare

### Backend / email

- [ ] **`CONTACT_TO` punta a un indirizzo di test** (`info@yrb4g.com`) anziché `info@nuovacopertura.it`. Da cambiare prima della produzione.
- [ ] **Mittente e destinatario coincidono** quando si usa Zoho con `info@yrb4g.com` sia come `SMTP_USER` che come `CONTACT_TO`: aumenta la probabilità di finire in spam. In produzione conviene un mittente dedicato (`noreply@nuovacopertura.it`) con record SPF/DKIM/DMARC.
- [ ] **Nessuna protezione anti-bot** sul form: niente CAPTCHA, niente honeypot. Il rate limit attuale è solo in memoria e si resetta a ogni riavvio.
- [ ] **Niente persistenza**: i messaggi vivono solo nella mail in uscita. Nessun DB, nessun log strutturato delle richieste.
- [ ] **`SMTP_PASS` in chiaro** in `.env` locale: ok per dev, in prod va gestito via secret manager.
- [ ] **Risoluzione DNS in ambienti molto chiusi**: il fix con `dns.lookup` copre il caso VPN più comune, ma se anche la connessione TCP verso l'SMTP è bloccata l'invio fallisce. Servirebbe un fallback HTTP (es. provider transactional come Resend/SendGrid).
- [ ] Nessun test automatico (unit/E2E).
- [ ] Nessuna pipeline CI/CD né configurazione di deploy (Dockerfile, host target, ecc.).

### Frontend / contenuti

- [ ] **Discrepanza tra servizi** mostrati nella sezione "Cosa facciamo" (Linea vita, Parapetti, Scale marinare, Manutenzione) e le opzioni della select del form (Rifacimento Tetto, Impermeabilizzazione, Fotovoltaico, Smaltimento Amianto, Coibentazione, Manutenzione, Altro). Da allineare.
- [ ] **Immagini placeholder** (Unsplash) nelle card dei servizi e nella foto del team — vanno sostituite con foto reali dei cantieri.
- [ ] **Loghi clienti placeholder** (solo testo): vanno caricati i loghi reali.
- [ ] **P.IVA placeholder** nel footer: `P.IVA 03XXXXXXXX`.
- [ ] **Numeri della sezione "I nostri numeri"** sono inventati: vanno aggiornati con dati reali.
- [ ] **Email mostrata in pagina** è `info@nuovacopertura.it` ma le mail oggi vengono recapitate altrove (vedi punto su `CONTACT_TO`): da uniformare.
- [ ] **Nessun feedback chiaro all'utente** in caso di 502 dal server: oggi mostra solo un `alert` generico. Da migliorare con messaggio inline e retry.
- [ ] **Nessun avviso cookie / privacy policy / cookie banner**, richiesto in UE.
- [ ] **SEO**: manca `meta description`, Open Graph, favicon, sitemap, `robots.txt`.
- [ ] **Accessibilità**: da rivedere contrasti, focus states, alt-text, e form labels.
- [ ] **Una sola lingua** (italiano): nessuna versione EN.
