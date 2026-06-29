export type UserRole = 'azienda_admin' | 'tecnico' | 'operatore';

export type RoutePoint = {
  lat: number;
  lng: number;
  recordedAt: string;
};

export type SnowRoute = {
  id: string;
  name: string;
  area: string;
  assignedTo: string;
  points: RoutePoint[];
};

export type SnowService = {
  id: string;
  routeId: string;
  operatorName: string;
  startedAt: string;
  endedAt?: string;
  points: RoutePoint[];
  km: number;
  notes: string;
  status: 'active' | 'completed';
};

export type AppState = {
  role: UserRole;
  userName: string;
  routes: SnowRoute[];
  services: SnowService[];
};
