import {
  addDoc,
  arrayUnion,
  collection,
  db,
  doc,
  getDocs,
  isFirebaseConfigured,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from './firebase.js';

const users = () => collection(db, 'users');
const projects = () => collection(db, 'projects');
const routes = () => collection(db, 'routes');
const serviceSessions = () => collection(db, 'serviceSessions');
const now = () => (isFirebaseConfigured ? serverTimestamp() : new Date().toISOString());

function readLocal(name, fallback = {}) {
  return JSON.parse(localStorage.getItem(`servizioNeve.${name}`) || JSON.stringify(fallback));
}

function writeLocal(name, value) {
  localStorage.setItem(`servizioNeve.${name}`, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('servizio-neve-local-change'));
}

function addLocal(name, value) {
  const records = readLocal(name);
  const id = crypto.randomUUID();
  records[id] = { id, ...value };
  writeLocal(name, records);
  return { id };
}

function updateLocal(name, id, patch) {
  const records = readLocal(name);
  records[id] = { ...(records[id] || { id }), ...patch };
  writeLocal(name, records);
}

function subscribeLocal(callback) {
  callback();
  const listener = () => callback();
  window.addEventListener('servizio-neve-local-change', listener);
  return () => window.removeEventListener('servizio-neve-local-change', listener);
}

export function dataScope(profile) {
  return {
    companyId: profile?.companyId || null,
    technicianId: profile?.role === 'tecnico' ? profile.uid : profile?.linkedTechnicianId || null,
    technicianCode: profile?.role === 'tecnico' ? profile.codiceTecnico : profile?.linkedTechnicianCode || null,
  };
}

export async function findTechnicianByCode(companyId, codiceTecnico) {
  if (!isFirebaseConfigured) {
    return Object.values(readLocal('users')).find((user) => user.companyId === companyId && user.role === 'tecnico' && user.codiceTecnico === codiceTecnico) || null;
  }

  const q = query(users(), where('companyId', '==', companyId), where('role', '==', 'tecnico'), where('codiceTecnico', '==', codiceTecnico), limit(1));
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : snapshot.docs[0].data();
}

export async function linkOperatorToTechnician(operatorProfile) {
  if (operatorProfile.role !== 'operatore' || operatorProfile.linkedTechnicianId) return operatorProfile;
  const technician = await findTechnicianByCode(operatorProfile.companyId, operatorProfile.linkedTechnicianCode);
  if (!technician) return operatorProfile;

  if (isFirebaseConfigured) {
    await updateDoc(doc(db, 'users', operatorProfile.uid), { linkedTechnicianId: technician.uid });
  } else {
    updateLocal('users', operatorProfile.uid, { linkedTechnicianId: technician.uid });
  }

  return { ...operatorProfile, linkedTechnicianId: technician.uid };
}

export function subscribeProjects(profile, callback) {
  const scope = dataScope(profile);
  if (!isFirebaseConfigured) {
    return subscribeLocal(() => {
      const allProjects = Object.values(readLocal('projects'));
      const scopedProjects = allProjects.filter((project) => {
        if (profile.role === 'super_admin') return true;
        if (profile.role === 'azienda_admin') return project.companyId === scope.companyId;
        return project.companyId === scope.companyId && project.technicianId === scope.technicianId;
      });
      callback(scopedProjects.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))));
    });
  }

  let q;
  if (profile.role === 'super_admin') {
    q = query(projects(), orderBy('createdAt', 'desc'));
  } else if (profile.role === 'azienda_admin') {
    q = query(projects(), where('companyId', '==', scope.companyId), orderBy('createdAt', 'desc'));
  } else {
    q = query(projects(), where('companyId', '==', scope.companyId), where('technicianId', '==', scope.technicianId), orderBy('createdAt', 'desc'));
  }
  return onSnapshot(q, (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export function subscribeOperators(profile, callback) {
  if (!isFirebaseConfigured) {
    return subscribeLocal(() => {
      const operators = Object.values(readLocal('users')).filter((user) => user.companyId === profile.companyId && user.role === 'operatore' && user.linkedTechnicianId === profile.uid);
      callback(operators);
    });
  }

  const q = query(users(), where('companyId', '==', profile.companyId), where('role', '==', 'operatore'), where('linkedTechnicianId', '==', profile.uid));
  return onSnapshot(q, (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function createProject(profile, formData) {
  const project = {
    name: formData.get('name'),
    area: formData.get('area'),
    notes: formData.get('notes') || '',
    companyId: profile.companyId,
    technicianId: profile.uid,
    technicianCode: profile.codiceTecnico,
    assignedOperatorIds: [],
    createdAt: now(),
  };

  return isFirebaseConfigured ? addDoc(projects(), project) : addLocal('projects', project);
}

export async function saveRoute(profile, projectId, points, corrected = false) {
  const route = { projectId, points, corrected, companyId: profile.companyId, technicianId: profile.uid, createdAt: now() };

  if (!isFirebaseConfigured) {
    const routeRef = addLocal('routes', route);
    updateLocal('projects', projectId, { routeId: routeRef.id, updatedAt: now() });
    return routeRef;
  }

  const routeRef = await addDoc(routes(), route);
  await updateDoc(doc(db, 'projects', projectId), { routeId: routeRef.id, updatedAt: serverTimestamp() });
  return routeRef;
}

export async function assignOperator(projectId, operatorId) {
  if (!isFirebaseConfigured) {
    const project = readLocal('projects')[projectId];
    const assignedOperatorIds = [...new Set([...(project?.assignedOperatorIds || []), operatorId])];
    updateLocal('projects', projectId, { assignedOperatorIds, updatedAt: now() });
    return;
  }

  await updateDoc(doc(db, 'projects', projectId), { assignedOperatorIds: arrayUnion(operatorId), updatedAt: serverTimestamp() });
}

export function subscribeRoute(routeId, callback) {
  if (!routeId) return () => callback(null);
  if (!isFirebaseConfigured) return subscribeLocal(() => callback(readLocal('routes')[routeId] || null));
  return onSnapshot(doc(db, 'routes', routeId), (snapshot) => callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null));
}

export async function startService(profile, project) {
  const service = {
    status: 'in_corso',
    companyId: profile.companyId,
    technicianId: profile.linkedTechnicianId,
    operatorId: profile.uid,
    projectId: project.id,
    startedAt: now(),
    gpsPoints: [],
    notes: '',
    photoUrls: [],
  };

  return isFirebaseConfigured ? addDoc(serviceSessions(), service) : addLocal('serviceSessions', service);
}

export async function appendGpsPoint(sessionId, point) {
  if (!isFirebaseConfigured) {
    const session = readLocal('serviceSessions')[sessionId];
    updateLocal('serviceSessions', sessionId, { gpsPoints: [...(session?.gpsPoints || []), point], lastPointAt: now() });
    return;
  }

  await updateDoc(doc(db, 'serviceSessions', sessionId), { gpsPoints: arrayUnion(point), lastPointAt: serverTimestamp() });
}

export async function finishService(sessionId, { durationSeconds, notes, photoUrls }) {
  const patch = { status: 'concluso', durationSeconds, notes, photoUrls, endedAt: now() };
  if (!isFirebaseConfigured) return updateLocal('serviceSessions', sessionId, patch);
  await updateDoc(doc(db, 'serviceSessions', sessionId), { ...patch, endedAt: serverTimestamp() });
}
