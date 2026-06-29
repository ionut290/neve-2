# Modello dati Servizio Neve

Collection previste: `aziende`, `utenti`, `tecnici`, `operatori`, `progettiNeve`, `percorsi`, `serviziNeve`, `posizioniLive`, `segnalazioni`, `mezzi`.

Ogni documento applicativo contiene `aziendaId`, `createdAt`, `updatedAt` e, dove necessario, `tecnicoId` e/o `operatoreId`.

- `tecnici.codiceTecnico`: codice usato dall'operatore per collegarsi al tecnico.
- `progettiNeve.operatoreIds`: operatori assegnati al progetto dal tecnico.
- `percorsi.punti`: polilinea GPS caricata o corretta dal tecnico.
- `posizioniLive/{operatoreId}`: ultima posizione live dell'operatore registrata dal browser.
- `serviziNeve/{servizioId}.puntiGps`: storico GPS del servizio, con km, durata, note e foto a chiusura servizio.

Le regole Firestore isolano ogni azienda tramite `aziendaId`, limitano i tecnici a `tecnicoId` e gli operatori a `operatoreId` più progetti assegnati.
