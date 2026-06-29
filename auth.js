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

export const ROLES = ['super_admin', 'azienda_admin', 'tecnico', 'operatore'];
export const BOOTSTRAP_SUPER_ADMIN_EMAIL = 'ionut29019@gmail.com';
export const BOOTSTRAP_SUPER_ADMIN_NAME = 'Ionel Varga';

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

function buildProfile({ user, email, displayName, role, companyId, codiceTecnico }) {
  const normalizedEmail = normalizeEmail(email);
  const isBootstrapSuperAdmin = normalizedEmail === BOOTSTRAP_SUPER_ADMIN_EMAIL;
  const finalRole = isBootstrapSuperAdmin ? 'super_admin' : role;

  return {
    uid: user.uid,
    email: normalizedEmail,
    displayName: isBootstrapSuperAdmin ? BOOTSTRAP_SUPER_ADMIN_NAME : displayName,
    role: finalRole,
    companyId: finalRole === 'super_admin' ? null : companyId,
    codiceTecnico: finalRole === 'tecnico' ? codiceTecnico : null,
    linkedTechnicianCode: finalRole === 'operatore' ? codiceTecnico : null,
    linkedTechnicianId: null,
    isBootstrapSuperAdmin,
    createdAt: isFirebaseConfigured ? serverTimestamp() : new Date().toISOString(),
  };
}

export async function login(email, password) {
  const credential = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
  return credential.user;
}

export async function register({ email, password, displayName, role, companyId, codiceTecnico }) {
  const normalizedEmail = normalizeEmail(email);
  const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
  const user = credential.user;
  const profile = buildProfile({ user, email: normalizedEmail, displayName, role, companyId, codiceTecnico });

  await updateProfile(user, { displayName: profile.displayName });

  if (isFirebaseConfigured) {
    await setDoc(doc(db, 'users', user.uid), profile);
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
    return snapshot.exists() ? snapshot.data() : null;
  }

  return localUsers()[uid] || null;
}
