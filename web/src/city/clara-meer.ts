import * as THREE from 'three';
import features from '../../../pipeline/prototypes/piedmont-edge/features.json';
import type { TerrainCity, TransportRun } from '../terrain/transport-data';
import { Builder, Line, type P2 } from '../vignette/geom';
import { piedmontGates } from './piedmont-gates';
import type { VBuilding } from '../vignette/world';

/**
 * Lake Clara Meer's 2002 granite bridge, the gazebo on its north platform and
 * the Dockside pier. Plan positions are reported (OSM). The water surface is
 * measured (hydro-flattened 3DEP). The deck crest, arches, piers, lamps and
 * gazebo dimensions are estimated from photographs; see docs/log/ui/clara-meer.
 */
export const gazeboId = features.gazebo.osm;
function same(a: P2, b: P2) { return Math.hypot(a[0] - b[0], a[1] - b[1]) < .05; }
const path = features.bridge.pts as P2[];
const line = new Line(path);
// Closed OSM ways repeat their first vertex.
const open = (ring: P2[]) => same(ring[0], ring.at(-1)!) ? ring.slice(0, -1) : ring;
const gazebo = open(features.gazebo.pts as P2[]);
export const centre: P2 = [gazebo.reduce((a, p) => a + p[0], 0) / gazebo.length, gazebo.reduce((a, p) => a + p[1], 0) / gazebo.length];
const radius = Math.max(...gazebo.map(p => Math.hypot(p[0] - centre[0], p[1] - centre[1])));

const spurStart = features.spur.pts[0] as P2;
const spurAt = (() => {
  let best = 0, d = Infinity;
  for (let s = 0; s <= line.length; s += .05) { const q = line.at(s), e = Math.hypot(q.x - spurStart[0], q.z - spurStart[1]); if (e < d) { d = e; best = s; } }
  return best;
})();
// The spur leaves the bridge on the gazebo's side; keep that bay open.
const spurSide = (() => { const q = line.at(spurAt); return Math.sign((centre[0] - q.x) * q.nx + (centre[1] - q.z) * q.nz); })();
const opening = (s: number, side: number) => side === spurSide && Math.abs(s - spurAt) < 1.6;
const CREST = 2.9;          // deck above water, estimated
const HALF = 2.25;          // half the 4.5 m deck, estimated
const RAMP = 9;             // length over which the deck meets each bank
const ARCH = { span: 12, rise: 2.1, inset: 5 };
const GRANITE = '#8e8b84', COPING = '#b3afa6', PAVING = '#bdb9b0', RAIL = '#1f2224', WOOD = '#9a8b76';

type Ground = (x: number, z: number) => number | null;
/** The lake surface (hydro-flattened 3DEP) in scene metres: the ground at the gazebo. */
export const waterLevel = (ground: Ground) => ground(...centre);
const water = waterLevel;

/** Deck height in scene metres along the bridge, meeting both banks. */
export function deckHeight(s: number, ground: Ground) {
  const level = water(ground);
  if (level === null) return null;
  const ends = [0, line.length].map(t => { const p = line.at(t); return (ground(p.x, p.z) ?? level) + .12; });
  const crest = level + CREST;
  const fromStart = Math.min(1, s / RAMP), fromEnd = Math.min(1, (line.length - s) / RAMP);
  const ease = (t: number) => (1 - Math.cos(Math.PI * t)) / 2;
  const y = s < line.length / 2 ? ends[0] + (crest - ends[0]) * ease(fromStart) : ends[1] + (crest - ends[1]) * ease(fromEnd);
  const p = line.at(s), floor = ground(p.x, p.z);
  return Math.max(y, floor === null ? -Infinity : floor + .12);
}

function runFor(city: TerrainCity, pts: P2[]) {
  return city.terrainTransport?.roads.find(r => r.pts.length === pts.length && same(r.pts[0], pts[0]) && same(r.pts.at(-1)!, pts.at(-1)!));
}

/** Walkable deck and the gazebo platform, replacing the generic footbridge treads. */
export function drawClaraMeerBridge(city: TerrainCity, _zero: number, ground: Ground, mesh: Builder,
  treads: Map<TransportRun, number[]>, drawn: Set<TransportRun>) {
  const bridge = runFor(city, path), spur = runFor(city, features.spur.pts as P2[]);
  const level = water(ground);
  if (!bridge || !spur || level === null) {
    // The generic footbridge would show inside the granite parapets; re-run piedmont_edge.py.
    console.warn('Lake Clara Meer bridge no longer matches pipeline/prototypes/piedmont-edge/features.json');
    return;
  }
  const top: number[] = [];
  for (let s = 0; s < line.length; s += 1) {
    const t = Math.min(line.length, s + 1), a = line.at(s), b = line.at(t);
    const ya = deckHeight(s, ground)!, yb = deckHeight(t, ground)!;
    top.push(mesh.pos.length / 3, mesh.pos.length / 3 + 3);
    mesh.quad([a.x + a.nx * HALF, ya, a.z + a.nz * HALF], [a.x - a.nx * HALF, ya, a.z - a.nz * HALF],
      [b.x - b.nx * HALF, yb, b.z - b.nz * HALF], [b.x + b.nx * HALF, yb, b.z + b.nz * HALF], PAVING);
  }
  treads.set(bridge, top);
  drawn.add(bridge);
  {
    // The spur walks onto the round platform, level with the crest.
    const y = level + CREST, ring: number[] = [];
    const s0 = (spur.pts[0] as P2), s1 = (spur.pts.at(-1) as P2), dx = s1[0] - s0[0], dz = s1[1] - s0[1], n = Math.hypot(dx, dz);
    const ox = -dz / n * 1.6, oz = dx / n * 1.6;
    ring.push(mesh.pos.length / 3, mesh.pos.length / 3 + 3);
    mesh.quad([s0[0] + ox, y, s0[1] + oz], [s0[0] - ox, y, s0[1] - oz], [s1[0] - ox, y, s1[1] - oz], [s1[0] + ox, y, s1[1] + oz], PAVING);
    treads.set(spur, ring);
    drawn.add(spur);
  }
}

function prism(b: Builder, x: number, z: number, w: number, y0: number, y1: number, color: string) {
  b.box(w, y1 - y0, w, x, (y0 + y1) / 2, z, color);
}

/** Granite faces, piers, railings, lamps, the gazebo and the Dockside pier. */
export function createClaraMeer(buildings: VBuilding[], site: VBuilding, _base: number | null, ground: Ground) {
  if (site.id !== gazeboId) return null;
  const level = water(ground);
  if (level === null) return null;
  const stone = new Builder(), glow = new Builder(), lit = new Builder();
  // Spandrel faces on both sides, open under the two end arches.
  const arches = [ARCH.inset, line.length - ARCH.inset - ARCH.span];
  const soffit = (s: number) => {
    for (const a of arches) if (s > a && s < a + ARCH.span) {
      const t = (s - a) / ARCH.span;
      return level + ARCH.rise * Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2));
    }
    return null;
  };
  for (let s = 0; s < line.length; s += .5) {
    const t = Math.min(line.length, s + .5), a = line.at(s), c = line.at(t);
    const ya = deckHeight(s, ground)!, yc = deckHeight(t, ground)!;
    const ba = soffit(s) ?? level - .3, bc = soffit(t) ?? level - .3;
    for (const side of [1, -1]) {
      if (opening(s, side) || opening(t, side)) continue;
      const o = side * HALF;
      const p = [a.x + a.nx * o, a.z + a.nz * o], q = [c.x + c.nx * o, c.z + c.nz * o];
      stone.quad([p[0], ba, p[1]], [q[0], bc, q[1]], [q[0], yc + .35, q[1]], [p[0], ya + .35, p[1]], GRANITE);
      // Coping slab along the parapet base.
      const w = side * (HALF + .15);
      stone.quad([a.x + a.nx * w, ya + .35, a.z + a.nz * w], [c.x + c.nx * w, yc + .35, c.z + c.nz * w],
        [c.x + c.nx * o * .9, yc + .35, c.z + c.nz * o * .9], [a.x + a.nx * o * .9, ya + .35, a.z + a.nz * o * .9], COPING);
    }
    if (soffit(s) !== null && soffit(t) !== null) {
      const l = [a.x + a.nx * HALF, a.z + a.nz * HALF], r = [a.x - a.nx * HALF, a.z - a.nz * HALF];
      const l2 = [c.x + c.nx * HALF, c.z + c.nz * HALF], r2 = [c.x - c.nx * HALF, c.z - c.nz * HALF];
      stone.quad([l[0], ba, l[1]], [r[0], ba, r[1]], [r2[0], bc, r2[1]], [l2[0], bc, l2[1]], '#5d5a55');
    }
  }
  // Square piers with railings between, every ~7 m; acorn lamps on the four end piers.
  const piers: number[] = [];
  for (let s = 0; s <= line.length + .01; s += line.length / 7) piers.push(Math.min(s, line.length));
  for (const side of [1, -1]) {
    let prev: THREE.Vector3 | null = null;
    for (const [i, s] of piers.entries()) {
      const p = line.at(s), y = deckHeight(s, ground)!, x = p.x + p.nx * side * HALF, z = p.z + p.nz * side * HALF;
      prism(stone, x, z, .65, y, y + 1.4, GRANITE);
      prism(stone, x, z, .8, y + 1.4, y + 1.55, COPING);
      const here = new THREE.Vector3(x, y, z);
      // Rails follow the deck between pier tops, broken where the spur leaves.
      if (prev) for (const h of [.25, 1.0]) {
        const s0 = piers[i - 1];
        for (let k = 0; k < 8; k++) {
          const u = s0 + (s - s0) * k / 8, v = s0 + (s - s0) * (k + 1) / 8;
          if (opening(u, side) || opening(v, side)) continue;
          const a = line.at(u), c = line.at(v), ya = deckHeight(u, ground)! + h, yc = deckHeight(v, ground)! + h;
          const pa = [a.x + a.nx * side * HALF, a.z + a.nz * side * HALF], pc = [c.x + c.nx * side * HALF, c.z + c.nz * side * HALF];
          stone.quad([pa[0], ya - .03, pa[1]], [pc[0], yc - .03, pc[1]], [pc[0], yc + .03, pc[1]], [pa[0], ya + .03, pa[1]], RAIL);
        }
      }
      prev = here;
      if (i === 0 || i === piers.length - 1) {
        prism(stone, x, z, .12, y + 1.55, y + 4.4, RAIL);
        glow.box(.55, .7, .55, x, y + 4.75, z, '#ffd9a0');
        prism(stone, x, z, .25, y + 4.97, y + 5.1, RAIL);
      }
    }
  }
  // Round granite drum under the gazebo platform.
  const deck = level + CREST, r = radius + .6;
  const toward = Math.atan2(spurStart[1] - centre[1], spurStart[0] - centre[0]);
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2, b = (i + 1) / 24 * Math.PI * 2;
    const p = [centre[0] + Math.cos(a) * r, centre[1] + Math.sin(a) * r], q = [centre[0] + Math.cos(b) * r, centre[1] + Math.sin(b) * r];
    const facing = Math.abs(Math.atan2(Math.sin((a + b) / 2 - toward), Math.cos((a + b) / 2 - toward))) < 1.6 / r;
    stone.quad([p[0], level - .3, p[1]], [q[0], level - .3, q[1]], [q[0], deck + (facing ? 0 : .35), q[1]], [p[0], deck + (facing ? 0 : .35), p[1]], GRANITE);
    // Platform cap, so the drum is closed even if the transport tread is missing.
    stone.tri([centre[0], deck - .01, centre[1]], [q[0], deck - .01, q[1]], [p[0], deck - .01, p[1]], PAVING);
  }
  // Gazebo: eight white columns, entablature and a grey standing-seam pyramid.
  const cr = Math.max(1.5, radius - .5);
  for (let i = 0; i < 8; i++) {
    const a = (i + .5) / 8 * Math.PI * 2, x = centre[0] + Math.cos(a) * cr, z = centre[1] + Math.sin(a) * cr;
    prism(stone, x, z, .45, deck, deck + .3, '#e9e6de');
    lit.box(.32, 2.7, .32, x, deck + 1.65, z, '#f4f1ea');
    prism(stone, x, z, .45, deck + 3.0, deck + 3.2, '#e9e6de');
  }
  const eave = deck + 3.5, apex = deck + 5.9, er = cr + .7;
  for (let i = 0; i < 8; i++) {
    const a = i / 8 * Math.PI * 2, b = (i + 1) / 8 * Math.PI * 2;
    const p = [centre[0] + Math.cos(a) * er, centre[1] + Math.sin(a) * er], q = [centre[0] + Math.cos(b) * er, centre[1] + Math.sin(b) * er];
    const pi = [centre[0] + Math.cos(a) * cr, centre[1] + Math.sin(a) * cr], qi = [centre[0] + Math.cos(b) * cr, centre[1] + Math.sin(b) * cr];
    stone.quad([pi[0], deck + 3.2, pi[1]], [qi[0], deck + 3.2, qi[1]], [q[0], eave, q[1]], [p[0], eave, p[1]], '#ece8df');
    stone.tri([p[0], eave, p[1]], [q[0], eave, q[1]], [centre[0], apex, centre[1]], '#9aa0a3');
    // Ceiling under the roof, which glows warm at night.
    glow.tri([pi[0], deck + 3.19, pi[1]], [centre[0], deck + 3.19, centre[1]], [qi[0], deck + 3.19, qi[1]], '#ffe2b8');
  }
  prism(stone, centre[0], centre[1], .14, apex, apex + .7, '#9aa0a3');
  // Dockside: the shoreline boardwalk band and the pier, with four stone posts.
  const dock = open(features.dock.pts as P2[]);
  const shape = THREE.ShapeUtils.triangulateShape(dock.map(([x, z]) => new THREE.Vector2(x, z)), []);
  const dockY = ([x, z]: P2) => Math.max(level + .5, (ground(x, z) ?? level) + .12);
  for (const [a, b, c] of shape) stone.tri([dock[a][0], dockY(dock[a]), dock[a][1]], [dock[c][0], dockY(dock[c]), dock[c][1]], [dock[b][0], dockY(dock[b]), dock[b][1]], WOOD);
  for (let i = 0; i < dock.length; i++) {
    const p = dock[i], q = dock[(i + 1) % dock.length];
    stone.quad([p[0], level - .2, p[1]], [q[0], level - .2, q[1]], [q[0], dockY(q), q[1]], [p[0], dockY(p), p[1]], '#5c4a38');
  }
  // Four stone posts at the pier's corners (OSM vertices 0, 6, 7 and 27), inset toward its middle.
  const corners = [0, 6, 7, 27].map(i => dock[i]);
  const mid = [corners.reduce((a, p) => a + p[0], 0) / 4, corners.reduce((a, p) => a + p[1], 0) / 4];
  for (const [x, z] of corners) {
    const d = Math.hypot(mid[0] - x, mid[1] - z);
    prism(stone, x + (mid[0] - x) / d * .55, z + (mid[1] - z) / d * .55, .55, level + .5, level + 1.25, GRANITE);
  }

  const group = new THREE.Group();
  group.name = 'clara-meer';
  const make = (b: Builder, material: THREE.MeshLambertMaterial) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, material);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  make(stone, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  const lampMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#ffb45a', emissiveIntensity: 0 });
  const columnMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#ffc887', emissiveIntensity: 0 });
  make(glow, lampMaterial);
  make(lit, columnMaterial);
  // The 12th and 14th Street gates share this board row and its landmark hook.
  const gates = piedmontGates(ground);
  group.add(gates.group);
  return {
    buildings: buildings.filter(b => b.id !== site.id),
    group,
    setNight(night: number) {
      // Warm acorn globes and the uplit gazebo, as in the dusk photographs.
      lampMaterial.emissiveIntensity = night * 3;
      gates.setNight(night);
      columnMaterial.emissiveIntensity = night * .35;
    },
  };
}
