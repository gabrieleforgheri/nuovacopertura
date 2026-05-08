# Nuova Copertura (static + backend)

Questo progetto contiene la landing HTML e una prima implementazione backend per far funzionare il form **Contattaci**.

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

1. Copia `.env.example` in `.env` e compila almeno `CONTACT_TO`
2. Installa dipendenze e avvia:

```bash
npm install
npm run dev
```

Apri `http://localhost:3000/`.

## Contatti (API)

- `POST /api/contact` JSON:
  - `nome`, `cognome`, `email`, `servizio` (obbligatori)
  - `messaggio` (opzionale)

### Invio email

Se configuri `SMTP_HOST/SMTP_USER/SMTP_PASS` in `.env`, il backend invia una mail a `CONTACT_TO`.
Se non configuri SMTP, la richiesta viene comunque accettata e loggata in console (utile per sviluppo).

