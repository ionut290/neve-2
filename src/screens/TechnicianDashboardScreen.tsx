import {PrimaryButton} from '../components/PrimaryButton';
import {creaProgettoNeve} from '../services/projectService';
import {useSessionStore} from '../store/sessionStore';

type Props = {onOpenMap: () => void};

export function TechnicianDashboardScreen({onOpenMap}: Props) {
  const user = useSessionStore(state => state.currentUser);

  async function creaDemo() {
    if (!user?.aziendaId || !user.tecnicoId) return;
    await creaProgettoNeve({aziendaId: user.aziendaId, tecnicoId: user.tecnicoId, nome: 'Nuovo progetto neve'});
  }


  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Tecnico</p>
          <h1>Dashboard Tecnico</h1>
        </div>
        <span className="status-pill">Accesso libero</span>
      </header>

      <section className="grid three-columns">
        <article className="panel">
          <h2>Gestione progetto neve</h2>
          <p>Crea progetto, carica o correggi percorsi GPS e assegna operatori.</p>
          <PrimaryButton onClick={() => void creaDemo()}>CREA PROGETTO NEVE</PrimaryButton>
        </article>
        <article className="panel">
          <h2>Mappa live operatori</h2>
          <p>Le posizioni arrivano da posizioniLive filtrata per aziendaId e tecnicoId.</p>
          <PrimaryButton onClick={onOpenMap}>VEDI MAPPA LIVE</PrimaryButton>
        </article>
        <article className="panel">
          <h2>Storico e report</h2>
          <p>Consulta servizi completati ed esporta report operativi.</p>
          <PrimaryButton onClick={() => undefined}>ESPORTA REPORT</PrimaryButton>
        </article>
      </section>
    </main>
  );
}
