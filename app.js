import { auth, onAuthStateChanged } from './firebase.js';
import { getUserProfile, login, logout, register } from './auth.js';

const app = document.getElementById('app');
const state = { user: null, profile: null, loading: true };
const html = String.raw;

const dashboardByRole = {
  admin: {
    title: 'Admin dashboard',
    text: 'Base pronta per creare aziende, abilitare utenti, assegnare ruoli e collegare operatori a un tecnico.',
    features: ['Aziende', 'Utenti in attesa', 'Ruoli e collegamenti'],
  },
  tecnico: {
    title: 'Tecnico dashboard',
    text: 'Base pronta per creare percorsi neve, correggerli sulla mappa e assegnarli agli operatori collegati.',
    features: ['Percorsi neve', 'Mappa Leaflet/OpenStreetMap', 'Operatori collegati'],
  },
  operatore: {
    title: 'Operatore dashboard',
    text: 'Base pronta per aprire i percorsi assegnati, avviare/interrompere il servizio e registrare note, foto e punti GPS.',
    features: ['Percorsi assegnati', 'Servizio attivo', 'Note, foto e GPS'],
  },
};

onAuthStateChanged(auth, async (user) => {
  state.user = user;
  state.profile = user ? await getUserProfile(user.uid) : null;
  state.loading = false;
  render();
});

function shell(content, status = 'PWA pronta per telefono, tablet e desktop.') {
  app.innerHTML = html`
    <section class="hero card">
      <div>
        <span class="pill">PWA multi-azienda</span>
        <h1>Servizio Neve</h1>
        <p class="muted">Gestione percorsi neve, tecnici e operatori con Firebase Authentication, Firestore, Storage e mappe Leaflet/OpenStreetMap.</p>
      </div>
      <div class="notice">${status}</div>
    </section>
    ${content}`;
}

function render() {
  if (state.loading) return shell('<section class="card"><p>Caricamento...</p></section>', 'Caricamento profilo in corso.');
  if (!state.user) return renderAuth();
  if (!state.profile?.abilitato) return renderWaiting();
  return renderDashboard();
}

function renderAuth(mode = 'login') {
  shell(html`
    <section class="grid two auth-grid">
      <article class="card stack">
        <h2>${mode === 'login' ? 'Login' : 'Registrazione'}</h2>
        <p class="muted">Ogni utente accede con email e password. Dopo la registrazione l’account resta disabilitato finché un admin lo abilita.</p>
        <div class="tabs">
          <button id="showLogin" class="${mode === 'login' ? '' : 'secondary'}">Login</button>
          <button id="showRegister" class="${mode === 'register' ? '' : 'secondary'}">Registrazione</button>
        </div>
      </article>
      <article class="card stack">
        <form id="authForm" class="stack">
          ${mode === 'register' ? '<label>Nome e cognome<input name="nome" autocomplete="name" required></label>' : ''}
          <label>Email<input name="email" type="email" autocomplete="email" required></label>
          <label>Password<input name="password" type="password" autocomplete="current-password" minlength="6" required></label>
          <button>${mode === 'login' ? 'Accedi' : 'Registrati'}</button>
        </form>
        <p id="authMessage" class="error" role="alert"></p>
      </article>
    </section>`, 'Accedi o crea un account operatore in attesa di abilitazione.');

  document.getElementById('showLogin').onclick = () => renderAuth('login');
  document.getElementById('showRegister').onclick = () => renderAuth('register');
  document.getElementById('authForm').onsubmit = async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    await safe(async () => {
      if (mode === 'register') await register(data);
      else await login(data.email, data.password);
    });
  };
}

function renderWaiting() {
  shell(html`
    <section class="card stack waiting-card">
      <span class="pill">Account in attesa</span>
      <h2>Account in attesa di abilitazione da parte dell’amministratore.</h2>
      <p class="muted">Il documento utente è stato creato in Firestore con ruolo <b>operatore</b> e <b>abilitato: false</b>. Un admin dovrà assegnare azienda e ruolo prima dell’accesso alla dashboard.</p>
      <button id="logoutBtn" class="secondary">Esci</button>
    </section>`, 'Registrazione completata. Attendi l’abilitazione admin.');
  document.getElementById('logoutBtn').onclick = logout;
}

function renderDashboard() {
  const dashboard = dashboardByRole[state.profile.ruolo] || dashboardByRole.operatore;
  shell(html`
    <section class="card stack">
      <div class="dashboard-head">
        <div>
          <span class="pill">${state.profile.nome || state.profile.email}</span>
          <h2>${dashboard.title}</h2>
          <p class="muted">${dashboard.text}</p>
        </div>
        <button id="logoutBtn" class="secondary">Esci</button>
      </div>
      <div class="grid three">
        ${dashboard.features.map((feature) => `<article class="item"><strong>${feature}</strong><p class="muted">Funzione vuota prevista nella prossima fase.</p></article>`).join('')}
      </div>
    </section>`, `Accesso effettuato come ${state.profile.ruolo}.`);
  document.getElementById('logoutBtn').onclick = logout;
}

async function safe(action) {
  try {
    await action();
  } catch (error) {
    console.error(error);
    const message = document.getElementById('authMessage');
    if (message) message.textContent = error.message || 'Operazione non riuscita.';
    else alert(error.message || 'Operazione non riuscita.');
  }
}
