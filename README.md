# Servizio Neve PWA

Progetto ripartito da zero come **solo PWA web app**. Non contiene più integrazioni native, Firebase, regole Firestore o codice mobile: è una webapp installabile dal browser con dati demo salvati in `localStorage`.

## Funzioni incluse

- Dashboard unica responsive per azienda admin, tecnico e operatore.
- Cambio ruolo demo senza backend.
- Percorso neve demo assegnato all'operatore.
- Avvio e fine servizio neve con Geolocation API del browser.
- Calcolo km, durata e punti GPS raccolti.
- Storico servizi locale.
- Pulsante per eliminare tutti i dati locali e ripartire da capo.
- Manifest PWA e service worker minimale per shell offline.

## Comandi

```bash
npm install
npm run dev
npm run build
```

## Nota GPS web

Il tracciamento web usa `navigator.geolocation.watchPosition`: per limiti dei browser funziona in modo affidabile solo con la PWA aperta/autorizzata. Non usa foreground service Android o permessi iOS nativi.
