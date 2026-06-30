import {useState} from 'react';
import {PrimaryButton} from '../components/PrimaryButton';
import {getFirebaseConfigError} from '../firebase/config';
import {login, loginWithGoogle, mapAuthError} from '../services/authService';
import {useSessionStore} from '../store/sessionStore';

export function LoginScreen({onShowRegister}: {onShowRegister: () => void}) {
  const setCurrentUser = useSessionStore(state => state.setCurrentUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>();
  const configError = getFirebaseConfigError();

  async function handleGoogleLogin() {
    if (configError) return;
    try {
      setError(undefined);
      const user = await loginWithGoogle();
      if (user) setCurrentUser(user);
    } catch (loginError) {
      setError(mapAuthError(loginError));
    }
  }

  async function handleLogin(event?: {preventDefault: () => void}) {
    event?.preventDefault();
    if (configError) {
      return;
    }

    try {
      setError(undefined);
      const user = await login(email.trim(), password);
      setCurrentUser(user);
    } catch (loginError) {
      setError(mapAuthError(loginError));
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
        {(configError || error) && <p className="error">{configError ?? error}</p>}
        <PrimaryButton onClick={() => void handleGoogleLogin()} disabled={Boolean(configError)}>ACCEDI CON GOOGLE</PrimaryButton>
        <PrimaryButton variant="secondary" onClick={() => void handleLogin()} disabled={Boolean(configError)}>ACCEDI CON EMAIL</PrimaryButton>
        <button className="link-button" type="button" onClick={onShowRegister}>Non hai un account? Registrati</button>
      </form>
    </main>
  );
}
