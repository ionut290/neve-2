import {firebaseAuth, firebaseDb, serverTimestamp} from '../firebase/config';
import {COLLECTIONS} from '../firebase/collections';
import {Operatore, Utente} from '../types/domain';

export async function login(email: string, password: string): Promise<Utente> {
  const credential = await firebaseAuth.signInWithEmailAndPassword(email, password);
  const uid = credential.user.uid;
  const snapshot = await firebaseDb.collection(COLLECTIONS.utenti).doc(uid).get();
  if (!snapshot.exists) {
    throw new Error('Profilo utente non trovato');
  }
  return snapshot.data() as Utente;
}

export async function collegaOperatoreATecnico(params: {
  operatoreId: string;
  aziendaId: string;
  codiceTecnico: string;
}): Promise<void> {
  const tecnicoSnapshot = await firebaseDb
    .collection(COLLECTIONS.tecnici)
    .where('aziendaId', '==', params.aziendaId)
    .where('codiceTecnico', '==', params.codiceTecnico)
    .limit(1)
    .get();

  if (tecnicoSnapshot.empty) {
    throw new Error('Codice tecnico non valido');
  }

  const tecnicoId = tecnicoSnapshot.docs[0].id;
  const operatoreRef = firebaseDb.collection(COLLECTIONS.operatori).doc(params.operatoreId);
  await operatoreRef.set(
    {
      tecnicoId,
      codiceTecnico: params.codiceTecnico,
      updatedAt: serverTimestamp(),
    } satisfies Partial<Operatore>,
    {merge: true},
  );
}

export function logout(): Promise<void> {
  return firebaseAuth.signOut();
}
