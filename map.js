let map;
let routeLayer;
let liveLayer;

export function initMap(elementId) {
  const element = document.getElementById(elementId);
  if (!element || typeof L === 'undefined') return null;
  if (map) map.remove();
  map = L.map(elementId).setView([45.4642, 9.19], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map);
  routeLayer = L.layerGroup().addTo(map);
  liveLayer = L.layerGroup().addTo(map);
  setTimeout(() => map.invalidateSize(), 100);
  return map;
}

export function drawRoute(points = [], options = {}) {
  if (!map || !routeLayer) return;
  routeLayer.clearLayers();
  const latLngs = points.map((p) => [Number(p.lat), Number(p.lng)]).filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
  if (!latLngs.length) return;
  L.polyline(latLngs, { color: options.color || '#2563eb', weight: 5 }).addTo(routeLayer);
  L.marker(latLngs[0]).addTo(routeLayer).bindPopup('Inizio percorso');
  L.marker(latLngs[latLngs.length - 1]).addTo(routeLayer).bindPopup('Fine percorso');
  map.fitBounds(latLngs, { padding: [24, 24] });
}

export function drawLivePoint(point) {
  if (!map || !liveLayer || !point) return;
  liveLayer.clearLayers();
  const latLng = [point.lat, point.lng];
  L.circleMarker(latLng, { radius: 8, color: '#0f766e', fillColor: '#14b8a6', fillOpacity: 0.9 }).addTo(liveLayer).bindPopup('Posizione operatore');
  map.setView(latLng, Math.max(map.getZoom(), 15));
}

export function parseRouteText(text) {
  return text
    .split('\n')
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const [lat, lng] = row.split(',').map((value) => Number(value.trim()));
      return { lat, lng };
    })
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}
