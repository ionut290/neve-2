import {addDoc, doc, setDoc} from 'firebase/firestore';
import {serverTimestamp} from '../firebase/config';
import {percorsiCollection, progettiCollection} from '../firebase/collections';
import {Percorso, ProgettoNeve} from '../types/domain';

export async function creaProgettoNeve(input: Pick<ProgettoNeve, 'tecnicoId' | 'nome'> & {aziendaId: string; percorsoId?: string}) {
  return addDoc(progettiCollection(input.aziendaId), {
    nome: input.nome,
    tecnicoId: input.tecnicoId,
    percorsoId: input.percorsoId ?? '',
    stato: 'bozza',
    createdAt: serverTimestamp(),
  } satisfies ProgettoNeve);
}

export async function caricaPercorsoGps(input: Omit<Percorso, 'createdAt'> & {aziendaId: string}) {
  const {aziendaId, ...percorso} = input;
  return addDoc(percorsiCollection(aziendaId), {
    ...percorso,
    createdAt: serverTimestamp(),
  });
}

export async function assegnaPercorsoAProgetto(aziendaId: string, progettoId: string, percorsoId: string) {
  await setDoc(doc(progettiCollection(aziendaId), progettoId), {percorsoId, stato: 'assegnato'}, {merge: true});
}
