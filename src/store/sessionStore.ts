import {create} from 'zustand';
import {Utente} from '../types/domain';

type SessionState = {
  currentUser?: Utente;
  setCurrentUser: (user?: Utente) => void;
};

export const useSessionStore = create<SessionState>(set => ({
  currentUser: undefined,
  setCurrentUser: currentUser => set({currentUser}),
}));
