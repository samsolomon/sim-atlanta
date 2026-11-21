/**
 * "Where am I looking?": the City of Atlanta neighbourhood under a point, for the status card.
 * Loads `/data/ga/neighborhoods.json` (pipeline/scripts/neighborhoods.py) lazily. Outside the
 * city it falls back to "Metro Atlanta" near the city and "Georgia" beyond.
 */

type Ring = number[][];
interface Place {
  name: string;
  polys: Ring[][]; // polygons → rings (first is the outer ring)
  bbox: [number, number, number, number]; // minLon, minLat, maxLon, maxLat
}

let places: Place[] | null = null;
let loading: Promise<void> | null = null;

export function loadPlaces(url = '/data/ga/neighborhoods.json'): Promise<void> {
  loading ??= fetch(url)
    .then((r) => (r.ok ? r.json() : { features: [] }))
    .then((fc: { features: { properties: { name: string }; geometry: { type: string; coordinates: unknown } }[] }) => {
      places = fc.features.map((f) => {
        const polys = (f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates : [f.geometry.coordinates]) as Ring[][];
        const bbox: Place['bbox'] = [Infinity, Infinity, -Infinity, -Infinity];
        for (const poly of polys)
          for (const [x, y] of poly[0]) {
            bbox[0] = Math.min(bbox[0], x);
            bbox[1] = Math.min(bbox[1], y);
            bbox[2] = Math.max(bbox[2], x);
            bbox[3] = Math.max(bbox[3], y);
          }
        return { name: f.properties.name, polys, bbox };
      });
    })
    .catch(() => {
      places = [];
    });
  return loading;
}

function inRing(x: number, y: number, ring: Ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const DOWNTOWN = { lon: -84.39, lat: 33.755 };

/** The neighbourhood name at a lon/lat, or a broader fallback (null until the data loads). */
export function placeAt(lon: number, lat: number): string | null {
  if (!places) return null;
  for (const p of places) {
    if (lon < p.bbox[0] || lon > p.bbox[2] || lat < p.bbox[1] || lat > p.bbox[3]) continue;
    for (const poly of p.polys) {
      if (inRing(lon, lat, poly[0]) && !poly.slice(1).some((hole) => inRing(lon, lat, hole))) return p.name;
    }
  }
  const km = Math.hypot((lon - DOWNTOWN.lon) * 92.6, (lat - DOWNTOWN.lat) * 111.2);
  return km < 45 ? 'Metro Atlanta' : 'Georgia';
}

// Scene metres (x east, z −north) ↔ lon/lat around an origin, matching scene3d/scene-data.ts.
const R = 6_371_008.8;
const DEG = Math.PI / 180;
export function sceneToLonLat(origin: { lon: number; lat: number }, x: number, z: number): [number, number] {
  const k = Math.cos(origin.lat * DEG);
  return [origin.lon + x / (DEG * R * k), origin.lat - z / (DEG * R)];
}
export function lonLatToScene(origin: { lon: number; lat: number }, lon: number, lat: number): [number, number] {
  const k = Math.cos(origin.lat * DEG);
  return [(lon - origin.lon) * DEG * R * k, -(lat - origin.lat) * DEG * R];
}
