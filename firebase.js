import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
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
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js';

// Sostituisci questi valori con la configurazione del tuo progetto Firebase.
export const firebaseConfig = {
  apiKey: 'INSERISCI_API_KEY',
  authDomain: 'INSERISCI_AUTH_DOMAIN',
  projectId: 'INSERISCI_PROJECT_ID',
  storageBucket: 'INSERISCI_STORAGE_BUCKET',
  messagingSenderId: 'INSERISCI_MESSAGING_SENDER_ID',
  appId: 'INSERISCI_APP_ID',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export {
  addDoc,
  arrayUnion,
  collection,
  createUserWithEmailAndPassword,
  doc,
  getDoc,
  getDocs,
  getDownloadURL,
  limit,
  onAuthStateChanged,
  onSnapshot,
  orderBy,
  query,
  ref,
  serverTimestamp,
  setDoc,
  signInWithEmailAndPassword,
  signOut,
  updateDoc,
  updateProfile,
  uploadBytes,
  where,
};
