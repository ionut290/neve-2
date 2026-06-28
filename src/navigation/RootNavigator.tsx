import React from 'react';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {LoginScreen} from '../screens/LoginScreen';
import {OperatorDashboardScreen} from '../screens/OperatorDashboardScreen';
import {ServiceMapScreen} from '../screens/ServiceMapScreen';
import {TechnicianDashboardScreen} from '../screens/TechnicianDashboardScreen';
import {useSessionStore} from '../store/sessionStore';

export type RootStackParamList = {
  Login: undefined;
  OperatorDashboard: undefined;
  TechnicianDashboard: undefined;
  ServiceMap: undefined;
};

const Stack = createNativeStackNavigator();

export function RootNavigator() {
  const user = useSessionStore(state => state.currentUser);

  if (!user) {
    return <LoginScreen />;
  }

  const initialRouteName = user.ruolo === 'operatore' ? 'OperatorDashboard' : 'TechnicianDashboard';

  return (
    <Stack.Navigator initialRouteName={initialRouteName}>
      <Stack.Screen name="OperatorDashboard" component={OperatorDashboardScreen} options={{title: 'Operatore'}} />
      <Stack.Screen name="TechnicianDashboard" component={TechnicianDashboardScreen} options={{title: 'Tecnico'}} />
      <Stack.Screen name="ServiceMap" component={ServiceMapScreen} options={{title: 'Mappa servizio'}} />
    </Stack.Navigator>
  );
}
