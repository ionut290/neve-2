import firebase from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

export const firebaseApp = firebase.app();
export const firebaseAuth = auth();
export const firebaseDb = firestore();
export const firebaseStorage = storage();
export const serverTimestamp = firestore.FieldValue.serverTimestamp;
