import React from 'react';
import {SafeAreaView, StyleSheet, Text, View} from 'react-native';
import {PrimaryButton} from '../components/PrimaryButton';
import {creaProgettoNeve} from '../services/projectService';
import {useSessionStore} from '../store/sessionStore';

export function TechnicianDashboardScreen() {
  const user = useSessionStore(state => state.currentUser);

  async function creaDemo() {
    if (!user?.aziendaId || !user.tecnicoId) return;
    await creaProgettoNeve({aziendaId: user.aziendaId, tecnicoId: user.tecnicoId, nome: 'Nuovo progetto neve'});
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Dashboard Tecnico</Text>
      <View style={styles.card}>
        <Text style={styles.subtitle}>Gestione progetto neve</Text>
        <Text>Crea progetto, carica o correggi percorsi GPS, assegna operatori e consulta storico servizi.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.subtitle}>Mappa live operatori</Text>
        <Text>Le posizioni in tempo reale arrivano dalla collection posizioniLive filtrata per aziendaId e tecnicoId.</Text>
      </View>
      <PrimaryButton title="CREA PROGETTO NEVE" onPress={creaDemo} />
      <PrimaryButton title="ESPORTA REPORT" onPress={() => undefined} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, padding: 20, gap: 14, backgroundColor: '#f8fafc'},
  title: {fontSize: 28, fontWeight: '800'},
  subtitle: {fontSize: 18, fontWeight: '700', marginBottom: 8},
  card: {backgroundColor: '#fff', padding: 16, borderRadius: 12},
});
