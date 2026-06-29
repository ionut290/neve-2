import {addDoc, collection, doc, setDoc} from 'firebase/firestore';
import {getFirebaseDb, serverTimestamp} from '../firebase/config';
import {COLLECTIONS} from '../firebase/collections';
import {Percorso, ProgettoNeve} from '../types/domain';

export async function creaProgettoNeve(input: Pick<ProgettoNeve, 'aziendaId' | 'tecnicoId' | 'nome' | 'descrizione'>) {
  return addDoc(collection(getFirebaseDb(), COLLECTIONS.progettiNeve), {
    ...input,
    operatoreIds: [],
    percorsoIds: [],
    stato: 'bozza',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function caricaPercorsoGps(input: Omit<Percorso, 'createdAt' | 'updatedAt'>) {
  return addDoc(collection(getFirebaseDb(), COLLECTIONS.percorsi), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function assegnaOperatori(progettoId: string, operatoreIds: string[]) {
  await setDoc(
    doc(getFirebaseDb(), COLLECTIONS.progettiNeve, progettoId),
    {
      operatoreIds,
      stato: 'assegnato',
      updatedAt: serverTimestamp(),
    },
    {merge: true},
  );
}
