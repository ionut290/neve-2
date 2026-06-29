import {useEffect, useMemo, useRef, useState} from 'react';
import {PrimaryButton} from './components/PrimaryButton';
import {calculateDistanceKm, formatDuration, pointFromPosition} from './lib/geo';
import {loadAppState, resetAppState, saveAppState, upsertService} from './lib/storage';
import {AppState, SnowService, UserRole} from './lib/types';

const roles: Array<{value: UserRole; label: string}> = [
  {value: 'azienda_admin', label: 'Azienda admin'},
  {value: 'tecnico', label: 'Tecnico'},
  {value: 'operatore', label: 'Operatore'},
];

export function App() {
  const [state, setState] = useState<AppState>(() => loadAppState());
  const [activeService, setActiveService] = useState<SnowService>();
  const [status, setStatus] = useState('PWA pronta. Puoi installarla dal browser e usarla anche offline.');
  const watchId = useRef<number>();

  const assignedRoutes = useMemo(
    () => state.routes.filter(route => state.role !== 'operatore' || route.assignedTo === state.userName),
    [state.role, state.routes, state.userName],
  );

  useEffect(() => saveAppState(state), [state]);

  function updateRole(role: UserRole) {
    setState(current => ({...current, role}));
  }

  function startService(routeId: string) {
    if (!('geolocation' in navigator)) {
      setStatus('Il browser non supporta la geolocalizzazione.');
      return;
    }

    const service: SnowService = {
      id: `servizio-${Date.now()}`,
      routeId,
      operatorName: state.userName,
      startedAt: new Date().toISOString(),
      points: [],
      km: 0,
      notes: '',
      status: 'active',
    };

    setActiveService(service);
    setState(current => upsertService(current, service));
    setStatus('Servizio neve attivo: autorizza il GPS e mantieni aperta la PWA.');

    watchId.current = navigator.geolocation.watchPosition(
      position => {
        const point = pointFromPosition(position);
        setActiveService(current => {
          if (!current) return current;
          const updated = {...current, points: [...current.points, point]};
          updated.km = calculateDistanceKm(updated.points);
          setState(appState => upsertService(appState, updated));
          return updated;
        });
      },
      error => setStatus(`Errore GPS: ${error.message}`),
      {enableHighAccuracy: true, maximumAge: 5000, timeout: 15000},
    );
  }

  function stopService() {
    if (!activeService) return;
    if (watchId.current !== undefined) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = undefined;
    }

    const completed = {
      ...activeService,
      endedAt: new Date().toISOString(),
      km: calculateDistanceKm(activeService.points),
      status: 'completed' as const,
    };
    setActiveService(undefined);
    setState(current => upsertService(current, completed));
    setStatus('Servizio completato e salvato nello storico locale della PWA.');
  }

  function resetDemoData() {
    if (watchId.current !== undefined) navigator.geolocation.clearWatch(watchId.current);
    setActiveService(undefined);
    setState(resetAppState());
    setStatus('Dati locali eliminati. App ripartita da capo.');
  }

  return (
    <main className="app-shell">
      <section className="hero panel">
        <div>
          <p className="eyebrow">PWA web app</p>
          <h1>Servizio Neve</h1>
          <p>Gestisci percorsi, operatori e interventi neve da una webapp installabile, senza codice mobile nativo.</p>
        </div>
        <div className="status-card">
          <span className="status-dot" />
          <p>{status}</p>
        </div>
      </section>

      <section className="toolbar panel">
        <label>
          Ruolo demo
          <select value={state.role} onChange={(event: any) => updateRole(event.target.value)}>
            {roles.map(role => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
        </label>
        <label>
          Nome utente
          <input value={state.userName} onChange={(event: any) => setState(current => ({...current, userName: event.target.value}))} />
        </label>
        <PrimaryButton variant="danger" onClick={resetDemoData}>Elimina dati locali</PrimaryButton>
      </section>

      <section className="grid dashboard-grid">
        <article className="panel">
          <h2>Percorsi assegnati</h2>
          <div className="stack">
            {assignedRoutes.map(route => (
              <div className="route-card" key={route.id}>
                <div>
                  <strong>{route.name}</strong>
                  <p>{route.area} · {route.points.length} punti percorso</p>
                </div>
                <PrimaryButton disabled={Boolean(activeService)} onClick={() => startService(route.id)}>Inizia servizio</PrimaryButton>
              </div>
            ))}
          </div>
        </article>

        <article className="panel map-panel">
          <h2>Mappa servizio</h2>
          <svg className="map" viewBox="0 0 100 70" role="img" aria-label="Mappa percorso neve">
            <rect width="100" height="70" rx="6" fill="#e0f2fe" />
            <path d="M8 52 C 24 35, 38 44, 50 26 S 75 20, 92 10" fill="none" stroke="#94a3b8" strokeWidth="8" strokeLinecap="round" />
            <polyline points="12,55 28,43 46,34 65,27 84,16" fill="none" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" />
            <circle cx={activeService ? 84 : 12} cy={activeService ? 16 : 55} r="4" fill={activeService ? '#16a34a' : '#64748b'} />
          </svg>
          {activeService ? (
            <div className="service-summary">
              <p><strong>Servizio attivo</strong></p>
              <p>Durata: {formatDuration(activeService.startedAt)}</p>
              <p>Km: {activeService.km.toFixed(2)}</p>
              <p>Punti GPS: {activeService.points.length}</p>
              <PrimaryButton variant="danger" onClick={stopService}>Fine servizio</PrimaryButton>
            </div>
          ) : <p>Seleziona un percorso e avvia il tracciamento.</p>}
        </article>

        <article className="panel">
          <h2>Storico servizi</h2>
          <div className="stack">
            {state.services.length === 0 && <p>Nessun servizio registrato.</p>}
            {state.services.map(service => (
              <div className="history-row" key={service.id}>
                <strong>{service.status === 'active' ? 'In corso' : 'Completato'}</strong>
                <span>{service.km.toFixed(2)} km</span>
                <span>{formatDuration(service.startedAt, service.endedAt)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
