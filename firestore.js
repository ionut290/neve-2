import {
  addDoc,
  arrayUnion,
  collection,
  db,
  doc,
  getDocs,
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

export function dataScope(profile) {
  return {
    companyId: profile?.companyId || null,
    technicianId: profile?.role === 'tecnico' ? profile.uid : profile?.linkedTechnicianId || null,
    technicianCode: profile?.role === 'tecnico' ? profile.codiceTecnico : profile?.linkedTechnicianCode || null,
  };
}

export async function findTechnicianByCode(companyId, codiceTecnico) {
  const q = query(users(), where('companyId', '==', companyId), where('role', '==', 'tecnico'), where('codiceTecnico', '==', codiceTecnico), limit(1));
  const snapshot = await getDocs(q);
  return snapshot.empty ? null : snapshot.docs[0].data();
}

export async function linkOperatorToTechnician(operatorProfile) {
  if (operatorProfile.role !== 'operatore' || operatorProfile.linkedTechnicianId) return operatorProfile;
  const technician = await findTechnicianByCode(operatorProfile.companyId, operatorProfile.linkedTechnicianCode);
  if (!technician) return operatorProfile;
  await updateDoc(doc(db, 'users', operatorProfile.uid), { linkedTechnicianId: technician.uid });
  return { ...operatorProfile, linkedTechnicianId: technician.uid };
}

export function subscribeProjects(profile, callback) {
  const scope = dataScope(profile);
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
  const q = query(users(), where('companyId', '==', profile.companyId), where('role', '==', 'operatore'), where('linkedTechnicianId', '==', profile.uid));
  return onSnapshot(q, (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))));
}

export async function createProject(profile, formData) {
  return addDoc(projects(), {
    name: formData.get('name'),
    area: formData.get('area'),
    notes: formData.get('notes') || '',
    companyId: profile.companyId,
    technicianId: profile.uid,
    technicianCode: profile.codiceTecnico,
    assignedOperatorIds: [],
    createdAt: serverTimestamp(),
  });
}

export async function saveRoute(profile, projectId, points, corrected = false) {
  const routeRef = await addDoc(routes(), {
    projectId,
    points,
    corrected,
    companyId: profile.companyId,
    technicianId: profile.uid,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'projects', projectId), { routeId: routeRef.id, updatedAt: serverTimestamp() });
  return routeRef;
}

export async function assignOperator(projectId, operatorId) {
  await updateDoc(doc(db, 'projects', projectId), { assignedOperatorIds: arrayUnion(operatorId), updatedAt: serverTimestamp() });
}

export function subscribeRoute(routeId, callback) {
  if (!routeId) return () => callback(null);
  return onSnapshot(doc(db, 'routes', routeId), (snapshot) => callback(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null));
}

export async function startService(profile, project) {
  return addDoc(serviceSessions(), {
    status: 'in_corso',
    companyId: profile.companyId,
    technicianId: profile.linkedTechnicianId,
    operatorId: profile.uid,
    projectId: project.id,
    startedAt: serverTimestamp(),
    gpsPoints: [],
    notes: '',
    photoUrls: [],
  });
}

export async function appendGpsPoint(sessionId, point) {
  await updateDoc(doc(db, 'serviceSessions', sessionId), { gpsPoints: arrayUnion(point), lastPointAt: serverTimestamp() });
}

export async function finishService(sessionId, { durationSeconds, notes, photoUrls }) {
  await updateDoc(doc(db, 'serviceSessions', sessionId), {
    status: 'concluso',
    durationSeconds,
    notes,
    photoUrls,
    endedAt: serverTimestamp(),
  });
}
