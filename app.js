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
import { getUserProfile, login, loginWithGoogle, logout, registerWithGoogle } from './auth.js';

const app = document.getElementById('app');
const html = String.raw;
const roles = ['admin', 'tecnico', 'operatore'];
const state = { user: null, profile: null, loading: true, aziende: [], users: [], percorsi: [], activeRoute: null, watchId: null, serviceId: '', gpsPoints: [] };

onAuthStateChanged(auth, async (user) => {
  state.user = user;
  state.profile = user ? await getUserProfile(user.uid) : null;
  state.loading = false;
  await loadData();
  render();
});

const uid = () => state.profile?.uid || state.user?.uid || '';
const isEnabled = (u = state.profile) => u?.stato === 'abilitato';
const isAdmin = () => state.profile?.ruolo === 'admin';
const role = () => state.profile?.ruolo || state.profile?.role;
const aziendaId = () => state.profile?.aziendaId || '';
const companyId = aziendaId;
const now = () => isFirebaseConfigured ? serverTimestamp() : new Date().toISOString();

async function loadData() {
  state.aziende = []; state.users = []; state.percorsi = [];
  if (!state.profile || !isEnabled()) return;
  if (!isFirebaseConfigured) {
    state.aziende = Object.values(readLocal('aziende'));
    state.users = Object.values(readLocal('users'));
    state.percorsi = Object.values(readLocal('percorsi')).filter(canSeeRoute);
    return;
  }
  const usersQuery = query(collection(db, 'users'), where('aziendaId', '==', companyId()));
  const aziendeQuery = query(collection(db, 'aziende'), where('__name__', '==', companyId()));
  const percorsiQuery = query(collection(db, 'aziende', companyId(), 'percorsi'), orderBy('createdAt'));
  const [cSnap, uSnap, rSnap] = await Promise.all([getDocs(aziendeQuery), getDocs(usersQuery), getDocs(percorsiQuery)]);
  state.aziende = cSnap.docs.map(docData);
  state.users = uSnap.docs.map(docData);
  state.percorsi = rSnap.docs.map(docData).filter(canSeeRoute);
}

function canSeeRoute(route) {
  if (isAdmin()) return true;
  if (route.aziendaId !== companyId()) return false;
  if (role() === 'admin') return true;
  if (role() === 'tecnico') return route.tecnicoId === uid();
  return route.tecnicoId === state.profile?.tecnicoId;
}

function render() {
  if (state.loading) return shell('<section class="card"><p>Caricamento...</p></section>');
  if (!state.user) return renderAuth();
  if (!isEnabled()) return renderWaiting();
  if (role() === 'admin') return renderAdmin();
  if (role() === 'tecnico') return renderTechnician();
  return renderOperator();
}

function shell(content, status = 'Dashboard aperta automaticamente in base al ruolo letto da Firestore.') {
  app.innerHTML = html`<section class="hero card"><div><span class="pill">Servizio Neve PWA</span><h1>Servizio Neve</h1><p class="muted">Firebase Authentication, Cloud Firestore, GPS, note e foto per squadre neve multi azienda.</p></div><div class="notice">${status}</div></section>${content}`;
}

function header(title, subtitle) { return html`<section class="card stack"><div class="dashboard-head"><div><span class="pill">${esc(state.profile.nome || state.profile.email)}</span><h2>${title}</h2><p class="muted">${subtitle}</p></div><button id="logoutBtn" class="secondary">Esci</button></div><p id="message" class="notice compact">Pronto.</p></section>`; }
function bindLogout() { document.getElementById('logoutBtn').onclick = logout; }

function renderAuth(mode = 'login') {
  shell(html`<section class="grid two auth-grid"><article class="card stack"><h2>${mode === 'login' ? 'Login' : 'Registrazione'}</h2><p class="muted">L’accesso usa Firebase Authentication; dopo il login viene letto <code>users/{userId}</code> e viene aperta la dashboard corretta.</p><div class="tabs"><button id="showLogin" class="${mode === 'login' ? '' : 'secondary'}">Login</button><button id="showRegister" class="${mode === 'register' ? '' : 'secondary'}">Registrazione</button></div></article><article class="card stack"><form id="authForm" class="stack">${mode === 'register' ? '<label>Nome<input name="nome" required></label><label>Ruolo<select name="ruolo"><option value="operatore">operatore</option><option value="tecnico">tecnico</option><option value="admin">admin</option></select></label><label>Azienda ID<input name="aziendaId" required></label><label>Tecnico ID (per operatori)<input name="tecnicoId"></label>' : ''}${mode === 'login' ? '<label>Email<input name="email" type="email"></label><label>Password<input name="password" type="password" minlength="6"></label>' : '<p class="muted">La registrazione usa Google: compila ruolo e azienda, poi scegli l’account Google.</p>'}<button>${mode === 'login' ? 'Accedi con email' : 'Registrati con Google'}</button></form>${mode === 'login' ? '<button id="googleLoginBtn" class="secondary">Accedi con Google</button>' : ''}<p id="authMsg" class="error"></p></article></section>`);
  document.getElementById('showLogin').onclick = () => renderAuth('login');
  document.getElementById('showRegister').onclick = () => renderAuth('register');
  document.getElementById('googleLoginBtn')?.addEventListener('click', () => safe(loginWithGoogle, 'authMsg'));
  document.getElementById('authForm').onsubmit = (e) => safe(async () => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.target)); mode === 'login' ? await login(d.email, d.password) : await registerWithGoogle(d); }, 'authMsg');
}
function renderWaiting() { shell(html`<section class="card stack waiting-card"><h2>Account non abilitato</h2><p class="muted">Solo un admin può abilitarlo impostando stato=abilitato. Se resta in_attesa, non puoi accedere ai dati aziendali.</p><button id="logoutBtn" class="secondary">Esci</button></section>`); bindLogout(); }

function renderAdmin() { shell(header('Dashboard Admin', 'Vede solo la propria azienda e abilita o blocca tecnici e operatori in attesa.') + adminModules(false) + percorsiModule()); bindLogout(); bindAdmin(); bindRoutes(); }
function renderTechnician() { shell(header('Dashboard Tecnico', 'Crea e modifica percorsi, assegna operatori e vede solo i propri percorsi.') + percorsiModule(true)); bindLogout(); bindRoutes(); }
function renderOperator() { shell(header('Dashboard Operatore', 'Vede solo percorsi assegnati, avvia turno, invia GPS/foto/note e conclude il percorso.') + percorsiModule(false, true)); bindLogout(); bindRoutes(); }

function adminModules(superMode) { return html`<section class="grid three admin-grid">${superMode ? companyModule() : ''}${usersModule(superMode)}<article class="card stack"><h2>Regole dati</h2><p class="muted">I dati sono isolati per <code>aziendaId</code>. Le percorsi vivono in <code>aziende/{aziendaId}/percorsi/{routeId}</code>.</p></article></section>`; }
function companyModule() { return html`<article class="card stack"><h2>Aziende</h2><form id="companyForm" class="stack"><label>Nome azienda<input name="nome" required></label><button>Crea azienda</button></form><div class="list">${state.aziende.map(c=>`<div class="item"><strong>${esc(c.nome)}</strong><p class="small muted">ID: ${esc(c.id)}</p></div>`).join('') || '<p class="muted">Nessuna azienda.</p>'}</div></article>`; }
function usersModule(superMode) { const list = state.users.filter(u => superMode ? true : u.aziendaId === companyId()); return html`<article class="card stack"><h2>${superMode ? 'Amministratori azienda' : 'Tecnici e operatori'}</h2><form id="userForm" class="stack"><label>UID utente<input name="uid" required></label><label>Nome<input name="nome" required></label><label>Email<input name="email" type="email" required></label><label>Ruolo<select name="ruolo">${roles.filter(r=>superMode? r==='azienda_admin' : ['tecnico','operatore'].includes(r)).map(r=>`<option>${r}</option>`).join('')}</select></label>${superMode ? `<label>Azienda<select name="aziendaId">${state.aziende.map(c=>`<option value="${c.id}">${esc(c.nome)}</option>`).join('')}</select></label>` : ''}<label>Tecnico responsabile (solo operatori)<input name="tecnicoId"></label><label>Stato<select name="stato"><option value="in_attesa">in_attesa</option><option value="abilitato">abilitato</option><option value="bloccato">bloccato</option></select></label><button>Salva utente</button></form><div class="list">${list.map(u=>`<div class="item"><strong>${esc(u.nome||u.email)}</strong><p class="small muted">${esc(u.ruolo)} · ${esc(u.stato||'in_attesa')} · azienda ${esc(u.aziendaId||'')}</p></div>`).join('')}</div></article>`; }
function percorsiModule(canEdit = false, operator = false) { return html`<section class="grid project-grid"><article class="card stack projects-card"><div class="module-head"><div><h2>Percorsi</h2><p class="muted">Percorsi in <code>aziende/{aziendaId}/percorsi</code>; progetti collegati in <code>aziende/{aziendaId}/progetti</code>.</p></div>${canEdit ? '<button id="newRouteBtn">+ Nuovo percorso</button>' : ''}</div>${canEdit ? routeForm() : ''}<div class="list">${state.percorsi.map(r=>routeItem(r, operator)).join('') || '<p class="muted">Nessun percorso visibile.</p>'}</div></article></section>`; }
function routeForm() { const ops = state.users.filter(u=>u.ruolo==='operatore' && u.aziendaId===companyId() && (!u.tecnicoId || u.tecnicoId===uid())); return html`<form id="routeForm" class="stack hidden"><label>Nome percorso<input name="nome" required></label><label>Descrizione<input name="descrizione"></label><label>Operatori assegnati<select name="assignedOperators" multiple>${ops.map(o=>`<option value="${o.uid||o.id}">${esc(o.nome||o.email)}</option>`).join('')}</select></label><button>Salva percorso</button></form>`; }
function routeItem(r, operator) { return html`<div class="item stack"><strong>${esc(r.nome)}</strong><p class="small muted">${esc(r.descrizione||'-')} · tecnico ${esc(r.tecnicoId||'-')} · stato ${esc(r.stato||'bozza')}</p>${operator ? `<button class="start-route" data-id="${r.id}">Inizia turno</button>` : ''}</div>`; }

function bindAdmin() { document.getElementById('companyForm')?.addEventListener('submit', e=>safe(()=>saveCompany(e))); document.getElementById('userForm')?.addEventListener('submit', e=>safe(()=>saveUser(e))); }
function bindRoutes() { document.getElementById('newRouteBtn')?.addEventListener('click',()=>document.getElementById('routeForm').classList.toggle('hidden')); document.getElementById('routeForm')?.addEventListener('submit', e=>safe(()=>saveRoute(e))); document.querySelectorAll('.start-route').forEach(b=>b.onclick=()=>startRoute(b.dataset.id)); }
async function saveCompany(e){ e.preventDefault(); const d=Object.fromEntries(new FormData(e.target)); const id=crypto.randomUUID(); await setDocCompat(['aziende',id],{nome:d.nome,createdAt:now(),updatedAt:now()}); await refresh('Azienda creata.'); }
async function saveUser(e){ e.preventDefault(); const d=Object.fromEntries(new FormData(e.target)); const payload={uid:d.uid,nome:d.nome,email:d.email,ruolo:d.ruolo,aziendaId:companyId(),tecnicoId:d.tecnicoId||'',stato:d.stato||'in_attesa',createdAt:now()}; await setDocCompat(['users',d.uid],payload,true); await refresh('Utente salvato.'); }
async function saveRoute(e){ e.preventDefault(); const d=Object.fromEntries(new FormData(e.target)); const assigned=[...e.target.elements.assignedOperators.selectedOptions].map(o=>o.value); const id=crypto.randomUUID(); await setDocCompat(['aziende',companyId(),'percorsi',id],{id,aziendaId:companyId(),tecnicoId:uid(),nome:d.nome,descrizione:d.descrizione,stato:'bozza',createdAt:now()}); await refresh('Percorso salvato.'); }
function startRoute(id){ const route=state.percorsi.find(r=>r.id===id); state.activeRoute=route; state.serviceId=crypto.randomUUID(); state.gpsPoints=[]; if(!navigator.geolocation) return alert('GPS non disponibile.'); navigator.geolocation.watchPosition(pos=>{ const point={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy,recordedAt:new Date().toISOString()}; state.gpsPoints.push(point); saveServicePoint(route, point); }, err=>alert(err.message), {enableHighAccuracy:true, maximumAge:5000, timeout:15000}); alert('Turno iniziato. La PWA continua a registrare finché il browser consente il GPS in background/schermo spento.'); }
async function saveServicePoint(route, point){ await setDocCompat(['aziende',route.aziendaId,'percorsi',route.id,'serviceSessions',state.serviceId],{routeId:route.id,aziendaId:route.aziendaId,tecnicoId:route.tecnicoId,operatoreId:uid(),status:'in_corso',gpsTrack:isFirebaseConfigured ? arrayUnion(point) : [point],updatedAt:now()},true); }
async function refresh(msg){ await loadData(); render(); const m=document.getElementById('message'); if(m)m.textContent=msg; }
function docData(s){return {id:s.id,...s.data()};}
function readLocal(k){return JSON.parse(localStorage.getItem('servizioNeve.'+k)||'{}');}
async function setDocCompat(parts,payload,merge=false){ if(isFirebaseConfigured) return setDoc(doc(db,...parts),payload,{merge}); const key=parts[0]==='aziende'&&parts[2]==='percorsi'?'percorsi':parts[0]; const obj=readLocal(key); obj[parts.at(-1)]={...(merge?obj[parts.at(-1)]:{}),...payload,id:parts.at(-1)}; localStorage.setItem('servizioNeve.'+key,JSON.stringify(obj)); }
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
async function safe(fn,id='message'){try{await fn();}catch(e){console.error(e);const m=document.getElementById(id); if(m)m.textContent=e.message||'Operazione non riuscita.'; else alert(e.message||'Operazione non riuscita.');}}
