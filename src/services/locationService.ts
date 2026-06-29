import {arrayUnion, doc, runTransaction, setDoc} from 'firebase/firestore';
import {getFirebaseDb, serverTimestamp} from '../firebase/config';
import {COLLECTIONS} from '../firebase/collections';
import {PuntoGps, ServizioNeve} from '../types/domain';
import {calculateDistanceKm, calculateDurationSeconds} from './metricsService';

export type ActiveServiceContext = {
  aziendaId: string;
  tecnicoId: string;
  operatoreId: string;
  progettoNeveId: string;
  percorsoId: string;
  servizioNeveId: string;
};

let watchId: number | undefined;
let currentServiceStartedAt: Date | undefined;
let currentServicePoints: PuntoGps[] = [];

export function isWebGeolocationAvailable(): boolean {
  return 'geolocation' in navigator;
}

export async function startSnowService(context: ActiveServiceContext) {
  if (!isWebGeolocationAvailable()) {
    throw new Error('Geolocalizzazione non supportata dal browser');
  }

  currentServiceStartedAt = new Date();
  currentServicePoints = [];
  await setDoc(
    doc(getFirebaseDb(), COLLECTIONS.serviziNeve, context.servizioNeveId),
    {
      ...context,
      startedAt: currentServiceStartedAt,
      fotoUrls: [],
      puntiGps: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } satisfies Partial<ServizioNeve>,
    {merge: true},
  );

  watchId = navigator.geolocation.watchPosition(
    position => void savePosition(context, position),
    error => console.error('Errore geolocalizzazione', error),
    {enableHighAccuracy: true, maximumAge: 5000, timeout: 15000},
  );
}

export async function stopSnowService(context?: ActiveServiceContext, note?: string, fotoUrls: string[] = []) {
  if (watchId !== undefined) {
    navigator.geolocation.clearWatch(watchId);
    watchId = undefined;
  }

  if (context && currentServiceStartedAt) {
    const endedAt = new Date();
    await setDoc(
      doc(getFirebaseDb(), COLLECTIONS.serviziNeve, context.servizioNeveId),
      {
        endedAt,
        durataSecondi: calculateDurationSeconds(currentServiceStartedAt, endedAt),
        kmPercorsi: calculateDistanceKm(currentServicePoints),
        note,
        fotoUrls,
        updatedAt: serverTimestamp(),
      } satisfies Partial<ServizioNeve>,
      {merge: true},
    );
  }

  currentServiceStartedAt = undefined;
  currentServicePoints = [];
}

async function savePosition(context: ActiveServiceContext, position: GeolocationPosition) {
  const punto: PuntoGps = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    speed: position.coords.speed ?? undefined,
    heading: position.coords.heading ?? undefined,
    recordedAt: new Date(position.timestamp),
  };

  currentServicePoints.push(punto);

  const liveRef = doc(getFirebaseDb(), COLLECTIONS.posizioniLive, context.operatoreId);
  const serviceRef = doc(getFirebaseDb(), COLLECTIONS.serviziNeve, context.servizioNeveId);

  await runTransaction(getFirebaseDb(), async transaction => {
    transaction.set(
      liveRef,
      {
        aziendaId: context.aziendaId,
        tecnicoId: context.tecnicoId,
        operatoreId: context.operatoreId,
        servizioNeveId: context.servizioNeveId,
        punto,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      {merge: true},
    );
    transaction.set(
      serviceRef,
      {
        ...context,
        puntiGps: arrayUnion(punto),
        updatedAt: serverTimestamp(),
      },
      {merge: true},
    );
  });
}
