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
  signOut,
  updateProfile,
} from './firebase.js';

export const ROLES = ['admin', 'tecnico', 'operatore'];
export const DIRECT_ADMIN_EMAILS = ['ionut29019@gmail.com'];

export function isDirectAdminEmail(email) {
  return DIRECT_ADMIN_EMAILS.includes(normalizeEmail(email));
}

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

export async function register({ email, password, nome }) {
  const normalizedEmail = normalizeEmail(email);
  const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  const user = credential.user;
  const now = isFirebaseConfigured ? serverTimestamp() : new Date().toISOString();
  const directAdmin = isDirectAdminEmail(normalizedEmail);
  const profile = {
    uid: user.uid,
    nome: String(nome || '').trim(),
    email: normalizedEmail,
    ruolo: directAdmin ? 'admin' : 'operatore',
    aziendaId: '',
    tecnicoId: '',
    abilitato: directAdmin,
    createdAt: now,
    updatedAt: now,
  };

  await updateProfile(user, { displayName: profile.nome });

  if (isFirebaseConfigured) {
    await setDoc(doc(db, 'utenti', user.uid), profile);
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
    const snapshot = await getDoc(doc(db, 'utenti', uid));
    if (!snapshot.exists()) return null;
    return applyDirectAdminAccess(snapshot.data());
  }

  const profile = localUsers()[uid] || null;
  return profile ? applyDirectAdminAccess(profile) : null;
}

function applyDirectAdminAccess(profile) {
  if (!isDirectAdminEmail(profile.email)) return profile;
  return {
    ...profile,
    ruolo: 'admin',
    abilitato: true,
  };
}
