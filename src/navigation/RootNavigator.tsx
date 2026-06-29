import {useState} from 'react';
import {LoginScreen} from '../screens/LoginScreen';
import {OperatorDashboardScreen} from '../screens/OperatorDashboardScreen';
import {ServiceMapScreen} from '../screens/ServiceMapScreen';
import {TechnicianDashboardScreen} from '../screens/TechnicianDashboardScreen';
import {useSessionStore} from '../store/sessionStore';

export type RouteName = 'OperatorDashboard' | 'TechnicianDashboard' | 'ServiceMap';

export function RootNavigator() {
  const user = useSessionStore(state => state.currentUser);
  const [route, setRoute] = useState<RouteName>('OperatorDashboard');

  if (!user) {
    return <LoginScreen />;
  }

  if (route === 'ServiceMap') {
    return <ServiceMapScreen onBack={() => setRoute(user.ruolo === 'operatore' ? 'OperatorDashboard' : 'TechnicianDashboard')} />;
  }

  if (user.ruolo === 'operatore' || route === 'OperatorDashboard') {
    return <OperatorDashboardScreen onOpenMap={() => setRoute('ServiceMap')} />;
  }

  return <TechnicianDashboardScreen onOpenMap={() => setRoute('ServiceMap')} />;
}
