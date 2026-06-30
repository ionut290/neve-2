import {
  auth,
  createUserWithEmailAndPassword,
  db,
  doc,
  getDoc,
  getRedirectResult,
  isFirebaseConfigured,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  googleProvider,
  signOut,
  updateProfile,
} from './firebase.js';

export const ROLES = ['admin', 'tecnico', 'operatore'];
export const PENDING_GOOGLE_MESSAGE = 'Registrazione ricevuta. Attendi abilitazione da un amministratore.';

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

function isDesktop() {
  return !/Android|iPhone|iPad|iPod|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function googlePendingProfile(user) {
  const email = normalizeEmail(user.email);
  return {
    uid: user.uid,
    role: 'pending',
    enabled: false,
    email,
    displayName: user.displayName || email.split('@')[0] || '',
    photoURL: user.photoURL || '',
    createdAt: isFirebaseConfigured ? serverTimestamp() : new Date().toISOString(),
  };
}

function normalizeProfile(profile) {
  if (!profile) return null;
  return {
    ...profile,
    role: profile.role || profile.ruolo,
    ruolo: profile.ruolo || profile.role,
    enabled: profile.enabled ?? profile.stato === 'abilitato',
    stato: profile.stato || (profile.enabled ? 'abilitato' : 'in_attesa'),
    nome: profile.nome || profile.displayName || profile.email,
  };
}

async function ensureGoogleUserProfile(user) {
  const existing = await getUserProfile(user.uid);
  if (existing) return existing;

  const profile = googlePendingProfile(user);
  if (isFirebaseConfigured) {
    await setDoc(doc(db, 'users', user.uid), profile);
  } else {
    saveLocalUser(profile);
  }
  return normalizeProfile(profile);
}

export async function handleGoogleRedirectResult() {
  const credential = await getRedirectResult(auth);
  if (!credential?.user) return null;
  return ensureGoogleUserProfile(credential.user);
}

export async function login(email, password) {
  const credential = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
  return credential.user;
}

export async function loginWithGoogle() {
  if (isDesktop()) {
    const credential = await signInWithPopup(auth, googleProvider);
    return ensureGoogleUserProfile(credential.user);
  }

  await signInWithRedirect(auth, googleProvider);
  return null;
}

export async function register({ email, password, nome, ruolo = 'operatore', aziendaId, tecnicoId }) {
  const normalizedEmail = normalizeEmail(email);
  const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  const user = credential.user;
  const now = isFirebaseConfigured ? serverTimestamp() : new Date().toISOString();
  const profile = {
    uid: user.uid,
    nome: String(nome || '').trim(),
    displayName: String(nome || '').trim(),
    email: normalizedEmail,
    ruolo,
    role: ruolo,
    aziendaId: String(aziendaId || '').trim(),
    tecnicoId: String(tecnicoId || '').trim(),
    stato: 'in_attesa',
    enabled: false,
    createdAt: now,
  };

  await updateProfile(user, { displayName: profile.nome });

  if (isFirebaseConfigured) {
    await setDoc(doc(db, 'users', user.uid), profile);
    if (ruolo === 'operatore') await setDoc(doc(db, 'aziende', profile.aziendaId, 'operatori', user.uid), {uid: user.uid, nome: profile.nome, tecnicoId: profile.tecnicoId, stato: 'in_attesa', enabled: false});
  } else {
    saveLocalUser(profile);
  }

  return normalizeProfile(profile);
}

export async function registerWithGoogle({ ruolo = 'operatore', aziendaId, tecnicoId }) {
  const credential = await signInWithPopup(auth, googleProvider);
  const user = credential.user;
  const email = normalizeEmail(user.email);
  const now = isFirebaseConfigured ? serverTimestamp() : new Date().toISOString();
  const profile = {
    uid: user.uid,
    nome: String(user.displayName || email.split('@')[0] || '').trim(),
    displayName: user.displayName || '',
    photoURL: user.photoURL || '',
    email,
    ruolo,
    role: ruolo,
    aziendaId: String(aziendaId || '').trim(),
    tecnicoId: String(tecnicoId || '').trim(),
    stato: 'in_attesa',
    enabled: false,
    createdAt: now,
  };
  if (isFirebaseConfigured) {
    await setDoc(doc(db, 'users', user.uid), profile);
    if (ruolo === 'operatore') await setDoc(doc(db, 'aziende', profile.aziendaId, 'operatori', user.uid), {uid: user.uid, nome: profile.nome, tecnicoId: profile.tecnicoId, stato: 'in_attesa', enabled: false});
  } else {
    saveLocalUser(profile);
  }
  return normalizeProfile(profile);
}

export async function logout() {
  await signOut(auth);
}

export async function getUserProfile(uid) {
  if (isFirebaseConfigured) {
    const snapshot = await getDoc(doc(db, 'users', uid));
    if (!snapshot.exists()) return null;
    return normalizeProfile(snapshot.data());
  }

  return normalizeProfile(localUsers()[uid] || null);
}
