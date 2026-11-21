/**
 * The 2D basemap in the diorama's palette: OpenFreeMap's positron style (fetched live, so tile,
 * glyph and sprite URLs stay current) recoloured from a small palette. Palettes can be swapped
 * at runtime (`applyPalette`) for time of day and weather, and tuned with `?tune`.
 */
import type { Map as MlMap, StyleSpecification } from 'maplibre-gl';

export const POSITRON = 'https://tiles.openfreemap.org/styles/positron';

export interface Palette {
  ground: string;
  resi: string;
  park: string;
  wood: string;
  water: string;
  building: string;
  buildingLine: string;
  street: string; // minor streets
  major: string; // major road fill
  motorway: string;
  casing: string; // road edges
  rail: string; // basemap rail (ours draws on top)
  label: string;
  placeLabel: string;
  halo: string;
  ink: string; // outline on our transit lines
  inkOpacity: number;
}

export const PALETTES: Record<string, Palette> = {
  /** Light warm grey ground, white streets: the train lines carry the colour. */
  light: {
    ground: '#f2efe9', resi: '#efebe4', park: '#e3e8d6', wood: '#dbe2cc', water: '#cfdde2',
    building: '#e9e4db', buildingLine: '#ddd6c9', street: '#ffffff', major: '#ffffff', motorway: '#fbf3df',
    casing: '#e4ddd0', rail: '#ddd5c6', label: '#8a8478', placeLabel: '#4a463f', halo: '#f6f3ee',
    ink: '#2a2722', inkOpacity: 0.35,
  },
  /** The first diorama recolour: tan paper, brown roads. */
  warm: {
    ground: '#ece6d8', resi: '#e6dfcf', park: '#d3dbbd', wood: '#c8d2ad', water: '#a9c0c6',
    building: '#ddd3bf', buildingLine: '#c4b89f', street: '#f6f1e6', major: '#faf6ee', motorway: '#f4e8c8',
    casing: '#c2b69c', rail: '#cbbfa6', label: '#6b665c', placeLabel: '#2a2722', halo: '#f1ece1',
    ink: '#2a2722', inkOpacity: 0.55,
  },
  golden: {
    ground: '#f4ebdc', resi: '#f1e6d4', park: '#e6e5c8', wood: '#dcdcbc', water: '#d2dcd8',
    building: '#ecdfc9', buildingLine: '#e0cfb3', street: '#fffaf0', major: '#fff8ea', motorway: '#fbecc9',
    casing: '#e7d7bd', rail: '#e0d0b6', label: '#8c7d68', placeLabel: '#4d4234', halo: '#f8f0e3',
    ink: '#3a2c1e', inkOpacity: 0.35,
  },
  dusk: {
    ground: '#d9d3da', resi: '#d5cfd7', park: '#c9cfc6', wood: '#c0c8bd', water: '#b4c2cf',
    building: '#d0c8d0', buildingLine: '#c2b9c3', street: '#ece6ea', major: '#f1e9e6', motorway: '#f0dcc8',
    casing: '#c6bdc6', rail: '#c2b8c2', label: '#6f6872', placeLabel: '#3b3540', halo: '#e3dde3',
    ink: '#241f2a', inkOpacity: 0.4,
  },
  night: {
    ground: '#1f2733', resi: '#222a37', park: '#1f2c2c', wood: '#1c2828', water: '#162030',
    building: '#28313f', buildingLine: '#323c4b', street: '#2f3846', major: '#3a4352', motorway: '#4b4a45',
    casing: '#2a3240', rail: '#3a4250', label: '#8a93a3', placeLabel: '#c9ced8', halo: '#1b222c',
    ink: '#f3e7c8', inkOpacity: 0.28,
  },
  overcast: {
    ground: '#ecebe8', resi: '#e8e7e3', park: '#dde2d6', wood: '#d4dacd', water: '#cdd6da',
    building: '#e2e0db', buildingLine: '#d6d3cd', street: '#fafaf8', major: '#fbfbf9', motorway: '#f2eee3',
    casing: '#dcd9d2', rail: '#d6d2ca', label: '#85837e', placeLabel: '#45443f', halo: '#f2f1ee',
    ink: '#2a2a28', inkOpacity: 0.35,
  },
  rain: {
    ground: '#e3e7ea', resi: '#dfe3e7', park: '#d3ddd6', wood: '#cad5ce', water: '#bccbd5',
    building: '#d9dde1', buildingLine: '#cbd1d7', street: '#f4f7f9', major: '#f6f8fa', motorway: '#e9eaea',
    casing: '#d0d6dc', rail: '#ccd2d8', label: '#7c8389', placeLabel: '#3d4348', halo: '#ebeff2',
    ink: '#1f272e', inkOpacity: 0.38,
  },
  fog: {
    ground: '#efefed', resi: '#ededeb', park: '#e7eae3', wood: '#e3e7df', water: '#e1e6e8',
    building: '#e9e9e6', buildingLine: '#e2e2de', street: '#fafaf9', major: '#fbfbfa', motorway: '#f5f3ec',
    casing: '#e6e5e1', rail: '#e3e2de', label: '#a3a29e', placeLabel: '#6b6a66', halo: '#f4f4f2',
    ink: '#3a3a38', inkOpacity: 0.22,
  },
};

export const DEFAULT_PALETTE = 'light';

type Paint = Record<string, unknown>;

/** Paint overrides by positron layer id (exact) or prefix (ending in `*`). */
function paints(P: Palette): Record<string, Paint> {
  const mw = ['interpolate', ['linear'], ['zoom'], 5.8, P.casing, 6, P.motorway];
  return {
    background: { 'background-color': P.ground },
    park: { 'fill-color': P.park },
    water: { 'fill-color': P.water },
    landuse_residential: { 'fill-color': P.resi },
    landcover_wood: { 'fill-color': P.wood },
    waterway: { 'line-color': P.water },
    building: { 'fill-color': P.building, 'fill-outline-color': P.buildingLine },
    road_area_pier: { 'fill-color': P.ground },
    road_pier: { 'line-color': P.ground },
    'aeroway-area': { 'fill-color': P.street },
    'aeroway-runway': { 'line-color': P.street },
    'aeroway-runway-casing': { 'line-color': P.casing },
    'aeroway-taxiway': { 'line-color': P.casing },
    highway_path: { 'line-color': P.casing },
    highway_minor: { 'line-color': P.street },
    highway_major_casing: { 'line-color': P.casing },
    highway_major_inner: { 'line-color': P.major },
    highway_major_subtle: { 'line-color': P.casing },
    highway_motorway_casing: { 'line-color': P.casing },
    highway_motorway_inner: { 'line-color': mw },
    highway_motorway_subtle: { 'line-color': P.casing },
    highway_motorway_bridge_casing: { 'line-color': P.casing },
    highway_motorway_bridge_inner: { 'line-color': mw },
    tunnel_motorway_casing: { 'line-color': P.casing },
    tunnel_motorway_inner: { 'line-color': P.street },
    'railway*': { 'line-color': P.rail },
    'boundary*': { 'line-color': P.casing },
  };
}

function overrideFor(table: Record<string, Paint>, id: string): Paint | undefined {
  if (table[id]) return table[id];
  const key = Object.keys(table).find((k) => k.endsWith('*') && id.startsWith(k.slice(0, -1)));
  return key ? table[key] : undefined;
}

const labelPaint = (P: Palette, id: string): Paint => ({
  'text-color': id.startsWith('label_') ? P.placeLabel : P.label,
  'text-halo-color': P.halo,
});

/** Positron recoloured; falls back to the plain positron URL if the style can't be fetched. */
export async function dioramaBaseStyle(P: Palette = PALETTES[DEFAULT_PALETTE]): Promise<StyleSpecification | string> {
  try {
    const r = await fetch(POSITRON, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) return POSITRON;
    const style = (await r.json()) as StyleSpecification;
    const table = paints(P);
    for (const layer of style.layers) {
      const l = layer as { id: string; type: string; paint?: Paint };
      const over = overrideFor(table, l.id);
      if (over) l.paint = { ...l.paint, ...over };
      if (l.type === 'symbol' && l.paint && 'text-color' in l.paint) l.paint = { ...l.paint, ...labelPaint(P, l.id) };
    }
    return style;
  } catch {
    return POSITRON;
  }
}

/** Repaint a loaded map with another palette (cheap: paint properties only). */
export function applyPalette(map: MlMap, P: Palette) {
  const table = paints(P);
  for (const l of map.getStyle().layers) {
    const over = overrideFor(table, l.id);
    if (over) for (const [k, v] of Object.entries(over)) map.setPaintProperty(l.id, k, v);
    if (l.type === 'symbol' && l.paint && 'text-color' in (l.paint as Paint))
      for (const [k, v] of Object.entries(labelPaint(P, l.id))) map.setPaintProperty(l.id, k, v);
  }
  if (map.getLayer('transit-casing')) {
    map.setPaintProperty('transit-casing', 'line-color', P.ink);
    map.setPaintProperty('transit-casing', 'line-opacity', P.inkOpacity);
  }
  if (map.getLayer('buses')) map.setPaintProperty('buses', 'circle-stroke-color', P.ground);
  if (map.getLayer('station-labels')) {
    map.setPaintProperty('station-labels', 'text-color', P.placeLabel);
    map.setPaintProperty('station-labels', 'text-halo-color', P.halo);
  }
}

// ---- continuous palette from the atmosphere -------------------------------------------------
// Time of day blends between keyframe palettes by sun elevation; weather then transforms
// whatever that gives (an overcast dusk is dusk, greyed), so the two layers compose.

type RGB = [number, number, number];
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toSrgb = (c: number) => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
function hexToLin(h: string): RGB {
  const n = parseInt(h.slice(1), 16);
  return [toLin(((n >> 16) & 255) / 255), toLin(((n >> 8) & 255) / 255), toLin((n & 255) / 255)];
}
function linToHex(c: RGB): string {
  return `#${c.map((v) => Math.round(Math.min(1, Math.max(0, toSrgb(v))) * 255).toString(16).padStart(2, '0')).join('')}`;
}
const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const luma = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/** Sun-elevation keyframes (degrees) → palettes. */
const KEYS: [number, string][] = [
  [-12, 'night'],
  [-4, 'dusk'],
  [3, 'golden'],
  [14, 'light'],
];

const GROUNDISH: (keyof Palette)[] = ['ground', 'resi', 'park', 'wood', 'building', 'street', 'major'];

export interface Sky {
  sunElev: number;
  dark: number;
  cloud: number;
  rain: number;
  snow: number;
  fog: number;
}

export function paletteFor(a: Sky): Palette {
  // 1. time of day: find the keyframe segment the sun is in
  const e = Math.min(KEYS[KEYS.length - 1][0], Math.max(KEYS[0][0], a.sunElev));
  let i = 0;
  while (i < KEYS.length - 2 && e > KEYS[i + 1][0]) i++;
  const t = (e - KEYS[i][0]) / (KEYS[i + 1][0] - KEYS[i][0]);
  const tt = t * t * (3 - 2 * t);
  const A = PALETTES[KEYS[i][1]];
  const B = PALETTES[KEYS[i + 1][1]];
  const out = { ...A } as Palette;
  const lin: Partial<Record<keyof Palette, RGB>> = {};
  for (const k of Object.keys(A) as (keyof Palette)[]) {
    if (k === 'inkOpacity') continue;
    lin[k] = mix(hexToLin(A[k] as string), hexToLin(B[k] as string), tt);
  }
  out.inkOpacity = A.inkOpacity + (B.inkOpacity - A.inkOpacity) * tt;

  // 2. weather on top
  const haze = mix(hexToLin('#eef0ef'), hexToLin('#2b323c'), a.dark);
  const snowCol = mix(hexToLin('#f6f8fa'), hexToLin('#3b4553'), a.dark);
  const cool = hexToLin('#8fa3b5');
  const ground = lin.ground!;
  for (const k of Object.keys(lin) as (keyof Palette)[]) {
    let c = lin[k]!;
    const grey: RGB = [luma(c), luma(c), luma(c)];
    c = mix(c, grey, Math.min(1, a.cloud * 0.35 + a.rain * 0.2 + a.fog * 0.2)); // flat light
    c = mix(c, ground, a.cloud * 0.1); // lower contrast under cloud
    c = mix(c, cool, a.rain * 0.12); // wet, cool
    if (GROUNDISH.includes(k)) c = mix(c, snowCol, a.snow * 0.55);
    c = mix(c, haze, a.fog * 0.45); // fog washes everything toward the haze
    out[k] = linToHex(c) as never;
  }
  out.inkOpacity *= 1 - a.fog * 0.4;
  return out;
}
