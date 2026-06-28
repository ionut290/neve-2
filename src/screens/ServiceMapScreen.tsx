import React, {useState} from 'react';
import {Alert, SafeAreaView, StyleSheet, Text, View} from 'react-native';
import MapView, {Polyline} from 'react-native-maps';
import {PrimaryButton} from '../components/PrimaryButton';
import {startSnowService, stopSnowService} from '../services/locationService';
import {useSessionStore} from '../store/sessionStore';

const demoRoute = [
  {latitude: 45.0703, longitude: 7.6869},
  {latitude: 45.073, longitude: 7.69},
  {latitude: 45.075, longitude: 7.695},
];

export function ServiceMapScreen() {
  const user = useSessionStore(state => state.currentUser);
  const [active, setActive] = useState(false);
  const [serviceContext, setServiceContext] = useState();

  async function start() {
    if (!user?.aziendaId || !user?.tecnicoId || !user?.operatoreId) {
      Alert.alert('Profilo incompleto', 'Operatore non collegato a un tecnico.');
      return;
    }
    const context = {
      aziendaId: user.aziendaId,
      tecnicoId: user.tecnicoId,
      operatoreId: user.operatoreId,
      progettoNeveId: 'progetto-demo',
      percorsoId: 'percorso-demo',
      servizioNeveId: `${user.operatoreId}-${Date.now()}`,
    };
    setServiceContext(context);
    await startSnowService(context);
    setActive(true);
  }

  async function stop() {
    await stopSnowService(serviceContext, 'Servizio completato da app mobile');
    setActive(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <MapView style={styles.map} initialRegion={{latitude: 45.073, longitude: 7.69, latitudeDelta: 0.04, longitudeDelta: 0.04}}>
        <Polyline coordinates={demoRoute} strokeColor="#0f766e" strokeWidth={5} />
      </MapView>
      <View style={styles.panel}>
        <Text style={styles.title}>Mappa Servizio</Text>
        <Text>{active ? 'Servizio neve attivo - GPS in corso' : 'Pronto per iniziare il servizio neve.'}</Text>
        <PrimaryButton title="INIZIA SERVIZIO NEVE" onPress={start} />
        <PrimaryButton title="FINE SERVIZIO" variant="danger" onPress={stop} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  map: {flex: 1},
  panel: {padding: 16, gap: 12, backgroundColor: '#fff'},
  title: {fontSize: 22, fontWeight: '800'},
});
