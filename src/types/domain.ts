import {Timestamp as FirestoreTimestamp} from 'firebase/firestore';

export type UserRole = 'super_admin' | 'azienda_admin' | 'tecnico' | 'operatore';
export type Timestamp = FirestoreTimestamp | Date;

export interface BaseCompanyDocument {
  aziendaId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Azienda extends BaseCompanyDocument {
  nome: string;
  codiceFiscale?: string;
}

export interface Utente extends BaseCompanyDocument {
  uid: string;
  nome: string;
  email: string;
  ruolo: UserRole;
  tecnicoId?: string;
  operatoreId?: string;
}

export interface Tecnico extends BaseCompanyDocument {
  utenteId: string;
  nome: string;
  codiceTecnico: string;
}

export interface Operatore extends BaseCompanyDocument {
  utenteId: string;
  nome: string;
  tecnicoId: string;
  codiceTecnico: string;
}

export interface PuntoGps {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  recordedAt: Timestamp;
}

export interface ProgettoNeve extends BaseCompanyDocument {
  tecnicoId: string;
  nome: string;
  descrizione?: string;
  operatoreIds: string[];
  percorsoIds: string[];
  stato: 'bozza' | 'assegnato' | 'attivo' | 'chiuso';
}

export interface Percorso extends BaseCompanyDocument {
  tecnicoId: string;
  progettoNeveId: string;
  nome: string;
  punti: PuntoGps[];
  operatoreIds: string[];
}

export interface ServizioNeve extends BaseCompanyDocument {
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
}

export interface PosizioneLive extends BaseCompanyDocument {
  tecnicoId: string;
  operatoreId: string;
  servizioNeveId: string;
  punto: PuntoGps;
}

export interface Segnalazione extends BaseCompanyDocument {
  tecnicoId?: string;
  operatoreId?: string;
  progettoNeveId?: string;
  testo: string;
  fotoUrls: string[];
  stato: 'aperta' | 'in_lavorazione' | 'chiusa';
}

export interface Mezzo extends BaseCompanyDocument {
  tecnicoId?: string;
  operatoreId?: string;
  targa: string;
  descrizione: string;
}
