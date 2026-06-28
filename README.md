# Servizio Neve Mobile

App React Native per gestione servizi neve con Firebase Auth, Firestore, Storage e tracciamento GPS in background.

## Struttura

- `src/screens`: Login, Dashboard Operatore, Dashboard Tecnico, Mappa Servizio.
- `src/components`: componenti UI riusabili.
- `src/services`: autenticazione, progetti e background geolocation.
- `src/firebase`: configurazione Firebase e nomi collection.
- `src/navigation`: stack navigation.
- `src/store`: sessione utente con Zustand.

## Background geolocation

Il progetto usa `@transistorsoft/react-native-background-geolocation`, compatibile Android e iOS. Su Android è configurato il foreground service con notifica permanente “Servizio neve attivo - GPS in corso”; su iOS richiede autorizzazione `Always`.
