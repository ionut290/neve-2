import {doc, getDoc, getDocs, limit, query, setDoc, where, collection} from 'firebase/firestore';
import {signInWithEmailAndPassword, signOut} from 'firebase/auth';
import {firebaseAuth, firebaseDb, serverTimestamp} from '../firebase/config';
import {COLLECTIONS} from '../firebase/collections';
import {Operatore, Utente} from '../types/domain';

export async function login(email: string, password: string): Promise<Utente> {
  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
  const snapshot = await getDoc(doc(firebaseDb, COLLECTIONS.utenti, credential.user.uid));
  if (!snapshot.exists()) {
    throw new Error('Profilo utente non trovato');
  }
  return snapshot.data() as Utente;
}

export async function collegaOperatoreATecnico(params: {
  operatoreId: string;
  aziendaId: string;
  codiceTecnico: string;
}): Promise<void> {
  const tecnicoQuery = query(
    collection(firebaseDb, COLLECTIONS.tecnici),
    where('aziendaId', '==', params.aziendaId),
    where('codiceTecnico', '==', params.codiceTecnico),
    limit(1),
  );
  const tecnicoSnapshot = await getDocs(tecnicoQuery);

  if (tecnicoSnapshot.empty) {
    throw new Error('Codice tecnico non valido');
  }

  const tecnicoId = tecnicoSnapshot.docs[0].id;
  await setDoc(
    doc(firebaseDb, COLLECTIONS.operatori, params.operatoreId),
    {
      tecnicoId,
      codiceTecnico: params.codiceTecnico,
      updatedAt: serverTimestamp(),
    } satisfies Partial<Operatore>,
    {merge: true},
  );
}

export function logout(): Promise<void> {
  return signOut(firebaseAuth);
}
