# Servizio Neve Webapp

Webapp React + Vite per gestione servizi neve con Firebase Auth, Firestore, Storage e tracciamento GPS tramite Geolocation API del browser.

## Struttura

- `src/screens`: Login, Dashboard Operatore, Dashboard Tecnico, Mappa Servizio.
- `src/components`: componenti UI riusabili.
- `src/services`: autenticazione, progetti, geolocalizzazione browser e metriche.
- `src/firebase`: configurazione Firebase web SDK e nomi collection.
- `src/navigation`: router leggero basato sul ruolo utente.
- `src/store`: sessione utente con Zustand.

## Configurazione Firebase

Crea un file `.env.local` con le variabili Vite:

```bash
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Geolocalizzazione web

La webapp usa `navigator.geolocation.watchPosition`. Per limiti dei browser, il tracking continua in modo affidabile solo finché la pagina resta aperta e autorizzata; non usa foreground service Android né permessi iOS Always, che sono funzionalità native mobile.
