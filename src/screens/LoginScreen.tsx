import {useState} from 'react';
import {PrimaryButton} from '../components/PrimaryButton';
import {login} from '../services/authService';
import {useSessionStore} from '../store/sessionStore';

export function LoginScreen() {
  const setCurrentUser = useSessionStore(state => state.setCurrentUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();

  async function handleLogin(event?: {preventDefault: () => void}) {
    event?.preventDefault();
    try {
      setError(undefined);
      const user = await login(email.trim(), password);
      setCurrentUser(user);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Errore sconosciuto');
    }
  }

  return (
    <main className="auth-page">
      <form className="panel auth-panel" onSubmit={handleLogin}>
        <p className="eyebrow">Servizio neve</p>
        <h1>Accedi alla webapp</h1>
        <label>
          Email
          <input autoComplete="email" type="email" value={email} onChange={(event: any) => setEmail(event.target.value)} />
        </label>
        <label>
          Password
          <input autoComplete="current-password" type="password" value={password} onChange={(event: any) => setPassword(event.target.value)} />
        </label>
        {error && <p className="error">{error}</p>}
        <PrimaryButton title="ACCEDI" onPress={() => void handleLogin()} />
      </form>
    </main>
  );
}
