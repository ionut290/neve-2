import {RoutePoint} from './types';

const EARTH_RADIUS_KM = 6371;

export function pointFromPosition(position: GeolocationPosition): RoutePoint {
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    recordedAt: new Date(position.timestamp).toISOString(),
  };
}

export function calculateDistanceKm(points: RoutePoint[]): number {
  return points.slice(1).reduce((total, point, index) => total + distance(points[index], point), 0);
}

export function formatDuration(startedAt: string, endedAt?: string): string {
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const totalSeconds = Math.max(0, Math.round((end - new Date(startedAt).getTime()) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

function distance(a: RoutePoint, b: RoutePoint): number {
  const deltaLat = toRad(b.lat - a.lat);
  const deltaLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const haversine = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}
