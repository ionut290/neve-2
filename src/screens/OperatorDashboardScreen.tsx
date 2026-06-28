import React, {useEffect, useState} from 'react';
import {SafeAreaView, StyleSheet, Text, TextInput, View} from 'react-native';
import {PrimaryButton} from '../components/PrimaryButton';
import {collegaOperatoreATecnico} from '../services/authService';
import {useSessionStore} from '../store/sessionStore';

export function OperatorDashboardScreen({navigation}: any) {
  const user = useSessionStore(state => state.currentUser);
  const [codiceTecnico, setCodiceTecnico] = useState('');
  const [status, setStatus] = useState('Percorsi assegnati sincronizzati da Firestore.');

  async function collegaTecnico() {
    if (!user?.operatoreId || !user.aziendaId) return;
    await collegaOperatoreATecnico({operatoreId: user.operatoreId, aziendaId: user.aziendaId, codiceTecnico});
    setStatus('Operatore collegato al tecnico.');
  }

  useEffect(() => {
    setStatus('Vedi i percorsi assegnati e avvia il servizio quando sei sul mezzo.');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Dashboard Operatore</Text>
      <Text style={styles.card}>{status}</Text>
      <TextInput placeholder="Codice tecnico" style={styles.input} value={codiceTecnico} onChangeText={setCodiceTecnico} />
      <PrimaryButton title="COLLEGATI AL TECNICO" onPress={collegaTecnico} />
      <View style={styles.section}>
        <Text style={styles.subtitle}>Percorsi assegnati</Text>
        <Text>Apri la mappa percorso, inizia il tracciamento GPS e completa il servizio con km, durata, note e foto.</Text>
      </View>
      <PrimaryButton title="APRI MAPPA PERCORSO" onPress={() => navigation.navigate('ServiceMap')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 20, gap: 14, backgroundColor: '#f8fafc'},
  title: {fontSize: 28, fontWeight: '800'},
  subtitle: {fontSize: 18, fontWeight: '700', marginBottom: 8},
  card: {backgroundColor: '#fff', padding: 16, borderRadius: 12},
  input: {backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', padding: 14},
  section: {backgroundColor: '#fff', padding: 16, borderRadius: 12},
});
