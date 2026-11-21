/**
 * The 2D basemap in the diorama's palette: OpenFreeMap's positron style (fetched live, so tile,
 * glyph and sprite URLs stay current) recoloured to warm paper, sage parks, soft water and
 * thin ink-brown roads. Rail and transit drawn by us keep their service colours on top.
 */
import type { StyleSpecification } from 'maplibre-gl';

export const POSITRON = 'https://tiles.openfreemap.org/styles/positron';

const P = {
  paper: '#ece6d8',
  park: '#d3dbbd',
  wood: '#c8d2ad',
  water: '#a9c0c6',
  waterLine: '#9db5bc',
  resi: '#e6dfcf',
  building: '#ddd3bf',
  buildingLine: '#c4b89f',
  casing: '#c2b69c',
  casingMajor: '#b3a68a',
  minor: '#f6f1e6',
  major: '#faf6ee',
  motorway: '#f4e8c8',
  rail: '#cbbfa6',
  boundary: '#b8ad96',
  ink: '#2a2722',
  ink2: '#6b665c',
  halo: '#f1ece1',
};

/** Paint overrides by layer id (exact) or id prefix (ending in `*`). */
const PAINT: Record<string, Record<string, unknown>> = {
  background: { 'background-color': P.paper },
  park: { 'fill-color': P.park },
  water: { 'fill-color': P.water },
  landuse_residential: { 'fill-color': P.resi },
  landcover_wood: { 'fill-color': P.wood },
  waterway: { 'line-color': P.waterLine },
  building: { 'fill-color': P.building, 'fill-outline-color': P.buildingLine },
  'road_area_pier': { 'fill-color': P.paper },
  road_pier: { 'line-color': P.paper },
  'aeroway-area': { 'fill-color': P.minor },
  'aeroway-runway': { 'line-color': P.minor },
  'aeroway-runway-casing': { 'line-color': P.casing },
  'aeroway-taxiway': { 'line-color': P.casing },
  highway_path: { 'line-color': P.casing },
  highway_minor: { 'line-color': P.minor },
  highway_major_casing: { 'line-color': P.casingMajor },
  highway_major_inner: { 'line-color': P.major },
  highway_major_subtle: { 'line-color': P.casing },
  highway_motorway_casing: { 'line-color': P.casingMajor },
  highway_motorway_inner: { 'line-color': ['interpolate', ['linear'], ['zoom'], 5.8, P.casing, 6, P.motorway] },
  highway_motorway_subtle: { 'line-color': P.casing },
  'highway_motorway_bridge_casing': { 'line-color': P.casingMajor },
  'highway_motorway_bridge_inner': { 'line-color': ['interpolate', ['linear'], ['zoom'], 5.8, P.casing, 6, P.motorway] },
  'tunnel_motorway_casing': { 'line-color': P.casing },
  'tunnel_motorway_inner': { 'line-color': P.minor },
  'railway*': { 'line-color': P.rail },
  'boundary*': { 'line-color': P.boundary },
};

/** Every label: ink text on a paper halo. */
const LABEL = { 'text-color': P.ink2, 'text-halo-color': P.halo };
const PLACE_LABEL = { 'text-color': P.ink, 'text-halo-color': P.halo };

function paintFor(id: string): Record<string, unknown> | undefined {
  if (PAINT[id]) return PAINT[id];
  const key = Object.keys(PAINT).find((k) => k.endsWith('*') && id.startsWith(k.slice(0, -1)));
  return key ? PAINT[key] : undefined;
}

/** Positron recoloured; falls back to the plain positron URL if the style can't be fetched. */
export async function dioramaBaseStyle(): Promise<StyleSpecification | string> {
  try {
    const r = await fetch(POSITRON, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return POSITRON;
    const style = (await r.json()) as StyleSpecification;
    for (const layer of style.layers) {
      const l = layer as { id: string; type: string; paint?: Record<string, unknown> };
      const over = paintFor(l.id);
      if (over) l.paint = { ...l.paint, ...over };
      if (l.type === 'symbol' && l.paint && 'text-color' in l.paint) {
        l.paint = { ...l.paint, ...(l.id.startsWith('label_') ? PLACE_LABEL : LABEL) };
      }
    }
    return style;
  } catch {
    return POSITRON;
  }
}
