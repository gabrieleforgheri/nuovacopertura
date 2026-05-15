# Nuova Copertura (static + backend)

Landing HTML e backend Express per il form **Contattaci**.

## Deploy su Pelican Panel (consigliato)

Il progetto è pensato per il **Node.js egg** di Pelican: una porta allocata dal pannello, variabili d’ambiente per SMTP, niente Docker Compose.

### 1. Importa l’egg (opzionale ma consigliato)

1. **Admin** → **Nests** → **Eggs** → **Import Egg**
2. Carica [`pelican/egg-nuovacopertura.json`](pelican/egg-nuovacopertura.json)
3. L’egg include già:
   - avvio su `server.js`
   - rilevamento avvio: `[Nuova Copertura] Listening on`
   - variabili `CONTACT_TO` e SMTP nel pannello

In alternativa puoi usare l’egg generico **node.js generic** da [pelican-eggs/generic](https://github.com/pelican-eggs/generic) (vedi sotto).

### 2. Crea il server

1. **Servers** → **Create Server**
2. Scegli l’egg **Nuova Copertura (Node.js)** (o **node.js generic**)
3. Immagine Docker: **Nodejs 24** (stesse yolks dell’egg generico; se `nodejs_20` non esiste sul nodo, non usarla)
4. **Alloca almeno una porta** (es. `3000`) — Pelican imposta `SERVER_PORT` automaticamente; l’app ascolta su `0.0.0.0`

### 3. Variabili egg / ambiente

| Variabile | Obbligatoria | Valore di esempio (Zoho EU) |
|-----------|--------------|----------------------------|
| `CONTACT_TO` | Sì | `info@yrb4g.com` |
| `SMTP_HOST` | Sì | `smtp.zoho.eu` |
| `SMTP_PORT` | No | `465` |
| `SMTP_SECURE` | No | `true` (SMTPS) |
| `SMTP_USER` | Sì | `info@yrb4g.com` |
| `SMTP_PASS` | Sì | password casella Zoho |
| `SMTP_FROM_NAME` | No | `Preventivo` |
| `SMTP_FROM` | No | `Preventivo <info@yrb4g.com>` |

All’avvio nei log: `[smtp] ready` oppure `[smtp] verify failed` con il motivo. Senza SMTP il form risponde 500.

**Deploy da Git:** imposta `GIT_ADDRESS` (es. `https://github.com/tuo-user/nuovacopertura`), `BRANCH` = `main`, `USER_UPLOAD` = `0`, poi **Reinstall**.

**Upload manuale (SFTP):** `USER_UPLOAD` = `1`, carica tutti i file del repo in `/home/container`, poi **Reinstall** (solo `npm install`).

### 4. Egg generico “node.js generic” (senza import custom)

Se usi solo l’egg generico:

| Impostazione | Valore |
|--------------|--------|
| **Main file** (`MAIN_FILE`) | `server.js` |
| **Startup done** (modifica nell’egg o nel server) | `[Nuova Copertura] Listening on` |
| Variabili pannello | Aggiungi manualmente `CONTACT_TO`, `SMTP_*` come sopra |

Lo startup del generico esegue già `npm install` e `node /home/container/${MAIN_FILE}`.

### 5. Avvio e URL

Dopo **Start**, nei log dovresti vedere:

```text
[Nuova Copertura] Listening on 0.0.0.0:<porta-allocata>
```

- Accesso diretto: `http://<IP-nodo>:<porta-allocata>/`
- Con **reverse proxy** Pelican: associa il dominio alla stessa porta allocata

Il server usa `trust proxy` per leggere l’IP reale dietro il proxy (rate limit sul form).

---

## Sviluppo locale

1. Copia `.env.example` in `.env` e compila `CONTACT_TO` + SMTP
2. `npm install` → `npm run dev`
3. Apri `http://localhost:3000/` (`PORT` in `.env`; in produzione Pelican usa `SERVER_PORT`)

## API contatti

- `POST /api/contact` — JSON: `nome`, `cognome`, `email`, `servizio` (obbligatori); `messaggio` (opzionale)

---

## Deploy con Docker (opzionale)

Per Portainer / Docker Compose vedi `docker-compose.yml` e `Dockerfile`. Non necessario se usi Pelican.
