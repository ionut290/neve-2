import {createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut, User} from 'firebase/auth';
import {doc, getDoc, serverTimestamp as firestoreServerTimestamp, setDoc} from 'firebase/firestore';
import {getFirebaseAuth, getFirebaseDb} from '../firebase/config';
import {operatoreRef, userRef} from '../firebase/collections';
import {UserRole, Utente} from '../types/domain';

type RegisterInput = {
  nome: string;
  email: string;
  password: string;
  ruolo: UserRole;
  aziendaId: string;
  tecnicoId?: string;
};

export function mapAuthError(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String((error as {code?: string}).code) : '';
  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password')) return 'Email o password non corretti.';
  if (code.includes('auth/email-already-in-use')) return 'Email già registrata: accedi o usa un altro indirizzo.';
  if (code.includes('auth/weak-password')) return 'Password troppo debole: usa almeno 6 caratteri.';
  if (code.includes('auth/invalid-email')) return 'Indirizzo email non valido.';
  return error instanceof Error ? error.message : 'Errore sconosciuto.';
}

export async function getUserProfile(uid: string): Promise<Utente> {
  const snapshot = await getDoc(userRef(uid));
  if (!snapshot.exists()) throw new Error('Profilo utente non trovato. Contatta un admin.');
  return snapshot.data() as Utente;
}

function ensureEnabled(user: Utente): Utente {
  if (user.stato === 'in_attesa') throw new Error('Registrazione ricevuta: il tuo account è in attesa di abilitazione da parte di un admin.');
  if (user.stato === 'bloccato') throw new Error('Account bloccato. Contatta un admin della tua azienda.');
  return user;
}

export async function login(email: string, password: string): Promise<Utente> {
  const credential = await signInWithEmailAndPassword(getFirebaseAuth(), email, password);
  return ensureEnabled(await getUserProfile(credential.user.uid));
}

export async function loginWithGoogle(): Promise<Utente> {
  const credential = await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
  return ensureEnabled(await getUserProfile(credential.user.uid));
}

export async function register(input: RegisterInput): Promise<Utente> {
  const credential = await createUserWithEmailAndPassword(getFirebaseAuth(), input.email, input.password);
  const profile: Utente = {
    uid: credential.user.uid,
    nome: input.nome,
    email: input.email,
    ruolo: input.ruolo,
    aziendaId: input.aziendaId,
    tecnicoId: input.tecnicoId || undefined,
    stato: 'in_attesa',
    createdAt: firestoreServerTimestamp() as Utente['createdAt'],
  };
  await setDoc(userRef(credential.user.uid), profile);
  if (input.ruolo === 'operatore') {
    await setDoc(operatoreRef(input.aziendaId, credential.user.uid), {
      uid: credential.user.uid,
      nome: input.nome,
      tecnicoId: input.tecnicoId || '',
      stato: 'in_attesa',
    });
  }
  return profile;
}

export async function registerWithGoogle(input: Omit<RegisterInput, 'email' | 'password' | 'nome'>): Promise<Utente> {
  const credential = await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
  const email = credential.user.email ?? '';
  const nome = credential.user.displayName ?? email.split('@')[0] ?? '';
  const profile: Utente = {
    uid: credential.user.uid,
    nome,
    email,
    ruolo: input.ruolo,
    aziendaId: input.aziendaId,
    tecnicoId: input.tecnicoId || undefined,
    stato: 'in_attesa',
    createdAt: firestoreServerTimestamp() as Utente['createdAt'],
  };
  await setDoc(userRef(credential.user.uid), profile);
  if (input.ruolo === 'operatore') {
    await setDoc(operatoreRef(input.aziendaId, credential.user.uid), {
      uid: credential.user.uid,
      nome,
      tecnicoId: input.tecnicoId || '',
      stato: 'in_attesa',
    });
  }
  return profile;
}

export function subscribeToAuth(callback: (user?: Utente, authUser?: User) => void, onError: (message: string) => void) {
  return onAuthStateChanged(getFirebaseAuth(), authUser => {
    if (!authUser) {
      callback(undefined, undefined);
      return;
    }
    void getUserProfile(authUser.uid)
      .then(profile => callback(profile, authUser))
      .catch(error => onError(mapAuthError(error)));
  });
}

export async function aggiornaStatoUtente(uid: string, stato: Utente['stato']) {
  await setDoc(userRef(uid), {stato}, {merge: true});
}

export async function collegaOperatoreATecnico(params: {operatoreId: string; aziendaId: string; tecnicoId: string}): Promise<void> {
  await setDoc(userRef(params.operatoreId), {tecnicoId: params.tecnicoId}, {merge: true});
  await setDoc(operatoreRef(params.aziendaId, params.operatoreId), {tecnicoId: params.tecnicoId}, {merge: true});
}

export function logout(): Promise<void> {
  return signOut(getFirebaseAuth());
}
