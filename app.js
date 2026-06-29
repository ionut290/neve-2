import { auth, isFirebaseConfigured, onAuthStateChanged, ref, storage, uploadBytes, getDownloadURL } from './firebase.js';
import { BOOTSTRAP_SUPER_ADMIN_EMAIL, BOOTSTRAP_SUPER_ADMIN_NAME, getUserProfile, login, logout, register, ROLES } from './auth.js';
import {
  assignOperator,
  appendGpsPoint,
  createProject,
  finishService,
  linkOperatorToTechnician,
  saveRoute,
  startService,
  subscribeOperators,
  subscribeProjects,
  subscribeRoute,
} from './firestore.js';
import { drawLivePoint, drawRoute, initMap, parseRouteText } from './map.js';

const state = { user: null, profile: null, projects: [], operators: [], selectedProject: null, route: null, session: null, watchId: null, startedAt: null };
const app = document.getElementById('app');

const roleLabels = { super_admin: 'Super Admin', azienda_admin: 'Admin azienda', tecnico: 'Tecnico', operatore: 'Operatore' };
const html = String.raw;

onAuthStateChanged(auth, async (user) => {
  state.user = user;
  state.profile = user ? await getUserProfile(user.uid) : null;
  if (state.profile?.role === 'operatore') state.profile = await linkOperatorToTechnician(state.profile);
  render();
  if (state.profile) bindRealtime();
});

let unsubscribeProjects = () => {};
let unsubscribeOperators = () => {};
let unsubscribeRoute = () => {};
function bindRealtime() {
  unsubscribeProjects(); unsubscribeOperators(); unsubscribeRoute();
  unsubscribeProjects = subscribeProjects(state.profile, (projects) => { state.projects = projects; state.selectedProject ||= projects[0] || null; renderDashboard(); });
  if (state.profile.role === 'tecnico') unsubscribeOperators = subscribeOperators(state.profile, (operators) => { state.operators = operators; renderDashboard(); });
}

function render() {
  if (!state.profile) return renderAuth();
  app.innerHTML = html`
    <header class="topbar">
      <div class="brand"><span class="logo">❄️</span><div>Servizio Neve<br><span class="muted small">${roleLabels[state.profile.role]}</span></div></div>
      <button class="secondary" id="logoutBtn">Esci</button>
    </header>
    <main id="dashboard"></main>`;
  document.getElementById('logoutBtn').onclick = logout;
  renderDashboard();
}

function renderAuth() {
  app.innerHTML = html`
    <main class="grid two hero">
      <section class="card stack">
        <span class="pill">WebApp / PWA</span>
        <h1>Servizio Neve</h1>
        <p class="muted">Gestione multi azienda per progetti neve, percorsi, operatori e storico servizi con Firebase e Leaflet/OpenStreetMap.</p>
        ${!isFirebaseConfigured ? '<div class="warning">Modalità demo locale attiva: configura Firebase in firebase.js per usare cloud, Auth, Firestore e Storage reali.</div>' : ''}<div class="warning">Per registrare correttamente il percorso, tieni l'app aperta durante il servizio.</div>
      </section>
      <section class="card stack">
        <div class="tabs"><button id="showLogin" aria-pressed="true">Login</button><button id="showRegister" class="secondary">Registrazione</button></div>
        <div id="authForm"></div>
        <p id="authError" class="error"></p>
      </section>
    </main>`;
  showLogin();
  document.getElementById('showLogin').onclick = showLogin;
  document.getElementById('showRegister').onclick = showRegister;
}

function showLogin() {
  document.getElementById('authForm').innerHTML = html`<form id="loginForm" class="stack"><label>Email<input name="email" type="email" required></label><label>Password<input name="password" type="password" required></label><button>Entra</button></form>`;
  document.getElementById('loginForm').onsubmit = async (event) => { event.preventDefault(); await safe(() => login(event.target.email.value, event.target.password.value)); };
}

function showRegister() {
  document.getElementById('authForm').innerHTML = html`
    <form id="registerForm" class="stack">
      <label>Nome<input name="displayName" required></label><label>Email<input name="email" type="email" required></label><label>Password<input name="password" type="password" minlength="6" required></label>
      <label>Ruolo<select name="role" id="roleSelect">${ROLES.map((r) => `<option value="${r}">${roleLabels[r]}</option>`).join('')}</select></label>
      <p class="muted small" id="superAdminHint">${BOOTSTRAP_SUPER_ADMIN_NAME} (${BOOTSTRAP_SUPER_ADMIN_EMAIL}) viene sempre registrato come Super Admin.</p>
      <label>ID azienda<input name="companyId" placeholder="es. azienda-alpi"></label><label>Codice tecnico<input name="codiceTecnico" placeholder="per tecnico o operatore"></label>
      <button>Crea account</button>
    </form>`;
  const registerForm = document.getElementById('registerForm');
  registerForm.email.addEventListener('input', () => {
    if (registerForm.email.value.trim().toLowerCase() === BOOTSTRAP_SUPER_ADMIN_EMAIL) {
      registerForm.role.value = 'super_admin';
    }
  });
  registerForm.onsubmit = async (event) => { event.preventDefault(); await safe(() => register(Object.fromEntries(new FormData(event.target)))); };
}

function renderDashboard() {
  const root = document.getElementById('dashboard');
  if (!root || !state.profile) return;
  if (state.profile.role === 'tecnico') return renderTechnician(root);
  if (state.profile.role === 'operatore') return renderOperator(root);
  return renderAdmin(root);
}

function renderAdmin(root) {
  root.innerHTML = html`<section class="grid"><div class="card stack"><h2>Dashboard ${roleLabels[state.profile.role]}</h2><p class="muted">Vista limitata ${state.profile.role === 'super_admin' ? 'a tutte le aziende' : `all'azienda ${state.profile.companyId}`}.</p><div class="list">${state.projects.map(projectCard).join('') || '<p>Nessun progetto.</p>'}</div></div></section>`;
}

function renderTechnician(root) {
  root.innerHTML = html`<section class="grid two"><div class="card stack"><h2>Crea progetto neve</h2><p class="muted">Codice tecnico: <b>${state.profile.codiceTecnico}</b></p><form id="projectForm" class="stack"><label>Nome progetto<input name="name" required></label><label>Zona<input name="area" required></label><label>Note<textarea name="notes"></textarea></label><button>Crea progetto</button></form><h2>Progetti</h2><div class="list">${state.projects.map(projectCard).join('') || '<p>Nessun progetto.</p>'}</div></div><div class="card stack"><h2>Percorso e operatori</h2>${technicianDetail()}</div></section>`;
  document.getElementById('projectForm').onsubmit = async (e) => { e.preventDefault(); await safe(() => createProject(state.profile, new FormData(e.target))); e.target.reset(); };
  document.querySelectorAll('[data-select-project]').forEach((b) => b.onclick = () => { state.selectedProject = state.projects.find((p) => p.id === b.dataset.selectProject); renderDashboard(); });
  document.getElementById('routeForm')?.addEventListener('submit', async (e) => { e.preventDefault(); await safe(() => saveRoute(state.profile, state.selectedProject.id, parseRouteText(e.target.route.value), true)); });
  document.getElementById('assignForm')?.addEventListener('submit', async (e) => { e.preventDefault(); await safe(() => assignOperator(state.selectedProject.id, e.target.operatorId.value)); });
  initMap('map');
  if (state.selectedProject?.routeId) subscribeRoute(state.selectedProject.routeId, (route) => { state.route = route; drawRoute(route?.points || []); });
}

function technicianDetail() {
  const p = state.selectedProject;
  if (!p) return '<p>Seleziona o crea un progetto.</p><div id="map" class="map"></div>';
  return html`<h3>${p.name}</h3><div id="map" class="map"></div><form id="routeForm" class="stack"><label>Carica/correggi percorso<textarea name="route" placeholder="Una coordinata per riga: 45.4642,9.1900"></textarea></label><button>Salva percorso</button></form><form id="assignForm" class="stack"><label>Assegna operatore<select name="operatorId">${state.operators.map((o) => `<option value="${o.uid}">${o.displayName || o.email}</option>`).join('')}</select></label><button ${state.operators.length ? '' : 'disabled'}>Assegna</button></form>`;
}

function renderOperator(root) {
  const projects = state.projects.filter((p) => (p.assignedOperatorIds || []).includes(state.profile.uid));
  const selected = state.selectedProject && projects.some((p) => p.id === state.selectedProject.id) ? state.selectedProject : projects[0];
  state.selectedProject = selected || null;
  root.innerHTML = html`<section class="grid two"><div class="card stack"><h2>Dashboard operatore</h2><div class="warning">Per registrare correttamente il percorso, tieni l'app aperta durante il servizio.</div><p class="muted">Tecnico collegato: ${state.profile.linkedTechnicianCode || 'non collegato'}</p><div class="list">${projects.map(projectCard).join('') || '<p>Nessun percorso assegnato.</p>'}</div><div class="row"><button id="startBtn" ${selected && !state.session ? '' : 'disabled'}>INIZIA SERVIZIO</button><button id="finishBtn" class="danger" ${state.session ? '' : 'disabled'}>FINE SERVIZIO</button></div><label>Note servizio<textarea id="serviceNotes"></textarea></label><label>Foto<input id="servicePhotos" type="file" accept="image/*" multiple></label></div><div class="card stack"><h2>Percorso assegnato</h2><div id="map" class="map"></div></div></section>`;
  document.querySelectorAll('[data-select-project]').forEach((b) => b.onclick = () => { state.selectedProject = projects.find((p) => p.id === b.dataset.selectProject); renderDashboard(); });
  document.getElementById('startBtn').onclick = () => beginService(selected);
  document.getElementById('finishBtn').onclick = endService;
  initMap('map');
  if (selected?.routeId) subscribeRoute(selected.routeId, (route) => { state.route = route; drawRoute(route?.points || []); });
}

async function beginService(project) {
  await safe(async () => {
    const sessionRef = await startService(state.profile, project);
    state.session = { id: sessionRef.id }; state.startedAt = Date.now();
    state.watchId = navigator.geolocation.watchPosition(async (pos) => {
      const point = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy, at: new Date().toISOString() };
      drawLivePoint(point); await appendGpsPoint(sessionRef.id, point);
    }, (error) => alert(`GPS non disponibile: ${error.message}`), { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
    renderDashboard();
  });
}

async function endService() {
  await safe(async () => {
    if (state.watchId) navigator.geolocation.clearWatch(state.watchId);
    const files = [...document.getElementById('servicePhotos').files];
    const photoUrls = [];
    for (const file of files) {
      const fileRef = ref(storage, `companies/${state.profile.companyId}/services/${state.session.id}/${Date.now()}-${file.name}`);
      await uploadBytes(fileRef, file); photoUrls.push(await getDownloadURL(fileRef));
    }
    await finishService(state.session.id, { durationSeconds: Math.round((Date.now() - state.startedAt) / 1000), notes: document.getElementById('serviceNotes').value, photoUrls });
    state.session = null; state.watchId = null; renderDashboard();
  });
}

function projectCard(p) {
  return `<article class="item"><strong>${p.name}</strong><p class="muted">${p.area || ''}</p><button class="secondary" data-select-project="${p.id}">Apri</button></article>`;
}

async function safe(action) {
  try { await action(); } catch (error) { console.error(error); const el = document.getElementById('authError'); if (el) el.textContent = error.message; else alert(error.message); }
}
