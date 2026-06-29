import {initializeApp} from 'firebase/app';
import {getAuth} from 'firebase/auth';
import {getFirestore, serverTimestamp as firestoreServerTimestamp} from 'firebase/firestore';
import {getStorage} from 'firebase/storage';

const REQUIRED_CONFIG_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

const firebaseConfig: Record<(typeof REQUIRED_CONFIG_KEYS)[number], string | undefined> = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
};

let firebaseApp: any;
let firebaseAuth: any;
let firebaseDb: any;
let firebaseStorage: any;

function missingFirebaseConfigKeys(): string[] {
  return REQUIRED_CONFIG_KEYS.filter(key => !firebaseConfig[key]);
}

export function isFirebaseConfigured(): boolean {
  return missingFirebaseConfigKeys().length === 0;
}

export function getFirebaseConfigError(): string | undefined {
  const missingKeys = missingFirebaseConfigKeys();
  if (missingKeys.length === 0) {
    return undefined;
  }

  return `Configurazione Firebase incompleta. Mancano queste variabili su Netlify: ${missingKeys.join(', ')}.`;
}

export function getFirebaseApp() {
  const configError = getFirebaseConfigError();
  if (configError) {
    throw new Error(configError);
  }

  firebaseApp ??= initializeApp({
    apiKey: firebaseConfig.VITE_FIREBASE_API_KEY,
    authDomain: firebaseConfig.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: firebaseConfig.VITE_FIREBASE_PROJECT_ID,
    storageBucket: firebaseConfig.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: firebaseConfig.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: firebaseConfig.VITE_FIREBASE_APP_ID,
  });

  return firebaseApp;
}

export function getFirebaseAuth() {
  firebaseAuth ??= getAuth(getFirebaseApp());
  return firebaseAuth;
}

export function getFirebaseDb() {
  firebaseDb ??= getFirestore(getFirebaseApp());
  return firebaseDb;
}

export function getFirebaseStorage() {
  firebaseStorage ??= getStorage(getFirebaseApp());
  return firebaseStorage;
}

export const serverTimestamp = firestoreServerTimestamp;
