# Nuova Copertura (static + backend)

Questo progetto contiene la landing HTML e una prima implementazione backend per far funzionare il form **Contattaci**.

## Avvio

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

