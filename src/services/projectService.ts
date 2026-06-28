import {firebaseDb, serverTimestamp} from '../firebase/config';
import {COLLECTIONS} from '../firebase/collections';
import {Percorso, ProgettoNeve} from '../types/domain';

export async function creaProgettoNeve(input: Pick<ProgettoNeve, 'aziendaId' | 'tecnicoId' | 'nome' | 'descrizione'>) {
  return firebaseDb.collection(COLLECTIONS.progettiNeve).add({
    ...input,
    operatoreIds: [],
    percorsoIds: [],
    stato: 'bozza',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function caricaPercorsoGps(input: Omit<Percorso, 'createdAt' | 'updatedAt'>) {
  return firebaseDb.collection(COLLECTIONS.percorsi).add({
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function assegnaOperatori(progettoId: string, operatoreIds: string[]) {
  await firebaseDb.collection(COLLECTIONS.progettiNeve).doc(progettoId).set(
    {
      operatoreIds,
      stato: 'assegnato',
      updatedAt: serverTimestamp(),
    },
    {merge: true},
  );
}
