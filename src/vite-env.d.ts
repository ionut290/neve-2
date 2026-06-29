declare module '*.css';

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare interface ImportMeta {
  env: Record<string, string | undefined>;
}

declare module 'react' {
  export const StrictMode: any;
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useMemo<T>(factory: () => T, deps?: any[]): T;
  export function useState<T>(initialState: T | (() => T)): [T, (value: T) => void];
  export function useState<T = undefined>(): [T | undefined, (value: T | undefined) => void];
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare module 'react-dom/client' {
  export function createRoot(element: Element): {render: (node: any) => void};
}

declare module 'firebase/app' {
  export function initializeApp(config: Record<string, string | undefined>): any;
}

declare module 'firebase/auth' {
  export function getAuth(app: any): any;
  export function signInWithEmailAndPassword(auth: any, email: string, password: string): Promise<{user: {uid: string}}>;
  export function signOut(auth: any): Promise<void>;
}

declare module 'firebase/firestore' {
  export type Timestamp = {toDate: () => Date};
  export function getFirestore(app: any): any;
  export function serverTimestamp(): any;
  export function collection(db: any, path: string): any;
  export function doc(db: any, path: string, id: string): any;
  export function getDoc(ref: any): Promise<{exists: () => boolean; data: () => unknown}>;
  export function getDocs(query: any): Promise<{empty: boolean; docs: Array<{id: string; data: () => unknown}>}>;
  export function query(...args: any[]): any;
  export function where(field: string, op: string, value: unknown): any;
  export function limit(value: number): any;
  export function setDoc(ref: any, data: unknown, options?: {merge: boolean}): Promise<void>;
  export function addDoc(ref: any, data: unknown): Promise<any>;
  export function arrayUnion(...values: unknown[]): any;
  export function runTransaction(db: any, updateFunction: (transaction: any) => Promise<void>): Promise<void>;
}

declare module 'firebase/storage' {
  export function getStorage(app: any): any;
}

declare module 'zustand' {
  export function create<T>(initializer: (set: (partial: Partial<T>) => void) => T): <U>(selector: (state: T) => U) => U;
}
