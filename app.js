import { auth, collection, db, deleteDoc, doc, getDocs, isFirebaseConfigured, onAuthStateChanged, orderBy, query, serverTimestamp, setDoc, where } from './firebase.js';
import { getUserProfile, login, logout, register } from './auth.js';

const app = document.getElementById('app');
const state = { user: null, profile: null, loading: true, aziende: [], utenti: [] };
const html = String.raw;
const adminRoles = ['admin', 'super_admin', 'azienda_admin'];
const roles = ['azienda_admin', 'tecnico', 'operatore'];

onAuthStateChanged(auth, async (user) => {
  state.user = user;
  state.profile = user ? await getUserProfile(user.uid) : null;
  state.loading = false;
  await loadAdminData();
  render();
});

function isSuperAdmin() {
  return ['admin', 'super_admin'].includes(state.profile?.ruolo);
}


function canOpenAdminDashboard() {
  return adminRoles.includes(state.profile?.ruolo);
}

function visibleAziende() {
  if (isSuperAdmin()) return state.aziende;
  return state.aziende.filter((azienda) => azienda.id === state.profile?.aziendaId);
}

function visibleUtenti() {
  if (isSuperAdmin()) return state.utenti;
  return state.utenti.filter((utente) => utente.aziendaId === state.profile?.aziendaId);
}

function pendingUsers() {
  return visibleUtenti().filter((utente) => utente.abilitato === false);
}

function enabledUsers() {
  return visibleUtenti().filter((utente) => utente.abilitato === true && utente.ruolo !== 'operatore_in_attesa');
}

async function loadAdminData() {
  if (!state.profile?.abilitato || !canOpenAdminDashboard()) return;
  if (!isFirebaseConfigured) {
    const users = JSON.parse(localStorage.getItem('servizioNeve.users') || '{}');
    state.utenti = Object.values(users);
    state.aziende = JSON.parse(localStorage.getItem('servizioNeve.aziende') || '[]');
    return;
  }

  const aziendeQuery = isSuperAdmin()
    ? query(collection(db, 'aziende'), orderBy('nome'))
    : query(collection(db, 'aziende'), where('__name__', '==', state.profile.aziendaId));
  const utentiQuery = isSuperAdmin()
    ? query(collection(db, 'utenti'), orderBy('createdAt'))
    : query(collection(db, 'utenti'), where('aziendaId', '==', state.profile.aziendaId));

  const [aziendeSnapshot, utentiSnapshot] = await Promise.all([getDocs(aziendeQuery), getDocs(utentiQuery)]);
  state.aziende = aziendeSnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
  state.utenti = utentiSnapshot.docs.map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
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
  if (state.loading) return shell('<section class="card"><p>Caricamento...</p></section>', 'Caricamento profilo in corso.');
  if (!state.user) return renderAuth();
  if (!state.profile?.abilitato) return renderWaiting();
  return canOpenAdminDashboard() ? renderAdminDashboard() : renderRoleDashboard();
}

function renderAuth(mode = 'login') {
  shell(html`
    <section class="grid two auth-grid">
      <article class="card stack">
        <h2>${mode === 'login' ? 'Login' : 'Registrazione'}</h2>
        <p class="muted">Ogni utente accede con email e password. Dopo la registrazione l’account resta disabilitato finché un admin lo abilita.</p>
        <div class="tabs"><button id="showLogin" class="${mode === 'login' ? '' : 'secondary'}">Login</button><button id="showRegister" class="${mode === 'register' ? '' : 'secondary'}">Registrazione</button></div>
      </article>
      <article class="card stack"><form id="authForm" class="stack">${mode === 'register' ? '<label>Nome e cognome<input name="nome" autocomplete="name" required></label>' : ''}<label>Email<input name="email" type="email" autocomplete="email" required></label><label>Password<input name="password" type="password" autocomplete="current-password" minlength="6" required></label><button>${mode === 'login' ? 'Accedi' : 'Registrati'}</button></form><p id="authMessage" class="error" role="alert"></p></article>
    </section>`, 'Accedi o crea un account operatore in attesa di abilitazione.');
  document.getElementById('showLogin').onclick = () => renderAuth('login');
  document.getElementById('showRegister').onclick = () => renderAuth('register');
  document.getElementById('authForm').onsubmit = async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.target)); await safe(async () => mode === 'register' ? register(data) : login(data.email, data.password), 'authMessage'); };
}

function renderWaiting() {
  shell(html`<section class="card stack waiting-card"><span class="pill">Account in attesa</span><h2>Account in attesa di abilitazione da parte dell’amministratore.</h2><p class="muted">Un admin dovrà assegnare azienda e ruolo prima dell’accesso alla dashboard.</p><button id="logoutBtn" class="secondary">Esci</button></section>`, 'Registrazione completata. Attendi l’abilitazione admin.');
  document.getElementById('logoutBtn').onclick = logout;
}

function renderRoleDashboard() {
  const role = state.profile.ruolo;
  if (role === 'operatore') shell(`<section class="card stack"><h2>Operatore dashboard</h2><p class="muted">Percorsi assegnati, servizio attivo, note, foto e GPS.</p><button id="logoutBtn" class="secondary">Esci</button></section>`, 'Accesso effettuato come operatore.');
  else if (role === 'tecnico') shell(`<section class="card stack"><h2>Tecnico dashboard</h2><p class="muted">Vedi solo i tuoi operatori e i percorsi collegati.</p><button id="logoutBtn" class="secondary">Esci</button></section>`, 'Accesso effettuato come tecnico.');
  else shell(`<section class="card stack"><h2>Dashboard</h2><button id="logoutBtn" class="secondary">Esci</button></section>`);
  document.getElementById('logoutBtn').onclick = logout;
}

function renderAdminDashboard(message = 'Moduli admin pronti.') {
  shell(html`
    <section class="card stack">
      <div class="dashboard-head"><div><span class="pill">${state.profile.nome || state.profile.email}</span><h2>Admin dashboard</h2><p class="muted">${isSuperAdmin() ? 'Super admin: vedi tutte le aziende.' : 'Azienda admin: vedi solo la tua azienda.'}</p></div><button id="logoutBtn" class="secondary">Esci</button></div>
      <p id="adminMessage" class="notice compact">${message}</p>
    </section>
    <section class="grid three admin-grid">
      ${renderCompaniesModule()}
      ${renderPendingUsersModule()}
      ${renderLinksModule()}
    </section>`, message);
  document.getElementById('logoutBtn').onclick = logout;
  bindAdminEvents();
}

function renderCompaniesModule() {
  const aziende = visibleAziende();
  return html`<article class="card stack"><div class="module-head"><h2>Aziende</h2>${isSuperAdmin() ? '<button id="newCompanyBtn">+ Crea azienda</button>' : ''}</div><form id="companyForm" class="stack hidden"><input name="id" type="hidden"><label>Nome azienda<input name="nome" required></label><label>Partita IVA<input name="partitaIva"></label><label>Email<input name="email" type="email"></label><label>Telefono<input name="telefono"></label><label>Indirizzo<input name="indirizzo"></label><label>Stato<select name="attiva"><option value="true">Attiva</option><option value="false">Non attiva</option></select></label><button>Salva azienda</button></form><div class="list">${aziende.map((a) => html`<div class="item stack"><strong>${escapeHtml(a.nome || 'Azienda senza nome')}</strong><span class="small muted">P.IVA ${escapeHtml(a.partitaIva || '-')} · ${a.attiva === false ? 'Non attiva' : 'Attiva'}</span><span class="small muted">${escapeHtml(a.email || '-')} · ${escapeHtml(a.telefono || '-')}</span>${isSuperAdmin() ? `<div class="row"><button class="secondary edit-company" data-id="${a.id}">Modifica</button><button class="danger delete-company" data-id="${a.id}">Elimina</button></div>` : ''}</div>`).join('') || '<p class="muted">Nessuna azienda.</p>'}</div></article>`;
}

function renderPendingUsersModule() {
  return html`<article class="card stack"><h2>Utenti in attesa</h2><div class="list">${pendingUsers().map((u) => html`<form class="item stack enable-user" data-id="${u.id || u.uid}"><strong>${escapeHtml(u.nome || 'Senza nome')}</strong><span class="small muted">${escapeHtml(u.email)} · ${formatDate(u.createdAt)}</span><label>Ruolo<select name="ruolo">${roles.map((r) => `<option value="${r}">${r}</option>`).join('')}</select></label><label>Azienda<select name="aziendaId" required>${visibleAziende().map((a) => `<option value="${a.id}">${escapeHtml(a.nome)}</option>`).join('')}</select></label><button>Abilita</button></form>`).join('') || '<p class="muted">Nessun utente in attesa.</p>'}</div></article>`;
}

function renderLinksModule() {
  const aziende = visibleAziende();
  return html`<article class="card stack"><h2>Ruoli e collegamenti</h2>${aziende.map((azienda) => { const users = enabledUsers().filter((u) => u.aziendaId === azienda.id); const tecnici = users.filter((u) => u.ruolo === 'tecnico'); const operatori = users.filter((u) => u.ruolo === 'operatore'); return html`<div class="item stack"><h3>${escapeHtml(azienda.nome || 'Azienda')}</h3>${tecnici.map((t) => `<p class="small"><strong>Tecnico:</strong> ${escapeHtml(t.nome || t.email)}<br>Codice tecnico: <code>${ensureCode(t)}</code></p>`).join('') || '<p class="small muted">Nessun tecnico.</p>'}${operatori.map((o) => html`<form class="operator-link stack" data-id="${o.id || o.uid}"><strong>Operatore: ${escapeHtml(o.nome || o.email)}</strong><label>Tecnico<select name="tecnicoId"><option value="">Non assegnato</option>${tecnici.map((t) => `<option value="${t.id || t.uid}" ${o.tecnicoId === (t.id || t.uid) ? 'selected' : ''}>${escapeHtml(t.nome || t.email)}</option>`).join('')}</select></label><button>Salva tecnico</button></form>`).join('') || '<p class="small muted">Nessun operatore.</p>'}</div>`; }).join('')}</article>`;
}

function bindAdminEvents() {
  document.getElementById('newCompanyBtn')?.addEventListener('click', () => document.getElementById('companyForm').classList.toggle('hidden'));
  document.getElementById('companyForm')?.addEventListener('submit', (event) => safe(() => saveCompany(event)));
  document.querySelectorAll('.edit-company').forEach((btn) => btn.addEventListener('click', () => fillCompanyForm(btn.dataset.id)));
  document.querySelectorAll('.delete-company').forEach((btn) => btn.addEventListener('click', () => safe(() => removeCompany(btn.dataset.id))));
  document.querySelectorAll('.enable-user').forEach((form) => form.addEventListener('submit', (event) => safe(() => enableUser(event))));
  document.querySelectorAll('.operator-link').forEach((form) => form.addEventListener('submit', (event) => safe(() => linkOperator(event))));
}

async function saveCompany(event) { event.preventDefault(); const data = Object.fromEntries(new FormData(event.target)); const id = data.id || crypto.randomUUID(); const payload = { nome: data.nome.trim(), partitaIva: data.partitaIva.trim(), email: data.email.trim(), telefono: data.telefono.trim(), indirizzo: data.indirizzo.trim(), attiva: data.attiva === 'true', updatedAt: stamp(), createdAt: stamp() }; await saveDoc('aziende', id, payload); await refresh('Azienda salvata correttamente.'); }
async function removeCompany(id) { if (!confirm('Eliminare questa azienda?')) return; await deleteStoredDoc('aziende', id); await refresh('Azienda eliminata.'); }
async function enableUser(event) { event.preventDefault(); const data = Object.fromEntries(new FormData(event.target)); const userId = event.target.dataset.id; const payload = { ruolo: data.ruolo, aziendaId: data.aziendaId, abilitato: true, updatedAt: stamp() }; if (data.ruolo === 'tecnico') payload.codiceTecnico = codeFor(userId); await saveDoc('utenti', userId, payload, true); await refresh('Utente abilitato correttamente.'); }
async function linkOperator(event) { event.preventDefault(); const userId = event.target.dataset.id; const data = Object.fromEntries(new FormData(event.target)); await saveDoc('utenti', userId, { tecnicoId: data.tecnicoId, updatedAt: stamp() }, true); await refresh('Collegamento operatore salvato.'); }

function fillCompanyForm(id) { const a = state.aziende.find((item) => item.id === id); const form = document.getElementById('companyForm'); form.classList.remove('hidden'); ['id', 'nome', 'partitaIva', 'email', 'telefono', 'indirizzo'].forEach((field) => { form.elements[field].value = field === 'id' ? id : (a[field] || ''); }); form.elements.attiva.value = String(a.attiva !== false); }
async function refresh(message) { await loadAdminData(); renderAdminDashboard(message); }
async function saveDoc(collectionName, id, payload, merge = false) { if (isFirebaseConfigured) return setDoc(doc(db, collectionName, id), payload, { merge }); const key = collectionName === 'utenti' ? 'servizioNeve.users' : 'servizioNeve.aziende'; const current = collectionName === 'utenti' ? JSON.parse(localStorage.getItem(key) || '{}') : Object.fromEntries(JSON.parse(localStorage.getItem(key) || '[]').map((x) => [x.id, x])); current[id] = merge ? { ...(current[id] || {}), ...payload, id, uid: id } : { ...payload, id }; localStorage.setItem(key, collectionName === 'utenti' ? JSON.stringify(current) : JSON.stringify(Object.values(current))); }
async function deleteStoredDoc(collectionName, id) { if (isFirebaseConfigured) return deleteDoc(doc(db, collectionName, id)); const aziende = state.aziende.filter((a) => a.id !== id); localStorage.setItem('servizioNeve.aziende', JSON.stringify(aziende)); }
function stamp() { return isFirebaseConfigured ? serverTimestamp() : new Date().toISOString(); }
function ensureCode(user) { return user.codiceTecnico || codeFor(user.id || user.uid); }
function codeFor(id) { return `TEC-${String(id).slice(0, 6).toUpperCase()}`; }
function formatDate(value) { if (!value) return 'Data non disponibile'; const date = value.toDate ? value.toDate() : new Date(value); return Number.isNaN(date.getTime()) ? 'Data non disponibile' : date.toLocaleDateString('it-IT'); }
function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }
async function safe(action, messageId) { try { await action(); } catch (error) { console.error(error); const message = messageId ? document.getElementById(messageId) : null; if (message) message.textContent = error.message || 'Operazione non riuscita.'; else alert(error.message || 'Operazione non riuscita.'); } }
