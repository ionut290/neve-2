declare module 'react';
declare module 'react-native';
declare module '@react-navigation/native';
declare module '@react-navigation/native-stack';
declare module 'react-native-maps';
declare module '@react-native-firebase/app';
declare module '@react-native-firebase/auth';
declare module '@react-native-firebase/storage';
declare module '@react-native-firebase/firestore' {
  export namespace FirebaseFirestoreTypes {
    export type Timestamp = {toDate: () => Date};
  }
  const firestore: any;
  export default firestore;
}
declare module '@transistorsoft/react-native-background-geolocation' {
  export type Location = any;
  export type Subscription = {remove: () => void};
  const BackgroundGeolocation: any;
  export default BackgroundGeolocation;
}
declare module 'zustand' {
  export function create<T>(initializer: (set: (partial: Partial<T>) => void) => T): <U>(selector: (state: T) => U) => U;
}
