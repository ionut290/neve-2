# Servizio Neve WebApp/PWA

Servizio Neve è una WebApp/PWA mobile-first realizzata con HTML, CSS e JavaScript vanilla. Usa Firebase Auth, Firestore e Firebase Storage per identità, dati e foto, e Leaflet/OpenStreetMap per mostrare i percorsi.

## Struttura principale

- `index.html`: shell PWA e inclusione Leaflet/app.
- `style.css`: UI responsive mobile-first.
- `app.js`: rendering dashboard per ruolo e flusso operativo.
- `firebase.js`: inizializzazione Firebase e re-export SDK.
- `auth.js`: login, registrazione e profili utente.
- `firestore.js`: query con scope multi azienda/tecnico e storico servizi.
- `map.js`: mappa Leaflet, disegno percorsi e posizione live.

## Regole funzionali

- Ruoli previsti: `super_admin`, `azienda_admin`, `tecnico`, `operatore`.
- Ogni record operativo contiene `companyId` e, quando necessario, `technicianId`.
- Gli admin azienda vedono i dati della propria azienda.
- I tecnici vedono e gestiscono solo progetti, percorsi e operatori collegati al proprio `codiceTecnico`.
- Gli operatori inseriscono il `codiceTecnico`, vengono collegati al tecnico e vedono solo i progetti assegnati da quel tecnico.
- Durante il servizio la posizione GPS viene salvata in Firestore solo mentre la WebApp è aperta.

## Nota GPS WebApp/PWA

La Geolocation API del browser non è affidabile a schermo spento o con app in background. Per questo l'operatore vede l'avviso:

> “Per registrare correttamente il percorso, tieni l'app aperta durante il servizio.”

## Configurazione Firebase

Aggiorna `firebase.js` sostituendo i placeholder di `firebaseConfig` con i valori del tuo progetto Firebase. Finché restano i placeholder, la WebApp entra in modalità demo locale con `localStorage`, così la registrazione non mostra più errori `auth/api-key-not-valid` durante le prove senza progetto Firebase configurato.

## Super admin iniziale

L'utente Ionel Varga con email `ionut29019@gmail.com` viene sempre registrato come `super_admin`, indipendentemente dal ruolo selezionato nel form.

## Comandi

```bash
npm install
npm run dev
npm run build
```
