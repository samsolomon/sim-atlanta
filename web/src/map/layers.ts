import type { GeoJSONSource, Map as MlMap } from 'maplibre-gl';
import type { Mode, Route, RoutesFile } from '../model/types';

/**
 * Colour means the kind of service, the same in every city:
 * city rail = blue, intercity passenger = violet, freight = rust.
 * An agency's own line colours (MARTA Red/Gold/…) are an accent only: in cards,
 * and as a tint on city rail once zoomed into a single city.
 */
export const MODE_COLOR: Record<Mode, string> = {
  heavy_rail: '#1f5fd1',
  light_rail: '#3b82e6',
  streetcar: '#3b82e6',
  intercity: '#7b3fe4',
  freight: '#c2410c',
};
export const modeColor = (r: Route) => MODE_COLOR[r.mode] ?? '#495057';
/** The agency's line colour (for cards and close-zoom tint); falls back to the mode colour. */
export const routeColor = (r: Route) => (r.mode === 'intercity' ? modeColor(r) : r.color);
/** Zoom at which city rail switches from the mode colour to the agency's line colours. */
export const AGENCY_TINT_ZOOM = 12.5;

const FREIGHT = MODE_COLOR.freight;

export function addStaticLayers(map: MlMap, rf: RoutesFile, freightUrl: string, crossingsUrl: string) {
  const routes = new Map(rf.routes.map((r) => [r.id, r]));

  map.addSource('freight', { type: 'geojson', data: freightUrl });
  map.addSource('crossings', { type: 'geojson', data: crossingsUrl });
  map.addSource('transit', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: rf.paths.map((p) => {
        const r = routes.get(p.routeId)!;
        const coordinates: [number, number][] = [];
        for (let i = 0; i < p.coords.length; i += 2) coordinates.push([p.coords[i], p.coords[i + 1]]);
        return {
          type: 'Feature',
          properties: { id: p.id, routeId: r.id, name: r.longName, mode: r.mode, color: modeColor(r), agency: routeColor(r) },
          geometry: { type: 'LineString', coordinates },
        };
      }),
    },
  });
  map.addSource('stations', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: dedupeStations(rf).map((s) => ({
        type: 'Feature',
        properties: { name: s.name },
        geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      })),
    },
  });

  const width = (base: number) =>
    ['interpolate', ['exponential', 1.6], ['zoom'], 6, base * 0.4, 10, base, 14, base * 2.4] as unknown as number;

  // Freight: unknown traffic = faint grey; reported = solid + glow; inferred = dashed.
  map.addLayer({
    id: 'freight-unknown',
    type: 'line',
    source: 'freight',
    filter: ['==', ['get', 'tpdTier'], null],
    paint: { 'line-color': '#9aa3ad', 'line-width': width(0.8), 'line-opacity': 0.6 },
  });
  map.addLayer({
    id: 'freight-glow',
    type: 'line',
    source: 'freight',
    filter: ['==', ['get', 'tpdTier'], 'reported'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': FREIGHT,
      'line-width': ['interpolate', ['linear'], ['zoom'], 6, ['*', 0.12, ['coalesce', ['get', 'tpd'], 0]], 12, ['*', 0.5, ['coalesce', ['get', 'tpd'], 0]]] as unknown as number,
      'line-blur': ['interpolate', ['linear'], ['zoom'], 6, 2, 12, 8] as unknown as number,
      'line-opacity': 0.35,
    },
  });
  map.addLayer({
    id: 'freight-inferred',
    type: 'line',
    source: 'freight',
    filter: ['==', ['get', 'tpdTier'], 'inferred'],
    paint: { 'line-color': FREIGHT, 'line-width': width(1.4), 'line-dasharray': [2, 1.5], 'line-opacity': 0.7 },
  });
  map.addLayer({
    id: 'freight-reported',
    type: 'line',
    source: 'freight',
    filter: ['==', ['get', 'tpdTier'], 'reported'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': FREIGHT,
      // Busier line = thicker: 1.2 px for a quiet branch up to ~3.5 px for 50+ trains/day at zoom 10.
      'line-width': [
        'interpolate', ['exponential', 1.6], ['zoom'],
        6, ['*', 0.4, ['+', 1, ['/', ['coalesce', ['get', 'tpd'], 0], 20]]],
        10, ['+', 1.2, ['/', ['coalesce', ['get', 'tpd'], 0], 20]],
        14, ['*', 2.4, ['+', 1.2, ['/', ['coalesce', ['get', 'tpd'], 0], 20]]],
      ] as unknown as number,
    },
  });
  // Invisible fat line so thin freight track is easy to tap.
  map.addLayer({
    id: 'freight-hit',
    type: 'line',
    source: 'freight',
    paint: { 'line-color': '#000', 'line-opacity': 0, 'line-width': 14 },
  });

  map.addLayer({
    id: 'transit-casing',
    type: 'line',
    source: 'transit',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': '#ffffff', 'line-width': width(4.5) },
  });
  map.addLayer({
    id: 'transit',
    type: 'line',
    source: 'transit',
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': ['step', ['zoom'], ['get', 'color'], AGENCY_TINT_ZOOM, ['get', 'agency']] as unknown as string,
      'line-width': width(2.6),
    },
  });

  map.addLayer({
    id: 'crossings',
    type: 'circle',
    source: 'crossings',
    minzoom: 11,
    paint: {
      // Street-level crossings are the train-watching spots: coloured by traffic.
      // Bridges/underpasses are small grey dots so they don't read as stations.
      'circle-radius': [
        'interpolate', ['linear'], ['zoom'],
        11, ['case', ['==', ['get', 'position'], 'At Grade'], 2.5, 1.5],
        15, ['case', ['==', ['get', 'position'], 'At Grade'], 6, 3],
      ] as unknown as number,
      'circle-color': [
        'case',
        ['==', ['get', 'position'], 'At Grade'],
        ['step', ['+', ['get', 'dayTrains'], ['get', 'nightTrains']], '#adb5bd', 5, FREIGHT],
        '#868e96',
      ] as unknown as string,
      'circle-stroke-color': ['case', ['==', ['get', 'position'], 'At Grade'], '#495057', '#ffffff'] as unknown as string,
      'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 11, 0.5, 15, 1.2] as unknown as number,
    },
  });

  map.addLayer({
    id: 'stations',
    type: 'circle',
    source: 'stations',
    minzoom: 10,
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, 2.5, 15, 6] as unknown as number,
      'circle-color': '#ffffff',
      'circle-stroke-color': '#1d232b',
      'circle-stroke-width': 1.5,
    },
  });
  map.addLayer({
    id: 'station-labels',
    type: 'symbol',
    source: 'stations',
    minzoom: 12.5,
    layout: {
      'text-field': ['get', 'name'] as unknown as string,
      'text-font': ['Noto Sans Regular'],
      'text-size': 11,
      'text-offset': [0, 1.1],
      'text-anchor': 'top',
      'text-optional': true,
    },
    paint: { 'text-color': '#1d232b', 'text-halo-color': '#ffffff', 'text-halo-width': 1.4 },
  });
}

/** MARTA lists one stop per platform; collapse same-named stops within ~300 m to one dot. */
function dedupeStations(rf: RoutesFile) {
  const out: { name: string; lon: number; lat: number }[] = [];
  for (const s of rf.stops) {
    const name = s.name.replace(/\s+(STATION|Station)\b.*$/, '').replace(/\s*\((NB|SB|EB|WB)\)$/i, '');
    const near = out.find((o) => o.name === name && Math.abs(o.lon - s.lon) < 0.003 && Math.abs(o.lat - s.lat) < 0.003);
    if (!near) out.push({ name, lon: s.lon, lat: s.lat });
  }
  return out;
}

export function trainsSource(map: MlMap) {
  return map.getSource('trains') as GeoJSONSource;
}
