import { ShapeUtils, Vector2 } from 'three';
import type { GroundGrid } from '../terrain/grid';
import { pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

/**
 * Winship Cancer Institute at Emory Midtown (SOM with May Architecture, 2023):
 * a 17-storey pale glass slab with fin mullions, timber sunshades on its narrow
 * end, a white-finned podium, and a timber canopy with a large oculus over the
 * drop-off. The two OSM parts lifted to 17.4 m are that canopy; the residual
 * 'podium' part is the oculus itself, so it stays open to the sky.
 */
export const winshipId = 'osm:way:886044296';

const glass = '#a7bcc2',
  glassDeep = '#7f979f',
  fin = '#e4e8e6',
  wood = '#ad8f70',
  woodShade = '#8f7358',
  podiumGlass = '#5d6c73',
  brick = '#5b4b42',
  roofDeck = '#a19f99',
  screen = '#c9cdcc';

/** A stable, well-mixed 0–1 value per window. TODO: switch to the skin-kit litHash once it lands. */
function lit(seed: number, face: number, floor: number, bay: number) {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(face + 1, 0xc2b2ae35);
  h = Math.imul(h ^ Math.imul(floor + 1, 0x27d4eb2d), 0x165667b1) ^ Math.imul(bay + 7, 0x9e3779b1);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12;
  return (h >>> 0) / 4294967296;
}

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;

/** Faces of a plan, offset outward. */
function eachFace(plan: P2[], draw: (a: P2, b: P2, len: number, out: (t: number, y: number, d: number) => number[], i: number) => void) {
  plan.forEach((a, i) => {
    const b = plan[(i + 1) % plan.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.5) return;
    let nx = (b[1] - a[1]) / len, nz = -(b[0] - a[0]) / len;
    // Outward is whichever side of the edge's midpoint lies outside the plan.
    if (pointInRing((a[0] + b[0]) / 2 + nx * 0.3, (a[1] + b[1]) / 2 + nz * 0.3, plan)) { nx = -nx; nz = -nz; }
    draw(a, b, len, (t, y, d) => [a[0] + t * (b[0] - a[0]) + nx * d, y, a[1] + t * (b[1] - a[1]) + nz * d], i);
  });
}

function quad(s: Shell, at: (t: number, y: number, d: number) => number[], l: number, r: number, y0: number, y1: number, d: number, c: string, litPane = false) {
  (litPane ? s.lights : s.body).quad(at(l, y0, d), at(l, y1, d), at(r, y1, d), at(r, y0, d), c);
}

export function createWinship(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const origin: P2 = [530.6, -1813];
  const s = landmarkShell(buildings, grid, site.id, 'Winship at Emory Midtown', origin, [1, 0],
    [[0, 0], [40, 0], [-40, -20]]);
  if (!s) return null;
  const local = (ring: [number, number][]): P2[] => ring.map(([x, z]) => [x - origin[0], z - origin[1]]);
  // Outer rings only; the podium part's holes are the tower and hall footprints.
  const part = (id: string) => site.parts?.find(p => p.id === id && p.rings.length >= 1);
  const towerPart = part('osm:way:1338346574'), podiumPart = part('osm:way:1456370827'),
    hallPart = part('osm:way:1338346571'), stripPart = part('osm:way:1456370826'),
    canopyParts = ['osm:way:1338346572', 'osm:way:1456370825'].map(part);
  if (!towerPart || !podiumPart || !hallPart || !stripPart || canopyParts.some(p => !p)) return null;

  // NAVD88. The site is nearly flat (309.8–312.2 m); the tower is 292 ft (89 m)
  // to its screen per SOM, with the occupied roof estimated at 84 m.
  const g0 = s.base + 0.35;
  const lobby = g0 + 6,
    floors = 16,
    pitch = (84 - 6) / floors,
    roof = g0 + 84,
    screenTop = g0 + 89,
    podiumTop = g0 + 18,
    canopyLo = g0 + 17.4,
    canopyHi = g0 + 19.2;

  // Podium: dark glass behind a screen of white vertical fins.
  const podium = local(podiumPart.rings[0]);
  s.prism(podium, s.base, podiumTop, podiumGlass, roofDeck);
  eachFace(podium, (a, b, len, at) => {
    const n = Math.max(1, Math.round(len / 1.6));
    for (let k = 0; k <= n; k++) quad(s, at, Math.max(0, k / n - 0.18 / len), Math.min(1, k / n + 0.18 / len), g0 + 5, podiumTop, 0.4, fin);
    quad(s, at, 0, 1, g0 + 4.4, g0 + 5, 0.42, fin);
    quad(s, at, 0.03, 0.97, g0 + 0.3, g0 + 4.3, 0.04, podiumGlass, true);
  });

  // Tower slab: pale glass, fin mullions on the long faces, floor lines every
  // second storey (the two-storey care communities), timber sunshades on the
  // narrow ends. Lit panes follow an inpatient tower: many rooms lit late.
  const tower = local(towerPart.rings[0]);
  s.prism(tower, podiumTop, lobby + floors * pitch, glass, roofDeck);
  s.prism(tower, roof, roof + 0.01, glass, roofDeck);
  eachFace(tower, (a, b, len, at, face) => {
    const narrow = len < 30;
    const n = Math.max(1, Math.round(len / (narrow ? 3 : 1.5)));
    for (let k = 0; k <= n; k++) {
      const w = (k === 0 || k === n ? 0.3 : 0.08) / len;
      quad(s, at, Math.max(0, k / n - w), Math.min(1, k / n + w), podiumTop, roof, narrow ? 0.12 : 0.35, fin);
    }
    for (let f = 0; f <= floors; f += 2) quad(s, at, 0, 1, lobby + f * pitch - 0.25, lobby + f * pitch + 0.25, 0.1, glassDeep);
    if (narrow) {
      for (let f = 1; f < floors; f++) {
        const y = lobby + f * pitch;
        // Sunshade: a shelf projecting from the face.
        s.body.quad(at(0.06, y, 0.1), at(0.94, y, 0.1), at(0.94, y, 1.2), at(0.06, y, 1.2), wood);
        quad(s, at, 0.06, 0.94, y - 0.3, y, 1.2, woodShade);
      }
      // Timber louvres up the corners.
      for (const [l, r] of [[0, 0.12], [0.88, 1]]) quad(s, at, l, r, podiumTop, roof, 0.2, wood);
    }
    for (let f = Math.ceil((podiumTop - lobby) / pitch); f < floors; f++) {
      for (let k = 0; k < n; k++) {
        if (lit(886, face, f, k) >= 0.32) continue;
        const y = lobby + f * pitch;
        quad(s, at, k / n + 0.1 / len, (k + 1) / n - 0.1 / len, y + 0.3, y + pitch - 0.3, 0.05, glass, true);
      }
    }
  });
  // Mechanical screen set in from the roof edge.
  const [tx0, tz0] = [Math.min(...tower.map(p => p[0])) + 2, Math.min(...tower.map(p => p[1])) + 4];
  const [tx1, tz1] = [Math.max(...tower.map(p => p[0])) - 2, Math.max(...tower.map(p => p[1])) - 4];
  s.prism([[tx0, tz0], [tx1, tz0], [tx1, tz1], [tx0, tz1]], roof, screenTop, screen, roofDeck);

  // The timber hall under the canopy and the glazed strip on its north side.
  const hall = local(hallPart.rings[0]);
  s.prism(hall, s.base, g0 + 25.2, wood, roofDeck);
  eachFace(hall, (a, b, len, at) => {
    const n = Math.round(len / 0.9);
    for (let k = 1; k < n; k++) quad(s, at, k / n - 0.12 / len, k / n + 0.12 / len, g0 + 4.5, g0 + 25.2, 0.06, woodShade);
    quad(s, at, 0.05, 0.95, g0 + 0.3, g0 + 4.4, 0.04, podiumGlass, true);
  });
  const strip = local(stripPart.rings[0]);
  s.prism(strip, s.base, g0 + 25.2, glassDeep, roofDeck);
  eachFace(strip, (a, b, len, at) => {
    quad(s, at, 0, 1, g0 + 0.3, g0 + 5, 0.04, brick);
  });

  // Canopy: a deep timber slab around the oculus, with a lit soffit at night.
  for (const p of canopyParts) {
    const plan = local(p!.rings[0]);
    s.prism(plan, canopyLo, canopyHi, fin, roofDeck);
    for (const [i, j, k] of ShapeUtils.triangulateShape(plan.map(([x, z]) => new Vector2(x, z)), [])) {
      const v = (n: number, y = canopyLo) => [plan[n][0], y, plan[n][1]];
      s.body.tri(v(i), v(j), v(k), wood);
      // Soffit glow sits just under the timber, the same colour by day.
      s.lights.tri(v(i, canopyLo - 0.05), v(j, canopyLo - 0.05), v(k, canopyLo - 0.05), wood);
    }
  }
  return s.finish('#f6e2c0', 0.55);
}
