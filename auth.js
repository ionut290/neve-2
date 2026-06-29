import {
  auth,
  createUserWithEmailAndPassword,
  db,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from './firebase.js';

export const ROLES = ['super_admin', 'azienda_admin', 'tecnico', 'operatore'];

export async function login(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function register({ email, password, displayName, role, companyId, codiceTecnico }) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  const user = credential.user;
  await updateProfile(user, { displayName });

  const profile = {
    uid: user.uid,
    email,
    displayName,
    role,
    companyId: role === 'super_admin' ? null : companyId,
    codiceTecnico: role === 'tecnico' ? codiceTecnico : null,
    linkedTechnicianCode: role === 'operatore' ? codiceTecnico : null,
    linkedTechnicianId: null,
    createdAt: serverTimestamp(),
  };

  await setDoc(doc(db, 'users', user.uid), profile);
  return profile;
}

export async function logout() {
  await signOut(auth);
}

export async function getUserProfile(uid) {
  const snapshot = await getDoc(doc(db, 'users', uid));
  return snapshot.exists() ? snapshot.data() : null;
}
