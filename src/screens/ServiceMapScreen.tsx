import {useState} from 'react';
import {PrimaryButton} from '../components/PrimaryButton';
import {startSnowService, stopSnowService} from '../services/locationService';
import {useSessionStore} from '../store/sessionStore';
import {ActiveServiceContext} from '../services/locationService';

type Props = {onBack: () => void};

const demoRouteSvgPoints = '18,72 36,58 52,48 70,40 84,28';

export function ServiceMapScreen({onBack}: Props) {
  const user = useSessionStore(state => state.currentUser);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState('Pronto per iniziare il servizio neve.');
  const [serviceContext, setServiceContext] = useState<ActiveServiceContext>();

  async function start() {
    if (!user?.aziendaId || !user?.tecnicoId) {
      setMessage('Profilo incompleto: operatore non collegato a un tecnico.');
      return;
    }
    const context = {
      aziendaId: user.aziendaId,
      tecnicoId: user.tecnicoId,
      operatoreId: user.uid,
      progettoNeveId: 'progetto-demo',
      percorsoId: 'percorso-demo',
      servizioNeveId: `${user.uid}-${Date.now()}`,
    };
    setServiceContext(context);
    await startSnowService(context);
    setActive(true);
    setMessage('Servizio neve attivo: GPS browser in corso. Mantieni aperta la scheda per continuare il tracking web.');
  }

  async function stop() {
    await stopSnowService(serviceContext, 'Servizio completato da webapp');
    setActive(false);
    setMessage('Servizio terminato. Km e durata sono stati salvati nello storico.');
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Mappa</p>
          <h1>Mappa Servizio</h1>
        </div>
        <button className="link-button" onClick={onBack} type="button">Torna alla dashboard</button>
      </header>

      <section className="map-layout">
        <div className="map-card" role="img" aria-label="Percorso neve dimostrativo">
          <svg viewBox="0 0 100 100" className="map-svg">
            <rect width="100" height="100" rx="6" fill="#e0f2fe" />
            <path d="M10 70 C 30 60, 40 30, 58 42 S 75 72, 90 25" fill="none" stroke="#94a3b8" strokeWidth="10" strokeLinecap="round" />
            <polyline points={demoRouteSvgPoints} vectorEffect="non-scaling-stroke" fill="none" stroke="#0f766e" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="55" cy="55" r="4" fill={active ? '#16a34a' : '#64748b'} />
          </svg>
        </div>
        <aside className="panel service-panel">
          <h2>Controllo servizio</h2>
          <p>{message}</p>
          <PrimaryButton onClick={() => void start()} disabled={active}>INIZIA SERVIZIO NEVE</PrimaryButton>
          <PrimaryButton variant="danger" onClick={() => void stop()} disabled={!active}>FINE SERVIZIO</PrimaryButton>
        </aside>
      </section>
    </main>
  );
}
