import {AppState, SnowService} from './types';

const STORAGE_KEY = 'servizio-neve-pwa-state';

const initialState: AppState = {
  role: 'operatore',
  userName: 'Operatore Demo',
  routes: [
    {
      id: 'percorso-centro',
      name: 'Percorso Centro',
      area: 'Zona centro storico',
      assignedTo: 'Operatore Demo',
      points: [
        {lat: 45.0703, lng: 7.6869, recordedAt: new Date().toISOString()},
        {lat: 45.073, lng: 7.69, recordedAt: new Date().toISOString()},
        {lat: 45.075, lng: 7.695, recordedAt: new Date().toISOString()},
      ],
    },
  ],
  services: [],
};

export function loadAppState(): AppState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return initialState;

  try {
    return {...initialState, ...JSON.parse(raw)} as AppState;
  } catch {
    return initialState;
  }
}

export function saveAppState(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetAppState(): AppState {
  localStorage.removeItem(STORAGE_KEY);
  return initialState;
}

export function upsertService(state: AppState, service: SnowService): AppState {
  const services = state.services.some(item => item.id === service.id)
    ? state.services.map(item => (item.id === service.id ? service : item))
    : [service, ...state.services];
  return {...state, services};
}
