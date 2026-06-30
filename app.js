import {
  auth,
  collection,
  db,
  deleteDoc,
  doc,
  getDocs,
  isFirebaseConfigured,
  onAuthStateChanged,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from './firebase.js';
import { getUserProfile, login, logout, register } from './auth.js';

const app = document.getElementById('app');
const html = String.raw;
const adminRoles = ['admin', 'super_admin', 'azienda_admin'];
const userRoles = ['azienda_admin', 'tecnico', 'operatore'];
const projectStatuses = ['bozza', 'attivo', 'completato'];
const routePriorities = ['alta', 'media', 'bassa'];

const state = {
  user: null,
  profile: null,
  loading: true,
  aziende: [],
  utenti: [],
  progetti: [],
  percorsi: [],
  openProjectId: '',
  editingProjectId: '',
  editingRouteId: '',
  routeDraftPoints: [],
  map: null,
  mapLayer: null,
};

onAuthStateChanged(auth, async (user) => {
  state.user = user;
  state.profile = user ? await getUserProfile(user.uid) : null;
  state.loading = false;
  await loadDashboardData();
  render();
});

function isSuperAdmin() {
  return ['admin', 'super_admin'].includes(state.profile?.ruolo);
}

function canOpenAdminDashboard() {
  return adminRoles.includes(state.profile?.ruolo);
}

function canManageProjects() {
  return canOpenAdminDashboard() || state.profile?.ruolo === 'tecnico';
}

function currentUid() {
  return state.profile?.uid || state.user?.uid || '';
}

function visibleAziende() {
  if (isSuperAdmin()) return state.aziende;
  return state.aziende.filter((azienda) => azienda.id === state.profile?.aziendaId);
}

function visibleUtenti() {
  if (isSuperAdmin()) return state.utenti;
  return state.utenti.filter((utente) => utente.aziendaId === state.profile?.aziendaId);
}

function visibleTecnici(aziendaId = '') {
  return visibleUtenti().filter((utente) => utente.ruolo === 'tecnico' && (!aziendaId || utente.aziendaId === aziendaId));
}

function pendingUsers() {
  return visibleUtenti().filter((utente) => utente.abilitato === false);
}

function enabledUsers() {
  return visibleUtenti().filter((utente) => utente.abilitato === true && utente.ruolo !== 'operatore_in_attesa');
}

function visibleProjects() {
  if (isSuperAdmin()) return state.progetti;
  if (state.profile?.ruolo === 'azienda_admin') {
    return state.progetti.filter((progetto) => progetto.aziendaId === state.profile.aziendaId);
  }
  if (state.profile?.ruolo === 'tecnico') {
    return state.progetti.filter((progetto) => progetto.tecnicoId === currentUid());
  }
  return [];
}

function routesForProject(projectId) {
  return state.percorsi.filter((percorso) => percorso.progettoNeveId === projectId);
}

async function loadDashboardData() {
  state.aziende = [];
  state.utenti = [];
  state.progetti = [];
  state.percorsi = [];
  if (!state.profile?.abilitato) return;

  if (!isFirebaseConfigured) {
    const users = JSON.parse(localStorage.getItem('servizioNeve.users') || '{}');
    state.utenti = Object.values(users);
    state.aziende = readLocalList('servizioNeve.aziende');
    state.progetti = readLocalList('servizioNeve.progettiNeve');
    state.percorsi = readLocalList('servizioNeve.percorsi');
    return;
  }

  const queries = [];
  if (canOpenAdminDashboard()) {
    queries.push(isSuperAdmin()
      ? getDocs(query(collection(db, 'aziende'), orderBy('nome')))
      : getDocs(query(collection(db, 'aziende'), where('__name__', '==', state.profile.aziendaId))));
    queries.push(isSuperAdmin()
      ? getDocs(query(collection(db, 'utenti'), orderBy('createdAt')))
      : getDocs(query(collection(db, 'utenti'), where('aziendaId', '==', state.profile.aziendaId))));
  } else {
    queries.push(Promise.resolve({ docs: [] }), Promise.resolve({ docs: [] }));
  }

  if (canManageProjects()) {
    queries.push(getDocs(projectQuery()), getDocs(routesQuery()));
  } else {
    queries.push(Promise.resolve({ docs: [] }), Promise.resolve({ docs: [] }));
  }

  const [aziendeSnapshot, utentiSnapshot, progettiSnapshot, percorsiSnapshot] = await Promise.all(queries);
  state.aziende = aziendeSnapshot.docs.map(documentData);
  state.utenti = utentiSnapshot.docs.map(documentData);
  state.progetti = progettiSnapshot.docs.map(documentData);
  state.percorsi = percorsiSnapshot.docs.map(documentData);
}

function projectQuery() {
  if (isSuperAdmin()) return query(collection(db, 'progettiNeve'), orderBy('dataInizio'));
  if (state.profile?.ruolo === 'azienda_admin') {
    return query(collection(db, 'progettiNeve'), where('aziendaId', '==', state.profile.aziendaId));
  }
  return query(collection(db, 'progettiNeve'), where('tecnicoId', '==', currentUid()));
}

function routesQuery() {
  if (isSuperAdmin()) return query(collection(db, 'percorsi'), orderBy('nome'));
  if (state.profile?.ruolo === 'azienda_admin') {
    return query(collection(db, 'percorsi'), where('aziendaId', '==', state.profile.aziendaId));
  }
  return query(collection(db, 'percorsi'), where('tecnicoId', '==', currentUid()));
}

function documentData(snapshot) {
  return { id: snapshot.id, ...snapshot.data() };
}

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
  destroyMap();
  if (state.loading) return shell('<section class="card"><p>Caricamento...</p></section>', 'Caricamento profilo in corso.');
  if (!state.user) return renderAuth();
  if (!state.profile?.abilitato) return renderWaiting();
  if (canOpenAdminDashboard()) return renderAdminDashboard();
  return renderRoleDashboard();
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
    await safe(async () => (mode === 'register' ? register(data) : login(data.email, data.password)), 'authMessage');
  };
}

function renderWaiting() {
  shell(html`
    <section class="card stack waiting-card">
      <span class="pill">Account in attesa</span>
      <h2>Account in attesa di abilitazione da parte dell’amministratore.</h2>
      <p class="muted">Un admin dovrà assegnare azienda e ruolo prima dell’accesso alla dashboard.</p>
      <button id="logoutBtn" class="secondary">Esci</button>
    </section>`, 'Registrazione completata. Attendi l’abilitazione admin.');
  document.getElementById('logoutBtn').onclick = logout;
}

function renderRoleDashboard(message = 'Accesso effettuato.') {
  if (state.profile?.ruolo === 'tecnico') {
    shell(html`
      <section class="card stack">
        <div class="dashboard-head">
          <div>
            <span class="pill">Tecnico</span>
            <h2>Dashboard tecnico</h2>
            <p class="muted">Vedi e gestisci solo i progetti neve assegnati al tuo uid.</p>
          </div>
          <button id="logoutBtn" class="secondary">Esci</button>
        </div>
        <p class="notice compact">${message}</p>
      </section>
      <section class="grid project-grid">${renderProjectsModule()}</section>`, message);
    document.getElementById('logoutBtn').onclick = logout;
    bindProjectEvents();
    mountRouteMap();
    return;
  }

  shell(html`
    <section class="card stack">
      <h2>Operatore dashboard</h2>
      <p class="muted">Percorsi assegnati, servizio attivo, note, foto e GPS. Per ora l’operatore non modifica progetti o percorsi.</p>
      <button id="logoutBtn" class="secondary">Esci</button>
    </section>`, 'Accesso effettuato come operatore.');
  document.getElementById('logoutBtn').onclick = logout;
}

function renderAdminDashboard(message = 'Moduli admin pronti.') {
  shell(html`
    <section class="card stack">
      <div class="dashboard-head">
        <div>
          <span class="pill">${escapeHtml(state.profile.nome || state.profile.email)}</span>
          <h2>Admin dashboard</h2>
          <p class="muted">${isSuperAdmin() ? 'Super admin: vedi tutte le aziende e tutti i progetti.' : 'Azienda admin: vedi solo la tua azienda.'}</p>
        </div>
        <button id="logoutBtn" class="secondary">Esci</button>
      </div>
      <p id="adminMessage" class="notice compact">${message}</p>
    </section>
    <section class="grid three admin-grid">
      ${renderCompaniesModule()}
      ${renderPendingUsersModule()}
      ${renderLinksModule()}
    </section>
    <section class="grid project-grid">${renderProjectsModule()}</section>`, message);
  document.getElementById('logoutBtn').onclick = logout;
  bindAdminEvents();
  bindProjectEvents();
  mountRouteMap();
}

function renderCompaniesModule() {
  const aziende = visibleAziende();
  return html`
    <article class="card stack">
      <div class="module-head"><h2>Aziende</h2>${isSuperAdmin() ? '<button id="newCompanyBtn">+ Crea azienda</button>' : ''}</div>
      <form id="companyForm" class="stack hidden">
        <input name="id" type="hidden">
        <label>Nome azienda<input name="nome" required></label>
        <label>Partita IVA<input name="partitaIva"></label>
        <label>Email<input name="email" type="email"></label>
        <label>Telefono<input name="telefono"></label>
        <label>Indirizzo<input name="indirizzo"></label>
        <label>Stato<select name="attiva"><option value="true">Attiva</option><option value="false">Non attiva</option></select></label>
        <button>Salva azienda</button>
      </form>
      <div class="list">${aziende.map(renderCompanyItem).join('') || '<p class="muted">Nessuna azienda.</p>'}</div>
    </article>`;
}

function renderCompanyItem(azienda) {
  return html`
    <div class="item stack">
      <strong>${escapeHtml(azienda.nome || 'Azienda senza nome')}</strong>
      <span class="small muted">P.IVA ${escapeHtml(azienda.partitaIva || '-')} · ${azienda.attiva === false ? 'Non attiva' : 'Attiva'}</span>
      <span class="small muted">${escapeHtml(azienda.email || '-')} · ${escapeHtml(azienda.telefono || '-')}</span>
      ${isSuperAdmin() ? `<div class="row"><button class="secondary edit-company" data-id="${azienda.id}">Modifica</button><button class="danger delete-company" data-id="${azienda.id}">Elimina</button></div>` : ''}
    </div>`;
}

function renderPendingUsersModule() {
  return html`
    <article class="card stack">
      <h2>Utenti in attesa</h2>
      <div class="list">
        ${pendingUsers().map((utente) => html`
          <form class="item stack enable-user" data-id="${utente.id || utente.uid}">
            <strong>${escapeHtml(utente.nome || 'Senza nome')}</strong>
            <span class="small muted">${escapeHtml(utente.email)} · ${formatDate(utente.createdAt)}</span>
            <label>Ruolo<select name="ruolo">${userRoles.map((role) => `<option value="${role}">${role}</option>`).join('')}</select></label>
            <label>Azienda<select name="aziendaId" required>${visibleAziende().map((azienda) => `<option value="${azienda.id}">${escapeHtml(azienda.nome)}</option>`).join('')}</select></label>
            <button>Abilita</button>
          </form>`).join('') || '<p class="muted">Nessun utente in attesa.</p>'}
      </div>
    </article>`;
}

function renderLinksModule() {
  return html`
    <article class="card stack">
      <h2>Ruoli e collegamenti</h2>
      ${visibleAziende().map((azienda) => {
        const users = enabledUsers().filter((utente) => utente.aziendaId === azienda.id);
        const tecnici = users.filter((utente) => utente.ruolo === 'tecnico');
        const operatori = users.filter((utente) => utente.ruolo === 'operatore');
        return html`
          <div class="item stack">
            <h3>${escapeHtml(azienda.nome || 'Azienda')}</h3>
            ${tecnici.map((tecnico) => `<p class="small"><strong>Tecnico:</strong> ${escapeHtml(tecnico.nome || tecnico.email)}<br>Codice tecnico: <code>${ensureCode(tecnico)}</code></p>`).join('') || '<p class="small muted">Nessun tecnico.</p>'}
            ${operatori.map((operatore) => renderOperatorLinkForm(operatore, tecnici)).join('') || '<p class="small muted">Nessun operatore.</p>'}
          </div>`;
      }).join('')}
    </article>`;
}

function renderOperatorLinkForm(operatore, tecnici) {
  return html`
    <form class="operator-link stack" data-id="${operatore.id || operatore.uid}">
      <strong>Operatore: ${escapeHtml(operatore.nome || operatore.email)}</strong>
      <label>Tecnico
        <select name="tecnicoId">
          <option value="">Non assegnato</option>
          ${tecnici.map((tecnico) => `<option value="${tecnico.id || tecnico.uid}" ${operatore.tecnicoId === (tecnico.id || tecnico.uid) ? 'selected' : ''}>${escapeHtml(tecnico.nome || tecnico.email)}</option>`).join('')}
        </select>
      </label>
      <button>Salva tecnico</button>
    </form>`;
}

function renderProjectsModule() {
  const projects = visibleProjects();
  return html`
    <article class="card stack projects-card">
      <div class="module-head">
        <div><h2>Progetti Neve</h2><p class="muted">Crea progetti, aprili e gestisci i percorsi disegnati su mappa.</p></div>
        <button id="newProjectBtn">+ Nuovo progetto neve</button>
      </div>
      ${renderProjectForm()}
      <div class="list">${projects.map(renderProjectItem).join('') || '<p class="muted">Nessun progetto neve.</p>'}</div>
    </article>`;
}

function renderProjectForm() {
  const project = state.progetti.find((item) => item.id === state.editingProjectId) || {};
  return html`
    <form id="projectForm" class="stack ${state.editingProjectId ? '' : 'hidden'}">
      <input name="id" type="hidden" value="${project.id || ''}">
      <label>Nome progetto<input name="nome" value="${escapeAttribute(project.nome)}" required></label>
      <label>Descrizione<textarea name="descrizione">${escapeHtml(project.descrizione || '')}</textarea></label>
      <label>Azienda
        <select name="aziendaId" required ${state.profile?.ruolo === 'tecnico' ? 'disabled' : ''}>
          ${projectCompanyOptions(project.aziendaId)}
        </select>
      </label>
      <label>Tecnico
        <select name="tecnicoId" required ${state.profile?.ruolo === 'tecnico' ? 'disabled' : ''}>
          ${projectTechnicianOptions(project.tecnicoId, project.aziendaId)}
        </select>
      </label>
      <label>Data inizio<input name="dataInizio" type="date" value="${escapeAttribute(project.dataInizio || '')}" required></label>
      <label>Stato<select name="stato">${projectStatuses.map((status) => `<option value="${status}" ${project.stato === status ? 'selected' : ''}>${status}</option>`).join('')}</select></label>
      <div class="row"><button>Salva progetto</button><button class="secondary" id="cancelProjectBtn" type="button">Annulla</button></div>
    </form>`;
}

function renderProjectItem(project) {
  const isOpen = state.openProjectId === project.id;
  const routes = routesForProject(project.id);
  return html`
    <div class="item stack project-item">
      <div class="project-summary">
        <div>
          <strong>${escapeHtml(project.nome || 'Progetto senza nome')}</strong>
          <p class="small muted">${escapeHtml(companyName(project.aziendaId))} · ${escapeHtml(technicianName(project.tecnicoId))} · ${escapeHtml(project.stato || 'bozza')} · ${formatDate(project.dataInizio)}</p>
          ${project.descrizione ? `<p class="small muted">${escapeHtml(project.descrizione)}</p>` : ''}
        </div>
        <div class="row actions"><button class="secondary open-project" data-id="${project.id}">${isOpen ? 'Chiudi' : 'Apri'}</button><button class="secondary edit-project" data-id="${project.id}">Modifica</button><button class="danger delete-project" data-id="${project.id}">Elimina</button></div>
      </div>
      ${isOpen ? renderRoutesPanel(project, routes) : ''}
    </div>`;
}

function renderRoutesPanel(project, routes) {
  return html`
    <div class="stack route-panel">
      <div class="module-head"><h3>Percorsi</h3><button class="add-route" data-project-id="${project.id}">+ Aggiungi percorso</button></div>
      ${renderRouteForm(project)}
      <div class="list">${routes.map(renderRouteItem).join('') || '<p class="muted">Nessun percorso per questo progetto.</p>'}</div>
    </div>`;
}

function renderRouteForm(project) {
  const route = state.percorsi.find((item) => item.id === state.editingRouteId) || {};
  const visible = state.editingRouteId || state.openProjectId === project.id && state.editingRouteId === 'new';
  if (!visible) return '<form id="routeForm" class="hidden"></form>';
  return html`
    <form id="routeForm" class="stack" data-project-id="${project.id}">
      <input name="id" type="hidden" value="${route.id || ''}">
      <label>Nome percorso<input name="nome" value="${escapeAttribute(route.nome)}" required></label>
      <label>Descrizione percorso<textarea name="descrizione">${escapeHtml(route.descrizione || '')}</textarea></label>
      <label>Comune/zona<input name="zona" value="${escapeAttribute(route.zona)}" required></label>
      <label>Priorità<select name="priorita">${routePriorities.map((priority) => `<option value="${priority}" ${route.priorita === priority ? 'selected' : ''}>${priority}</option>`).join('')}</select></label>
      <div class="map-help">Tocca/clicca sulla mappa per aggiungere punti GPS. Usa “Svuota punti” per ridisegnare.</div>
      <div id="routeMap" class="map route-map"></div>
      <p class="small muted" id="routePointsInfo">Punti GPS: ${state.routeDraftPoints.length}</p>
      <div class="row"><button>Salva percorso</button><button class="secondary" id="clearRoutePointsBtn" type="button">Svuota punti</button><button class="secondary" id="cancelRouteBtn" type="button">Annulla</button></div>
    </form>`;
}

function renderRouteItem(route) {
  return html`
    <div class="item stack">
      <strong>${escapeHtml(route.nome || 'Percorso senza nome')}</strong>
      <span class="small muted">${escapeHtml(route.zona || '-')} · priorità ${escapeHtml(route.priorita || 'media')} · ${Array.isArray(route.puntiGps) ? route.puntiGps.length : 0} punti GPS</span>
      ${route.descrizione ? `<p class="small muted">${escapeHtml(route.descrizione)}</p>` : ''}
      <div class="row"><button class="secondary edit-route" data-id="${route.id}">Modifica</button><button class="danger delete-route" data-id="${route.id}">Elimina</button></div>
    </div>`;
}

function bindAdminEvents() {
  document.getElementById('newCompanyBtn')?.addEventListener('click', () => document.getElementById('companyForm').classList.toggle('hidden'));
  document.getElementById('companyForm')?.addEventListener('submit', (event) => safe(() => saveCompany(event)));
  document.querySelectorAll('.edit-company').forEach((btn) => btn.addEventListener('click', () => fillCompanyForm(btn.dataset.id)));
  document.querySelectorAll('.delete-company').forEach((btn) => btn.addEventListener('click', () => safe(() => removeCompany(btn.dataset.id))));
  document.querySelectorAll('.enable-user').forEach((form) => form.addEventListener('submit', (event) => safe(() => enableUser(event))));
  document.querySelectorAll('.operator-link').forEach((form) => form.addEventListener('submit', (event) => safe(() => linkOperator(event))));
}

function bindProjectEvents() {
  document.getElementById('newProjectBtn')?.addEventListener('click', () => {
    state.editingProjectId = 'new';
    state.openProjectId = '';
    renderDashboardMessage('Compila il nuovo progetto neve.');
  });
  document.getElementById('projectForm')?.addEventListener('submit', (event) => safe(() => saveProject(event)));
  document.getElementById('cancelProjectBtn')?.addEventListener('click', () => {
    state.editingProjectId = '';
    renderDashboardMessage('Modifica progetto annullata.');
  });
  document.querySelectorAll('.open-project').forEach((btn) => btn.addEventListener('click', () => toggleProject(btn.dataset.id)));
  document.querySelectorAll('.edit-project').forEach((btn) => btn.addEventListener('click', () => editProject(btn.dataset.id)));
  document.querySelectorAll('.delete-project').forEach((btn) => btn.addEventListener('click', () => safe(() => removeProject(btn.dataset.id))));
  document.querySelectorAll('.add-route').forEach((btn) => btn.addEventListener('click', () => addRoute(btn.dataset.projectId)));
  document.querySelectorAll('.edit-route').forEach((btn) => btn.addEventListener('click', () => editRoute(btn.dataset.id)));
  document.querySelectorAll('.delete-route').forEach((btn) => btn.addEventListener('click', () => safe(() => removeRoute(btn.dataset.id))));
  document.getElementById('routeForm')?.addEventListener('submit', (event) => safe(() => saveRoute(event)));
  document.getElementById('clearRoutePointsBtn')?.addEventListener('click', clearRoutePoints);
  document.getElementById('cancelRouteBtn')?.addEventListener('click', cancelRouteEdit);
}

async function saveCompany(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  const id = data.id || crypto.randomUUID();
  const existing = state.aziende.find((azienda) => azienda.id === id) || {};
  const payload = {
    nome: data.nome.trim(),
    partitaIva: data.partitaIva.trim(),
    email: data.email.trim(),
    telefono: data.telefono.trim(),
    indirizzo: data.indirizzo.trim(),
    attiva: data.attiva === 'true',
    createdAt: existing.createdAt || stamp(),
    updatedAt: stamp(),
  };
  await saveDocument('aziende', id, payload);
  await refresh('Azienda salvata correttamente.');
}

async function removeCompany(id) {
  if (!confirm('Eliminare questa azienda?')) return;
  await deleteStoredDoc('aziende', id);
  await refresh('Azienda eliminata.');
}

async function enableUser(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  const userId = event.target.dataset.id;
  const payload = { ruolo: data.ruolo, aziendaId: data.aziendaId, abilitato: true, updatedAt: stamp() };
  if (data.ruolo === 'tecnico') payload.codiceTecnico = codeFor(userId);
  await saveDocument('utenti', userId, payload, true);
  await refresh('Utente abilitato correttamente.');
}

async function linkOperator(event) {
  event.preventDefault();
  const userId = event.target.dataset.id;
  const data = Object.fromEntries(new FormData(event.target));
  await saveDocument('utenti', userId, { tecnicoId: data.tecnicoId, updatedAt: stamp() }, true);
  await refresh('Collegamento operatore salvato.');
}

async function saveProject(event) {
  event.preventDefault();
  const form = event.target;
  const data = Object.fromEntries(new FormData(form));
  const id = data.id || crypto.randomUUID();
  const existing = state.progetti.find((project) => project.id === id) || {};
  const aziendaId = state.profile?.ruolo === 'tecnico' ? state.profile.aziendaId : data.aziendaId;
  const tecnicoId = state.profile?.ruolo === 'tecnico' ? currentUid() : data.tecnicoId;
  const payload = {
    nome: data.nome.trim(),
    descrizione: data.descrizione.trim(),
    aziendaId,
    tecnicoId,
    dataInizio: data.dataInizio,
    stato: data.stato,
    createdAt: existing.createdAt || stamp(),
    updatedAt: stamp(),
  };
  await saveDocument('progettiNeve', id, payload);
  state.editingProjectId = '';
  state.openProjectId = id;
  await refresh('Progetto neve salvato correttamente.');
}

async function removeProject(id) {
  if (!confirm('Eliminare questo progetto neve e i suoi percorsi?')) return;
  await Promise.all(routesForProject(id).map((route) => deleteStoredDoc('percorsi', route.id)));
  await deleteStoredDoc('progettiNeve', id);
  if (state.openProjectId === id) state.openProjectId = '';
  await refresh('Progetto neve eliminato.');
}

async function saveRoute(event) {
  event.preventDefault();
  const form = event.target;
  const project = state.progetti.find((item) => item.id === form.dataset.projectId);
  if (!project) throw new Error('Progetto non trovato.');
  if (state.routeDraftPoints.length < 2) throw new Error('Disegna almeno due punti GPS sulla mappa.');

  const data = Object.fromEntries(new FormData(form));
  const id = data.id || crypto.randomUUID();
  const existing = state.percorsi.find((route) => route.id === id) || {};
  const payload = {
    progettoNeveId: project.id,
    aziendaId: project.aziendaId,
    tecnicoId: project.tecnicoId,
    nome: data.nome.trim(),
    descrizione: data.descrizione.trim(),
    zona: data.zona.trim(),
    priorita: data.priorita,
    puntiGps: state.routeDraftPoints,
    createdAt: existing.createdAt || stamp(),
    updatedAt: stamp(),
  };
  await saveDocument('percorsi', id, payload);
  state.editingRouteId = '';
  state.routeDraftPoints = [];
  await refresh('Percorso salvato correttamente.');
}

async function removeRoute(id) {
  if (!confirm('Eliminare questo percorso?')) return;
  await deleteStoredDoc('percorsi', id);
  await refresh('Percorso eliminato.');
}

function fillCompanyForm(id) {
  const azienda = state.aziende.find((item) => item.id === id);
  const form = document.getElementById('companyForm');
  form.classList.remove('hidden');
  ['id', 'nome', 'partitaIva', 'email', 'telefono', 'indirizzo'].forEach((field) => {
    form.elements[field].value = field === 'id' ? id : (azienda[field] || '');
  });
  form.elements.attiva.value = String(azienda.attiva !== false);
}

function toggleProject(id) {
  state.openProjectId = state.openProjectId === id ? '' : id;
  state.editingRouteId = '';
  state.routeDraftPoints = [];
  renderDashboardMessage(state.openProjectId ? 'Progetto aperto.' : 'Progetto chiuso.');
}

function editProject(id) {
  state.editingProjectId = id;
  state.openProjectId = '';
  renderDashboardMessage('Modifica progetto neve.');
}

function addRoute(projectId) {
  state.openProjectId = projectId;
  state.editingRouteId = 'new';
  state.routeDraftPoints = [];
  renderDashboardMessage('Disegna e salva il nuovo percorso.');
}

function editRoute(id) {
  const route = state.percorsi.find((item) => item.id === id);
  state.openProjectId = route?.progettoNeveId || state.openProjectId;
  state.editingRouteId = id;
  state.routeDraftPoints = Array.isArray(route?.puntiGps) ? route.puntiGps : [];
  renderDashboardMessage('Modifica percorso.');
}

function clearRoutePoints() {
  state.routeDraftPoints = [];
  updateMapLayer();
}

function cancelRouteEdit() {
  state.editingRouteId = '';
  state.routeDraftPoints = [];
  renderDashboardMessage('Modifica percorso annullata.');
}

async function refresh(message) {
  await loadDashboardData();
  renderDashboardMessage(message);
}

function renderDashboardMessage(message) {
  if (canOpenAdminDashboard()) renderAdminDashboard(message);
  else renderRoleDashboard(message);
}

async function saveDocument(collectionName, id, payload, merge = false) {
  if (isFirebaseConfigured) return setDoc(doc(db, collectionName, id), payload, { merge });
  const key = localStorageKey(collectionName);
  if (collectionName === 'utenti') {
    const current = JSON.parse(localStorage.getItem(key) || '{}');
    current[id] = merge ? { ...(current[id] || {}), ...payload, id, uid: id } : { ...payload, id, uid: id };
    localStorage.setItem(key, JSON.stringify(current));
    return;
  }
  const current = Object.fromEntries(readLocalList(key).map((item) => [item.id, item]));
  current[id] = merge ? { ...(current[id] || {}), ...payload, id } : { ...payload, id };
  localStorage.setItem(key, JSON.stringify(Object.values(current)));
}

async function deleteStoredDoc(collectionName, id) {
  if (isFirebaseConfigured) return deleteDoc(doc(db, collectionName, id));
  const key = localStorageKey(collectionName);
  const next = readLocalList(key).filter((item) => item.id !== id);
  localStorage.setItem(key, JSON.stringify(next));
}

function localStorageKey(collectionName) {
  return {
    aziende: 'servizioNeve.aziende',
    utenti: 'servizioNeve.users',
    progettiNeve: 'servizioNeve.progettiNeve',
    percorsi: 'servizioNeve.percorsi',
  }[collectionName];
}

function readLocalList(key) {
  return JSON.parse(localStorage.getItem(key) || '[]');
}

function projectCompanyOptions(selectedId = '') {
  const forcedCompany = state.profile?.ruolo === 'tecnico' ? state.profile.aziendaId : selectedId;
  return visibleAziende().map((azienda) => `<option value="${azienda.id}" ${azienda.id === forcedCompany ? 'selected' : ''}>${escapeHtml(azienda.nome)}</option>`).join('');
}

function projectTechnicianOptions(selectedId = '', aziendaId = '') {
  if (state.profile?.ruolo === 'tecnico') {
    return `<option value="${currentUid()}" selected>${escapeHtml(state.profile.nome || state.profile.email)}</option>`;
  }
  const technicians = visibleTecnici(aziendaId);
  return technicians.map((tecnico) => `<option value="${tecnico.id || tecnico.uid}" ${selectedId === (tecnico.id || tecnico.uid) ? 'selected' : ''}>${escapeHtml(tecnico.nome || tecnico.email)}</option>`).join('');
}

function companyName(id) {
  return state.aziende.find((azienda) => azienda.id === id)?.nome || id || 'Azienda non assegnata';
}

function technicianName(id) {
  const tecnico = state.utenti.find((utente) => (utente.id || utente.uid) === id);
  if (tecnico) return tecnico.nome || tecnico.email;
  if (id === currentUid()) return state.profile?.nome || state.profile?.email;
  return id || 'Tecnico non assegnato';
}

function stamp() {
  return isFirebaseConfigured ? serverTimestamp() : new Date().toISOString();
}

function ensureCode(user) {
  return user.codiceTecnico || codeFor(user.id || user.uid);
}

function codeFor(id) {
  return `TEC-${String(id).slice(0, 6).toUpperCase()}`;
}

function formatDate(value) {
  if (!value) return 'Data non disponibile';
  const date = value.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? 'Data non disponibile' : date.toLocaleDateString('it-IT');
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[character]));
}

function escapeAttribute(value) {
  return escapeHtml(value || '');
}

async function safe(action, messageId) {
  try {
    await action();
  } catch (error) {
    console.error(error);
    const message = messageId ? document.getElementById(messageId) : document.getElementById('adminMessage');
    if (message) message.textContent = error.message || 'Operazione non riuscita.';
    else alert(error.message || 'Operazione non riuscita.');
  }
}

function mountRouteMap() {
  const mapElement = document.getElementById('routeMap');
  if (!mapElement) return;
  if (!window.L) {
    mapElement.innerHTML = '<p class="map-fallback">Leaflet non disponibile: ricarica la pagina con connessione internet.</p>';
    return;
  }

  state.map = window.L.map(mapElement).setView([45.4642, 9.19], 12);
  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(state.map);
  state.map.on('click', (event) => {
    state.routeDraftPoints.push({ lat: event.latlng.lat, lng: event.latlng.lng });
    updateMapLayer();
  });
  setTimeout(() => state.map?.invalidateSize(), 50);
  updateMapLayer();
}

function updateMapLayer() {
  if (!state.map || !window.L) return;
  if (state.mapLayer) state.map.removeLayer(state.mapLayer);
  const group = window.L.layerGroup();
  const points = state.routeDraftPoints.map((point) => [point.lat, point.lng]);
  points.forEach((point, index) => window.L.marker(point).bindPopup(`Punto ${index + 1}`).addTo(group));
  if (points.length > 1) window.L.polyline(points, { color: '#0f766e', weight: 5 }).addTo(group);
  group.addTo(state.map);
  state.mapLayer = group;
  if (points.length) state.map.fitBounds(window.L.latLngBounds(points), { padding: [20, 20] });
  const info = document.getElementById('routePointsInfo');
  if (info) info.textContent = `Punti GPS: ${state.routeDraftPoints.length}`;
}

function destroyMap() {
  if (state.map) {
    state.map.remove();
    state.map = null;
    state.mapLayer = null;
  }
}
