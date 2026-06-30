# Servizio Neve WebApp/PWA

Servizio Neve è una WebApp/PWA mobile-first per una gestione multi-azienda di percorsi neve, tecnici e operatori.

## Prima fase implementata

- Shell PWA semplice e responsive.
- Schermate di login e registrazione con email/password.
- Collegamento a Firebase Authentication.
- Creazione del documento `utenti/{uid}` dopo la registrazione con:
  - `ruolo: "operatore"`
  - `abilitato: false`
- Schermata di attesa per gli account non abilitati.
- Dashboard vuote in base al ruolo abilitato:
  - `admin`
  - `tecnico`
  - `operatore`
- Regole Firestore di base coerenti con la separazione per azienda e con la registrazione autonoma degli utenti.

## Struttura principale

- `index.html`: shell PWA.
- `style.css`: UI responsive mobile-first.
- `app.js`: routing UI per login, registrazione, attesa abilitazione e dashboard per ruolo.
- `firebase.js`: inizializzazione Firebase, Storage e fallback demo locale se i placeholder non sono configurati.
- `auth.js`: login, registrazione e lettura profili da `utenti/{uid}`.
- `firestore.rules`: regole di sicurezza base per `aziende`, `utenti`, `percorsi`, `tracceGPS` e `fotoServizio`.

## Configurazione Firebase

Aggiorna `firebase.js` sostituendo i placeholder di `firebaseConfig` con i valori del tuo progetto Firebase. Se i valori non sono ancora configurati, l'app usa automaticamente un fallback locale con `localStorage` per consentire prove rapide dell'interfaccia.

## Modello dati previsto

```text
aziende/{aziendaId}
utenti/{uid}
percorsi/{percorsoId}
tracceGPS/{tracciaId}
fotoServizio/{fotoId}
```

## Comandi

```bash
npm install
npm run dev
npm run build
```
