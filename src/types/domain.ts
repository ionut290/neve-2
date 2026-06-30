import {Timestamp as FirestoreTimestamp} from 'firebase/firestore';

export type UserRole = 'admin' | 'tecnico' | 'operatore' | 'pending';
export type UserStatus = 'in_attesa' | 'abilitato' | 'bloccato';
export type Timestamp = FirestoreTimestamp | Date;

export interface Azienda {
  nome: string;
  createdAt: Timestamp;
}

export interface Utente {
  uid: string;
  nome: string;
  displayName?: string;
  photoURL?: string;
  email: string;
  ruolo: UserRole;
  role?: UserRole;
  enabled?: boolean;
  aziendaId: string;
  tecnicoId?: string;
  stato: UserStatus;
  createdAt: Timestamp;
}

export interface Operatore {
  uid: string;
  nome: string;
  tecnicoId: string;
  stato: UserStatus;
}

export interface PuntoGps {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  recordedAt: Timestamp;
}

export interface Percorso {
  nome: string;
  descrizione?: string;
  tecnicoId: string;
  stato: 'bozza' | 'assegnato' | 'attivo' | 'chiuso';
  createdAt: Timestamp;
  punti?: PuntoGps[];
}

export interface ProgettoNeve {
  nome: string;
  tecnicoId: string;
  percorsoId?: string;
  stato: 'bozza' | 'assegnato' | 'attivo' | 'chiuso';
  createdAt: Timestamp;
}

export interface ServizioNeve {
  aziendaId: string;
  tecnicoId: string;
  operatoreId: string;
  progettoNeveId: string;
  percorsoId: string;
  startedAt: Timestamp;
  endedAt?: Timestamp;
  durataSecondi?: number;
  kmPercorsi?: number;
  note?: string;
  fotoUrls: string[];
  puntiGps: PuntoGps[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PosizioneLive {
  aziendaId: string;
  tecnicoId: string;
  operatoreId: string;
  servizioNeveId: string;
  punto: PuntoGps;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
