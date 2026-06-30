import {useEffect, useState} from 'react';
import {PrimaryButton} from '../components/PrimaryButton';
import {collegaOperatoreATecnico, logout} from '../services/authService';
import {useSessionStore} from '../store/sessionStore';

type Props = {onOpenMap: () => void};

export function OperatorDashboardScreen({onOpenMap}: Props) {
  const user = useSessionStore(state => state.currentUser);
  const setCurrentUser = useSessionStore(state => state.setCurrentUser);
  const [tecnicoId, setTecnicoId] = useState('');
  const [status, setStatus] = useState('Percorsi assegnati sincronizzati da Firestore.');

  async function collegaTecnico() {
    if (!user?.uid || !user.aziendaId) return;
    await collegaOperatoreATecnico({operatoreId: user.uid, aziendaId: user.aziendaId, tecnicoId});
    setStatus('Operatore collegato al tecnico.');
  }

  async function handleLogout() {
    await logout();
    setCurrentUser(undefined);
  }

  useEffect(() => {
    setStatus('Vedi i percorsi assegnati e avvia il servizio quando sei sul mezzo.');
  }, []);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Operatore</p>
          <h1>Dashboard Operatore</h1>
        </div>
        <button className="link-button" onClick={() => void handleLogout()} type="button">Esci</button>
      </header>

      <section className="grid two-columns">
        <article className="panel">
          <h2>Collegamento tecnico</h2>
          <p>{status}</p>
          <label>
            Tecnico ID
            <input value={tecnicoId} onChange={(event: any) => setTecnicoId(event.target.value)} placeholder="Es. TEC-1234" />
          </label>
          <PrimaryButton onClick={() => void collegaTecnico()}>COLLEGATI AL TECNICO</PrimaryButton>
        </article>

        <article className="panel">
          <h2>Percorsi assegnati</h2>
          <p>Apri la mappa percorso, inizia il tracciamento GPS dal browser e completa il servizio con km, durata, note e foto.</p>
          <PrimaryButton onClick={onOpenMap}>APRI MAPPA PERCORSO</PrimaryButton>
        </article>
      </section>
    </main>
  );
}
