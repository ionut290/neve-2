import React, {useState} from 'react';
import {Alert, SafeAreaView, StyleSheet, Text, TextInput} from 'react-native';
import {PrimaryButton} from '../components/PrimaryButton';
import {login} from '../services/authService';
import {useSessionStore} from '../store/sessionStore';

export function LoginScreen() {
  const setCurrentUser = useSessionStore(state => state.setCurrentUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleLogin() {
    try {
      const user = await login(email.trim(), password);
      setCurrentUser(user);
    } catch (error) {
      Alert.alert('Accesso non riuscito', error instanceof Error ? error.message : 'Errore sconosciuto');
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Servizio Neve</Text>
      <TextInput autoCapitalize="none" keyboardType="email-address" placeholder="Email" style={styles.input} value={email} onChangeText={setEmail} />
      <TextInput placeholder="Password" secureTextEntry style={styles.input} value={password} onChangeText={setPassword} />
      <PrimaryButton title="ACCEDI" onPress={handleLogin} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', padding: 24, gap: 16, backgroundColor: '#ecfeff'},
  title: {fontSize: 34, fontWeight: '800', color: '#0f172a', marginBottom: 16},
  input: {backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', padding: 14},
});
