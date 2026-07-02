import {useEffect, useState} from 'react';
import {OperatorDashboardScreen} from '../screens/OperatorDashboardScreen';
import {ServiceMapScreen} from '../screens/ServiceMapScreen';
import {TechnicianDashboardScreen} from '../screens/TechnicianDashboardScreen';
import {useSessionStore} from '../store/sessionStore';
import {Utente} from '../types/domain';

export type RouteName = 'OperatorDashboard' | 'TechnicianDashboard' | 'ServiceMap';

const PUBLIC_USER: Utente = {
  uid: 'accesso-libero',
  nome: 'Accesso libero',
  email: 'pubblico@servizio-neve.local',
  ruolo: 'operatore',
  role: 'operatore',
  enabled: true,
  aziendaId: 'demo',
  tecnicoId: 'demo-tecnico',
  stato: 'abilitato',
  createdAt: new Date(0),
};

export function RootNavigator() {
  const user = useSessionStore(state => state.currentUser);
  const setCurrentUser = useSessionStore(state => state.setCurrentUser);
  const [route, setRoute] = useState<RouteName>('OperatorDashboard');

  useEffect(() => {
    setCurrentUser(PUBLIC_USER);
  }, [setCurrentUser]);

  const activeUser = user ?? PUBLIC_USER;

  if (route === 'ServiceMap') {
    return <ServiceMapScreen onBack={() => setRoute(activeUser.ruolo === 'operatore' ? 'OperatorDashboard' : 'TechnicianDashboard')} />;
  }

  if (activeUser.ruolo === 'operatore' || route === 'OperatorDashboard') {
    return <OperatorDashboardScreen onOpenMap={() => setRoute('ServiceMap')} />;
  }

  return <TechnicianDashboardScreen onOpenMap={() => setRoute('ServiceMap')} />;
}
