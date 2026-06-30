import {
  auth,
  arrayUnion,
  collection,
  collectionGroup,
  db,
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
const roles = ['super_admin', 'azienda_admin', 'tecnico', 'operatore'];
const state = { user: null, profile: null, loading: true, companies: [], users: [], routes: [], activeRoute: null, watchId: null, serviceId: '', gpsPoints: [] };

onAuthStateChanged(auth, async (user) => {
  state.user = user;
  state.profile = user ? await getUserProfile(user.uid) : null;
  state.loading = false;
  await loadData();
  render();
});

const uid = () => state.profile?.uid || state.user?.uid || '';
const isEnabled = (u = state.profile) => u?.enabled === true || u?.abilitato === true;
const isSuperAdmin = () => state.profile?.ruolo === 'super_admin' || state.profile?.role === 'super_admin';
const role = () => state.profile?.ruolo || state.profile?.role;
const companyId = () => state.profile?.companyId || state.profile?.aziendaId || '';
const now = () => isFirebaseConfigured ? serverTimestamp() : new Date().toISOString();

async function loadData() {
  state.companies = []; state.users = []; state.routes = [];
  if (!state.profile || !isEnabled()) return;
  if (!isFirebaseConfigured) {
    state.companies = Object.values(readLocal('companies'));
    state.users = Object.values(readLocal('users'));
    state.routes = Object.values(readLocal('routes')).filter(canSeeRoute);
    return;
  }
  const usersQuery = isSuperAdmin() ? query(collection(db, 'users'), orderBy('createdAt')) : query(collection(db, 'users'), where('companyId', '==', companyId()));
  const companiesQuery = isSuperAdmin() ? query(collection(db, 'companies'), orderBy('nome')) : query(collection(db, 'companies'), where('__name__', '==', companyId()));
  const routesQuery = isSuperAdmin()
    ? query(collectionGroup(db, 'routes'), orderBy('updatedAt'))
    : query(collection(db, 'companies', companyId(), 'routes'), orderBy('updatedAt'));
  const [cSnap, uSnap, rSnap] = await Promise.all([getDocs(companiesQuery), getDocs(usersQuery), getDocs(routesQuery)]);
  state.companies = cSnap.docs.map(docData);
  state.users = uSnap.docs.map(docData);
  state.routes = rSnap.docs.map(docData).filter(canSeeRoute);
}

function canSeeRoute(route) {
  if (isSuperAdmin()) return true;
  if (route.companyId !== companyId()) return false;
  if (role() === 'azienda_admin') return true;
  if (role() === 'tecnico') return route.tecnicoId === uid();
  return Array.isArray(route.assignedOperators) && route.assignedOperators.includes(uid());
}

function render() {
  if (state.loading) return shell('<section class="card"><p>Caricamento...</p></section>');
  if (!state.user) return renderAuth();
  if (!isEnabled()) return renderWaiting();
  if (role() === 'super_admin') return renderSuperAdmin();
  if (role() === 'azienda_admin') return renderCompanyAdmin();
  if (role() === 'tecnico') return renderTechnician();
  return renderOperator();
}

function shell(content, status = 'Dashboard aperta automaticamente in base al ruolo letto da Firestore.') {
  app.innerHTML = html`<section class="hero card"><div><span class="pill">Servizio Neve PWA</span><h1>Servizio Neve</h1><p class="muted">Firebase Authentication, Cloud Firestore, GPS, note e foto per squadre neve multi azienda.</p></div><div class="notice">${status}</div></section>${content}`;
}

function header(title, subtitle) { return html`<section class="card stack"><div class="dashboard-head"><div><span class="pill">${esc(state.profile.nome || state.profile.email)}</span><h2>${title}</h2><p class="muted">${subtitle}</p></div><button id="logoutBtn" class="secondary">Esci</button></div><p id="message" class="notice compact">Pronto.</p></section>`; }
function bindLogout() { document.getElementById('logoutBtn').onclick = logout; }

function renderAuth(mode = 'login') {
  shell(html`<section class="grid two auth-grid"><article class="card stack"><h2>${mode === 'login' ? 'Login' : 'Registrazione'}</h2><p class="muted">L’accesso usa Firebase Authentication; dopo il login viene letto <code>users/{userId}</code> e viene aperta la dashboard corretta.</p><div class="tabs"><button id="showLogin" class="${mode === 'login' ? '' : 'secondary'}">Login</button><button id="showRegister" class="${mode === 'register' ? '' : 'secondary'}">Registrazione</button></div></article><article class="card stack"><form id="authForm" class="stack">${mode === 'register' ? '<label>Nome<input name="nome" required></label>' : ''}<label>Email<input name="email" type="email" required></label><label>Password<input name="password" type="password" minlength="6" required></label><button>${mode === 'login' ? 'Accedi' : 'Registrati'}</button></form><p id="authMsg" class="error"></p></article></section>`);
  document.getElementById('showLogin').onclick = () => renderAuth('login');
  document.getElementById('showRegister').onclick = () => renderAuth('register');
  document.getElementById('authForm').onsubmit = (e) => safe(async () => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); mode === 'login' ? await login(d.email, d.password) : await register(d); }, 'authMsg');
}
function renderWaiting() { shell(html`<section class="card stack waiting-card"><h2>Account non abilitato</h2><p class="muted">Un Super Admin o Amministratore Azienda deve impostare ruolo, companyId ed enabled=true.</p><button id="logoutBtn" class="secondary">Esci</button></section>`); bindLogout(); }

function renderSuperAdmin() { shell(header('Dashboard Super Admin', 'Crea aziende, vede tutte le aziende e abilita amministratori azienda.') + adminModules(true) + routesModule()); bindLogout(); bindAdmin(); bindRoutes(); }
function renderCompanyAdmin() { shell(header('Dashboard Amministratore Azienda', 'Vede solo la propria azienda, crea/abilita/disabilita tecnici e vede tutti i percorsi aziendali.') + adminModules(false) + routesModule()); bindLogout(); bindAdmin(); bindRoutes(); }
function renderTechnician() { shell(header('Dashboard Tecnico', 'Crea e modifica percorsi, assegna operatori e vede solo i propri percorsi.') + routesModule(true)); bindLogout(); bindRoutes(); }
function renderOperator() { shell(header('Dashboard Operatore', 'Vede solo percorsi assegnati, avvia turno, invia GPS/foto/note e conclude il percorso.') + routesModule(false, true)); bindLogout(); bindRoutes(); }

function adminModules(superMode) { return html`<section class="grid three admin-grid">${superMode ? companyModule() : ''}${usersModule(superMode)}<article class="card stack"><h2>Regole dati</h2><p class="muted">I dati sono isolati per <code>companyId</code>. Le routes vivono in <code>companies/{companyId}/routes/{routeId}</code>.</p></article></section>`; }
function companyModule() { return html`<article class="card stack"><h2>Aziende</h2><form id="companyForm" class="stack"><label>Nome azienda<input name="nome" required></label><button>Crea azienda</button></form><div class="list">${state.companies.map(c=>`<div class="item"><strong>${esc(c.nome)}</strong><p class="small muted">ID: ${esc(c.id)}</p></div>`).join('') || '<p class="muted">Nessuna azienda.</p>'}</div></article>`; }
function usersModule(superMode) { const list = state.users.filter(u => superMode ? true : u.companyId === companyId()); return html`<article class="card stack"><h2>${superMode ? 'Amministratori azienda' : 'Tecnici e operatori'}</h2><form id="userForm" class="stack"><label>UID utente<input name="uid" required></label><label>Nome<input name="nome" required></label><label>Email<input name="email" type="email" required></label><label>Ruolo<select name="ruolo">${roles.filter(r=>superMode? r==='azienda_admin' : ['tecnico','operatore'].includes(r)).map(r=>`<option>${r}</option>`).join('')}</select></label>${superMode ? `<label>Azienda<select name="companyId">${state.companies.map(c=>`<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</select></label>` : ''}<label>Tecnico responsabile (solo operatori)<input name="tecnicoId"></label><label>Abilitato<select name="enabled"><option value="true">Sì</option><option value="false">No</option></select></label><button>Salva utente</button></form><div class="list">${list.map(u=>`<div class="item"><strong>${esc(u.nome||u.email)}</strong><p class="small muted">${esc(u.ruolo)} · ${u.enabled?'abilitato':'disabilitato'} · azienda ${esc(u.companyId||'')}</p></div>`).join('')}</div></article>`; }
function routesModule(canEdit = false, operator = false) { return html`<section class="grid project-grid"><article class="card stack projects-card"><div class="module-head"><div><h2>Percorsi</h2><p class="muted">Operatori assegnati in <code>assignedOperators[]</code>.</p></div>${canEdit ? '<button id="newRouteBtn">+ Nuovo percorso</button>' : ''}</div>${canEdit ? routeForm() : ''}<div class="list">${state.routes.map(r=>routeItem(r, operator)).join('') || '<p class="muted">Nessun percorso visibile.</p>'}</div></article></section>`; }
function routeForm() { const ops = state.users.filter(u=>u.ruolo==='operatore' && u.companyId===companyId() && (!u.tecnicoId || u.tecnicoId===uid())); return html`<form id="routeForm" class="stack hidden"><label>Nome percorso<input name="nome" required></label><label>Zona<input name="zona" required></label><label>Operatori assegnati<select name="assignedOperators" multiple>${ops.map(o=>`<option value="${o.uid||o.id}">${esc(o.nome||o.email)}</option>`).join('')}</select></label><button>Salva percorso</button></form>`; }
function routeItem(r, operator) { return html`<div class="item stack"><strong>${esc(r.nome)}</strong><p class="small muted">${esc(r.zona||'-')} · tecnico ${esc(r.tecnicoId||'-')} · operatori ${(r.assignedOperators||[]).length}</p>${operator ? `<button class="start-route" data-id="${r.id}">Inizia turno</button>` : ''}</div>`; }

function bindAdmin() { document.getElementById('companyForm')?.addEventListener('submit', e=>safe(()=>saveCompany(e))); document.getElementById('userForm')?.addEventListener('submit', e=>safe(()=>saveUser(e))); }
function bindRoutes() { document.getElementById('newRouteBtn')?.addEventListener('click',()=>document.getElementById('routeForm').classList.toggle('hidden')); document.getElementById('routeForm')?.addEventListener('submit', e=>safe(()=>saveRoute(e))); document.querySelectorAll('.start-route').forEach(b=>b.onclick=()=>startRoute(b.dataset.id)); }
async function saveCompany(e){ e.preventDefault(); const d=Object.fromEntries(new FormData(e.target)); const id=crypto.randomUUID(); await setDocCompat(['companies',id],{nome:d.nome,createdAt:now(),updatedAt:now()}); await refresh('Azienda creata.'); }
async function saveUser(e){ e.preventDefault(); const d=Object.fromEntries(new FormData(e.target)); const payload={uid:d.uid,nome:d.nome,email:d.email,ruolo:d.ruolo,companyId:isSuperAdmin()?d.companyId:companyId(),tecnicoId:d.tecnicoId||'',enabled:d.enabled==='true',createdAt:now(),updatedAt:now()}; await setDocCompat(['users',d.uid],payload,true); await refresh('Utente salvato.'); }
async function saveRoute(e){ e.preventDefault(); const d=Object.fromEntries(new FormData(e.target)); const assigned=[...e.target.elements.assignedOperators.selectedOptions].map(o=>o.value); const id=crypto.randomUUID(); await setDocCompat(['companies',companyId(),'routes',id],{id,companyId:companyId(),tecnicoId:uid(),nome:d.nome,zona:d.zona,assignedOperators:assigned,puntiGps:[],createdAt:now(),updatedAt:now()}); await refresh('Percorso salvato.'); }
function startRoute(id){ const route=state.routes.find(r=>r.id===id); state.activeRoute=route; state.serviceId=crypto.randomUUID(); state.gpsPoints=[]; if(!navigator.geolocation) return alert('GPS non disponibile.'); navigator.geolocation.watchPosition(pos=>{ const point={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy,recordedAt:new Date().toISOString()}; state.gpsPoints.push(point); saveServicePoint(route, point); }, err=>alert(err.message), {enableHighAccuracy:true, maximumAge:5000, timeout:15000}); alert('Turno iniziato. La PWA continua a registrare finché il browser consente il GPS in background/schermo spento.'); }
async function saveServicePoint(route, point){ await setDocCompat(['companies',route.companyId,'routes',route.id,'serviceSessions',state.serviceId],{routeId:route.id,companyId:route.companyId,tecnicoId:route.tecnicoId,operatoreId:uid(),status:'in_corso',gpsTrack:isFirebaseConfigured ? arrayUnion(point) : [point],updatedAt:now()},true); }
async function refresh(msg){ await loadData(); render(); const m=document.getElementById('message'); if(m)m.textContent=msg; }
function docData(s){return {id:s.id,...s.data()};}
function readLocal(k){return JSON.parse(localStorage.getItem('servizioNeve.'+k)||'{}');}
async function setDocCompat(parts,payload,merge=false){ if(isFirebaseConfigured) return setDoc(doc(db,...parts),payload,{merge}); const key=parts[0]==='companies'&&parts[2]==='routes'?'routes':parts[0]; const obj=readLocal(key); obj[parts.at(-1)]={...(merge?obj[parts.at(-1)]:{}),...payload,id:parts.at(-1)}; localStorage.setItem('servizioNeve.'+key,JSON.stringify(obj)); }
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
async function safe(fn,id='message'){try{await fn();}catch(e){console.error(e);const m=document.getElementById(id); if(m)m.textContent=e.message||'Operazione non riuscita.'; else alert(e.message||'Operazione non riuscita.');}}
