import {collection, doc} from 'firebase/firestore';
import {getFirebaseDb} from './config';

export const COLLECTIONS = {
  aziende: 'aziende',
  users: 'users',
  percorsi: 'percorsi',
  progetti: 'progetti',
  operatori: 'operatori',
  serviziNeve: 'serviziNeve',
  posizioniLive: 'posizioniLive',
} as const;

export const userRef = (uid: string) => doc(getFirebaseDb(), COLLECTIONS.users, uid);
export const aziendaRef = (aziendaId: string) => doc(getFirebaseDb(), COLLECTIONS.aziende, aziendaId);
export const percorsiCollection = (aziendaId: string) => collection(getFirebaseDb(), COLLECTIONS.aziende, aziendaId, COLLECTIONS.percorsi);
export const progettiCollection = (aziendaId: string) => collection(getFirebaseDb(), COLLECTIONS.aziende, aziendaId, COLLECTIONS.progetti);
export const operatoriCollection = (aziendaId: string) => collection(getFirebaseDb(), COLLECTIONS.aziende, aziendaId, COLLECTIONS.operatori);
export const operatoreRef = (aziendaId: string, operatoreId: string) => doc(getFirebaseDb(), COLLECTIONS.aziende, aziendaId, COLLECTIONS.operatori, operatoreId);
export const servizioRef = (aziendaId: string, servizioId: string) => doc(getFirebaseDb(), COLLECTIONS.aziende, aziendaId, COLLECTIONS.serviziNeve, servizioId);
export const posizioneLiveRef = (aziendaId: string, operatoreId: string) => doc(getFirebaseDb(), COLLECTIONS.aziende, aziendaId, COLLECTIONS.posizioniLive, operatoreId);
