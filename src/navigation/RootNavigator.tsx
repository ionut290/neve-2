import {useEffect, useState} from 'react';
import {LoginScreen} from '../screens/LoginScreen';
import {RegisterScreen} from '../screens/RegisterScreen';
import {OperatorDashboardScreen} from '../screens/OperatorDashboardScreen';
import {ServiceMapScreen} from '../screens/ServiceMapScreen';
import {TechnicianDashboardScreen} from '../screens/TechnicianDashboardScreen';
import {PENDING_GOOGLE_MESSAGE, handleGoogleRedirectResult, subscribeToAuth} from '../services/authService';
import {useSessionStore} from '../store/sessionStore';

export type RouteName = 'OperatorDashboard' | 'TechnicianDashboard' | 'ServiceMap';

export function RootNavigator() {
  const user = useSessionStore(state => state.currentUser);
  const setCurrentUser = useSessionStore(state => state.setCurrentUser);
  const [route, setRoute] = useState<RouteName>('OperatorDashboard');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authMessage, setAuthMessage] = useState('Controllo sessione...');

  useEffect(() => {
    void handleGoogleRedirectResult()
      .then(profile => {
        if (profile?.enabled === false || profile?.role === 'pending') setAuthMessage(PENDING_GOOGLE_MESSAGE);
      })
      .catch(error => setAuthMessage(error instanceof Error ? error.message : 'Accesso Google non riuscito.'));

    return subscribeToAuth(profile => {
      if (!profile || (profile.enabled !== true && profile.stato !== 'abilitato')) {
        setCurrentUser(undefined);
        setAuthMessage(profile?.stato === 'in_attesa' || profile?.enabled === false ? PENDING_GOOGLE_MESSAGE : profile?.stato === 'bloccato' ? 'Il tuo account è bloccato. Contatta un admin.' : '');
        return;
      }
      setCurrentUser(profile);
      setAuthMessage('');
    }, setAuthMessage);
  }, [setCurrentUser]);

  if (!user) {
    return <>{authMode === 'login' ? <LoginScreen onShowRegister={() => setAuthMode('register')} /> : <RegisterScreen onShowLogin={() => setAuthMode('login')} />}{authMessage && <p className="auth-message">{authMessage}</p>}</>;
  }

  if (route === 'ServiceMap') {
    return <ServiceMapScreen onBack={() => setRoute(user.ruolo === 'operatore' ? 'OperatorDashboard' : 'TechnicianDashboard')} />;
  }

  if (user.ruolo === 'operatore' || route === 'OperatorDashboard') {
    return <OperatorDashboardScreen onOpenMap={() => setRoute('ServiceMap')} />;
  }

  return <TechnicianDashboardScreen onOpenMap={() => setRoute('ServiceMap')} />;
}
