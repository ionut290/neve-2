import BackgroundGeolocation, {
  Location,
  Subscription,
} from '@transistorsoft/react-native-background-geolocation';
import firestore from '@react-native-firebase/firestore';
import {firebaseDb, serverTimestamp} from '../firebase/config';
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

let subscriptions: Subscription[] = [];
let currentServiceStartedAt: Date | undefined;
let currentServicePoints: PuntoGps[] = [];

export async function configureBackgroundGeolocation(context: ActiveServiceContext) {
  subscriptions.forEach(subscription => subscription.remove());
  subscriptions = [BackgroundGeolocation.onLocation((location: Location) => saveLocation(context, location))];

  await BackgroundGeolocation.ready({
    desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
    distanceFilter: 10,
    stopOnTerminate: false,
    startOnBoot: true,
    enableHeadless: true,
    foregroundService: true,
    notification: {
      title: 'Servizio neve attivo',
      text: 'GPS in corso',
      sticky: true,
      priority: BackgroundGeolocation.NOTIFICATION_PRIORITY_HIGH,
    },
    locationAuthorizationRequest: 'Always',
    backgroundPermissionRationale: {
      title: 'Consenti posizione sempre',
      message: 'Serve per tracciare il servizio neve anche con schermo spento.',
      positiveAction: 'Consenti',
      negativeAction: 'Annulla',
    },
  });
}

export async function startSnowService(context: ActiveServiceContext) {
  currentServiceStartedAt = new Date();
  currentServicePoints = [];
  await firebaseDb.collection(COLLECTIONS.serviziNeve).doc(context.servizioNeveId).set({
    ...context,
    startedAt: currentServiceStartedAt,
    fotoUrls: [],
    puntiGps: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  } satisfies Partial<ServizioNeve>, {merge: true});
  await configureBackgroundGeolocation(context);
  await BackgroundGeolocation.start();
}

export async function stopSnowService(context?: ActiveServiceContext, note?: string, fotoUrls: string[] = []) {
  await BackgroundGeolocation.stop();
  subscriptions.forEach(subscription => subscription.remove());
  subscriptions = [];

  if (context && currentServiceStartedAt) {
    const endedAt = new Date();
    await firebaseDb.collection(COLLECTIONS.serviziNeve).doc(context.servizioNeveId).set({
      endedAt,
      durataSecondi: calculateDurationSeconds(currentServiceStartedAt, endedAt),
      kmPercorsi: calculateDistanceKm(currentServicePoints),
      note,
      fotoUrls,
      updatedAt: serverTimestamp(),
    } satisfies Partial<ServizioNeve>, {merge: true});
  }

  currentServiceStartedAt = undefined;
  currentServicePoints = [];
}

async function saveLocation(context: ActiveServiceContext, location: Location) {
  const punto: PuntoGps = {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    speed: location.coords.speed,
    heading: location.coords.heading,
    recordedAt: new Date(location.timestamp),
  };

  currentServicePoints.push(punto);

  const liveRef = firebaseDb.collection(COLLECTIONS.posizioniLive).doc(context.operatoreId);
  const serviceRef = firebaseDb.collection(COLLECTIONS.serviziNeve).doc(context.servizioNeveId);

  await firebaseDb.runTransaction(async (transaction: any) => {
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
        puntiGps: firestore.FieldValue.arrayUnion(punto),
        updatedAt: serverTimestamp(),
      },
      {merge: true},
    );
  });
}
