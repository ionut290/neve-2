import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signInWithEmailAndPassword as firebaseSignInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import {
  getDownloadURL as firebaseGetDownloadURL,
  getStorage,
  ref as firebaseRef,
  uploadBytes as firebaseUploadBytes,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

// Sostituisci questi valori con la configurazione del tuo progetto Firebase.
// Se restano placeholder, la WebApp usa una modalità demo locale per evitare errori api-key.
export const firebaseConfig = {
  apiKey: 'INSERISCI_API_KEY',
  authDomain: 'INSERISCI_AUTH_DOMAIN',
  projectId: 'INSERISCI_PROJECT_ID',
  storageBucket: 'INSERISCI_STORAGE_BUCKET',
  messagingSenderId: 'INSERISCI_MESSAGING_SENDER_ID',
  appId: 'INSERISCI_APP_ID',
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every((value) => value && !value.startsWith('INSERISCI_'));

export const app = isFirebaseConfigured ? initializeApp(firebaseConfig) : null;
export const auth = isFirebaseConfigured ? getAuth(app) : null;
export const db = isFirebaseConfigured ? getFirestore(app) : null;
export const storage = isFirebaseConfigured ? getStorage(app) : null;

const localAuthListeners = new Set();
const localCurrentUserKey = 'servizioNeve.currentUser';

function emitLocalAuth(user) {
  localAuthListeners.forEach((listener) => listener(user));
}

export function onAuthStateChanged(authInstance, callback) {
  if (isFirebaseConfigured) return firebaseOnAuthStateChanged(authInstance, callback);
  localAuthListeners.add(callback);
  callback(JSON.parse(localStorage.getItem(localCurrentUserKey) || 'null'));
  return () => localAuthListeners.delete(callback);
}

export async function createUserWithEmailAndPassword(authInstance, email, password) {
  if (isFirebaseConfigured) return firebaseCreateUserWithEmailAndPassword(authInstance, email, password);
  const user = { uid: crypto.randomUUID(), email, displayName: email.split('@')[0], password };
  localStorage.setItem(localCurrentUserKey, JSON.stringify(user));
  emitLocalAuth(user);
  return { user };
}

export async function signInWithEmailAndPassword(authInstance, email, password) {
  if (isFirebaseConfigured) return firebaseSignInWithEmailAndPassword(authInstance, email, password);
  const users = JSON.parse(localStorage.getItem('servizioNeve.users') || '{}');
  const user = Object.values(users).find((profile) => profile.email?.toLowerCase() === email.toLowerCase());
  if (!user) throw new Error('Utente demo non trovato. Registrati prima di accedere.');
  const authUser = { uid: user.uid, email: user.email, displayName: user.displayName, password };
  localStorage.setItem(localCurrentUserKey, JSON.stringify(authUser));
  emitLocalAuth(authUser);
  return { user: authUser };
}

export async function signOut(authInstance) {
  if (isFirebaseConfigured) return firebaseSignOut(authInstance);
  localStorage.removeItem(localCurrentUserKey);
  emitLocalAuth(null);
}

export async function updateProfile(user, profile) {
  if (isFirebaseConfigured) return firebaseUpdateProfile(user, profile);
  Object.assign(user, profile);
  localStorage.setItem(localCurrentUserKey, JSON.stringify(user));
}

export function ref(storageInstance, path) {
  if (isFirebaseConfigured) return firebaseRef(storageInstance, path);
  return { fullPath: path };
}

export async function uploadBytes(storageRef, file) {
  if (isFirebaseConfigured) return firebaseUploadBytes(storageRef, file);
  return { ref: storageRef, metadata: { name: file.name } };
}

export async function getDownloadURL(storageRef) {
  if (isFirebaseConfigured) return firebaseGetDownloadURL(storageRef);
  return `demo://${storageRef.fullPath}`;
}

export {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
};
