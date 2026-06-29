declare module '*.css';

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module 'react' {
  export const StrictMode: any;
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useMemo<T>(factory: () => T, deps?: any[]): T;
  export function useRef<T = undefined>(initialValue?: T): {current: T | undefined};
  export function useState<T>(initialState: T | (() => T)): [T, (value: T | ((current: T) => T)) => void];
  export function useState<T = undefined>(): [T | undefined, (value: T | undefined | ((current: T | undefined) => T | undefined)) => void];
}

declare module 'react/jsx-runtime' {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}

declare module 'react-dom/client' {
  export function createRoot(element: Element): {render: (node: any) => void};
}
