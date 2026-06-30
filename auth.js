import {
  auth,
  createUserWithEmailAndPassword,
  db,
  doc,
  getDoc,
  isFirebaseConfigured,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  signInWithPopup,
  googleProvider,
  signOut,
  updateProfile,
} from './firebase.js';

export const ROLES = ['admin', 'tecnico', 'operatore'];

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function localUsers() {
  return JSON.parse(localStorage.getItem('servizioNeve.users') || '{}');
}

function saveLocalUser(profile) {
  const users = localUsers();
  users[profile.uid] = profile;
  localStorage.setItem('servizioNeve.users', JSON.stringify(users));
}

export async function login(email, password) {
  const credential = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
  return credential.user;
}

export async function loginWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);
  const profile = await getUserProfile(credential.user.uid);
  if (!profile) throw new Error('Account Google non registrato: usa Registrazione con Google e attendi l’abilitazione admin.');
  return credential.user;
}

export async function register({ email, password, nome, ruolo = 'operatore', aziendaId, tecnicoId }) {
  const normalizedEmail = normalizeEmail(email);
  const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  const user = credential.user;
  const now = isFirebaseConfigured ? serverTimestamp() : new Date().toISOString();
  const profile = {
    uid: user.uid,
    nome: String(nome || '').trim(),
    email: normalizedEmail,
    ruolo,
    aziendaId: String(aziendaId || '').trim(),
    tecnicoId: String(tecnicoId || '').trim(),
    stato: 'in_attesa',
    createdAt: now,
  };

  await updateProfile(user, { displayName: profile.nome });

  if (isFirebaseConfigured) {
    await setDoc(doc(db, 'users', user.uid), profile);
    if (ruolo === 'operatore') await setDoc(doc(db, 'aziende', profile.aziendaId, 'operatori', user.uid), {uid: user.uid, nome: profile.nome, tecnicoId: profile.tecnicoId, stato: 'in_attesa'});
  } else {
    saveLocalUser(profile);
  }

  return profile;
}

export async function registerWithGoogle({ ruolo = 'operatore', aziendaId, tecnicoId }) {
  const credential = await signInWithPopup(auth, googleProvider);
  const user = credential.user;
  const email = normalizeEmail(user.email);
  const now = isFirebaseConfigured ? serverTimestamp() : new Date().toISOString();
  const profile = {
    uid: user.uid,
    nome: String(user.displayName || email.split('@')[0] || '').trim(),
    email,
    ruolo,
    aziendaId: String(aziendaId || '').trim(),
    tecnicoId: String(tecnicoId || '').trim(),
    stato: 'in_attesa',
    createdAt: now,
  };
  if (isFirebaseConfigured) {
    await setDoc(doc(db, 'users', user.uid), profile);
    if (ruolo === 'operatore') await setDoc(doc(db, 'aziende', profile.aziendaId, 'operatori', user.uid), {uid: user.uid, nome: profile.nome, tecnicoId: profile.tecnicoId, stato: 'in_attesa'});
  } else {
    saveLocalUser(profile);
  }
  return profile;
}

export async function logout() {
  await signOut(auth);
}

export async function getUserProfile(uid) {
  if (isFirebaseConfigured) {
    const snapshot = await getDoc(doc(db, 'users', uid));
    if (!snapshot.exists()) return null;
    return snapshot.data();
  }

  const profile = localUsers()[uid] || null;
  return profile;
}
