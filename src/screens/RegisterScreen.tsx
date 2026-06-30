import {useState} from 'react';
import {PrimaryButton} from '../components/PrimaryButton';
import {getFirebaseConfigError} from '../firebase/config';
import {mapAuthError, register, registerWithGoogle} from '../services/authService';
import {UserRole} from '../types/domain';

type Props = {onShowLogin: () => void};

export function RegisterScreen({onShowLogin}: Props) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ruolo, setRuolo] = useState<UserRole>('operatore');
  const [aziendaId, setAziendaId] = useState('');
  const [tecnicoId, setTecnicoId] = useState('');
  const [message, setMessage] = useState<string>();
  const configError = getFirebaseConfigError();

  async function handleGoogleRegister() {
    if (configError) return;
    try {
      setMessage(undefined);
      await registerWithGoogle({ruolo, aziendaId: aziendaId.trim(), tecnicoId: tecnicoId.trim() || undefined});
      setMessage('Registrazione Google completata. Il tuo account è in attesa: solo un admin può abilitarlo.');
    } catch (error) {
      setMessage(mapAuthError(error));
    }
  }

  async function handleRegister(event?: {preventDefault: () => void}) {
    event?.preventDefault();
    if (configError) return;
    try {
      setMessage(undefined);
      await register({nome: nome.trim(), email: email.trim(), password, ruolo, aziendaId: aziendaId.trim(), tecnicoId: tecnicoId.trim() || undefined});
      setMessage('Registrazione completata. Il tuo account è in attesa: solo un admin può abilitarlo.');
    } catch (error) {
      setMessage(mapAuthError(error));
    }
  }

  return (
    <main className="auth-page">
      <form className="panel auth-panel" onSubmit={handleRegister}>
        <p className="eyebrow">Servizio Neve</p>
        <h1>Registrazione</h1>
        <label>Nome<input required value={nome} onChange={(event: any) => setNome(event.target.value)} /></label>
        <label>Email<input required autoComplete="email" type="email" value={email} onChange={(event: any) => setEmail(event.target.value)} /></label>
        <label>Password<input required autoComplete="new-password" minLength={6} type="password" value={password} onChange={(event: any) => setPassword(event.target.value)} /></label>
        <label>Ruolo richiesto<select value={ruolo} onChange={(event: any) => setRuolo(event.target.value)}><option value="operatore">Operatore</option><option value="tecnico">Tecnico</option><option value="admin">Admin</option></select></label>
        <label>Azienda ID<input required value={aziendaId} onChange={(event: any) => setAziendaId(event.target.value)} placeholder="es. azienda-rossi" /></label>
        <label>Tecnico ID {ruolo === 'operatore' ? '(richiesto se già noto)' : '(solo operatori)'}<input value={tecnicoId} onChange={(event: any) => setTecnicoId(event.target.value)} /></label>
        {(configError || message) && <p className={message?.includes('completata') ? 'success' : 'error'}>{configError ?? message}</p>}
        <PrimaryButton onClick={() => void handleGoogleRegister()} disabled={Boolean(configError)}>REGISTRATI CON GOOGLE</PrimaryButton>
        <PrimaryButton variant="secondary" onClick={() => void handleRegister()} disabled={Boolean(configError)}>REGISTRATI CON EMAIL</PrimaryButton>
        <button className="link-button" type="button" onClick={onShowLogin}>Hai già un account? Accedi</button>
      </form>
    </main>
  );
}
