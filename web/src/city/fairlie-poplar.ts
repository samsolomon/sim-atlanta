import type { GroundGrid } from '../terrain/grid';
import type { Builder, P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, litHash, seedOf } from './skin-kit';

/**
 * Georgia State's block in Fairlie–Poplar: the Haas-Howell Building (Neel Reid,
 * about 1920) and the Standard Building (1923), both GSU School of Music, and the
 * Helen M. Aderhold Learning Center (Lord Aeck Sargent, 2002). Heights are NAVD88
 * from the April 2019 lidar, sampled on a 3–4 m grid. Facades follow Street View
 * (Poplar St, March 2025; Fairlie St, January 2023) and owner photos of Aderhold
 * (Google Maps, 2017–2021). No wordmarks or signs.
 */
export const haasHowellId = '12421d44-6a0e-4675-87c8-c1e7e17de9c9';
export const standardBuildingId = 'ef110bb2-753f-4530-bfe1-8509fc8958dd';
export const aderholdId = '3d0c8e4d-aa16-45b2-be69-a61ddbf62860';

type Owner = NonNullable<ReturnType<typeof landmarkShell>>;
type Pen = Pick<Builder, 'quad' | 'tri'>;
/**
 * One building of the block, drawn in its own frame (origin, axis along a street) into
 * the block's single shell, so the four share one body and one lamps mesh.
 */
interface Shell {
  base: number;
  body: Pen; lights: Pen;
  prism(plan: P2[], lo: number, hi: number, wall: string, roof: string): void;
}

const blockOrigin: P2 = [195, -320];

function part(owner: Owner, grid: GroundGrid, site: VBuilding, origin: P2, axis: P2): Shell | null {
  if (site.rings.length !== 1) return null;
  const grades = site.rings[0].map(([x, z]) => grid.sample(x, z));
  if (!grades.every((y): y is number => y !== null && Number.isFinite(y))) return null;
  const ang = Math.atan2(axis[1], axis[0]), c = Math.cos(ang), sn = Math.sin(ang);
  const ox = origin[0] - blockOrigin[0], oz = origin[1] - blockOrigin[1];
  const to = (p: number[]) => [ox + p[0] * c - p[2] * sn, p[1], oz + p[0] * sn + p[2] * c];
  const to2 = ([u, v]: P2): P2 => [ox + u * c - v * sn, oz + u * sn + v * c];
  const pen = (b: Builder): Pen => ({
    quad: (a, b2, c2, d, col) => b.quad(to(a), to(b2), to(c2), to(d), col),
    tri: (a, b2, c2, col) => b.tri(to(a), to(b2), to(c2), col),
  });
  return {
    base: Math.min(...grades) - 0.35,
    body: pen(owner.body), lights: pen(owner.lights),
    prism: (plan, lo, hi, wall, roof) => owner.prism(plan.map(to2), lo, hi, wall, roof),
  };
}

/** An axis-aligned block in a part's frame (for penthouses and rooftop units). */
const unit = (s: Shell, u: number, v: number, w: number, d: number, lo: number, hi: number, c: string) =>
  s.prism([[u - w / 2, v - d / 2], [u + w / 2, v - d / 2], [u + w / 2, v + d / 2], [u - w / 2, v + d / 2]], lo, hi, c, c);

const box = (u: number, v: number): P2[] => [[-u, -v], [u, -v], [u, v], [-u, v]];

/** A face of a plan with the building on its left: t runs a→b, `out` is metres off the wall. */
function face(a: P2, b: P2) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  const at = (t: number, y: number, out: number) => [a[0] + t * dx + (out * dz) / len, y, a[1] + t * dz - (out * dx) / len];
  return { len, at };
}

interface BrickTower {
  /** Half-extents of the plan rectangle along the shell's axis. */
  hu: number; hv: number;
  /** NAVD88 levels: top of the ground floor, top of the stone base, top of the shaft. */
  ground: number; stoneTop: number; top: number;
  /** Storeys above the ground floor (stone and brick). */
  floors: number;
  bay: number;
  stone: string; stoneShade: string; brick: string; frame: string; glass: string; roof: string;
  /** Faces drawn plain (party walls): index → NAVD88 height they stay blank up to. */
  party: Record<number, number>;
  /** Faces whose ground floor is a row of arched openings. */
  arches: number[];
  /** A projecting cornice under the parapet. */
  cornice: boolean;
}

/**
 * The 1920s office-building formula both GSU music buildings share: a pale stone
 * base, a red-brown brick shaft of paired white-framed sash windows, and a stone
 * coping. Offices and practice rooms are mostly dark at 23:30.
 */
function brickTower(s: Shell, seed: number, t: BrickTower) {
  const plan = box(t.hu, t.hv);
  const parapet = t.top + (t.cornice ? 1.6 : 1.1);
  s.prism(plan, s.base, t.stoneTop, t.stone, t.roof);
  s.prism(plan, t.stoneTop, parapet, t.brick, t.roof);
  if (t.cornice) s.prism(box(t.hu + 0.6, t.hv + 0.6), t.top, t.top + 0.8, t.stone, t.stoneShade);
  const pitch = (t.top - t.ground) / t.floors;

  plan.forEach((a, i) => {
    const b = plan[(i + 1) % 4];
    const { len, at } = face(a, b);
    const quad = (l: number, r: number, y0: number, y1: number, out: number, c: string, lit = false) =>
      (lit ? s.lights : s.body).quad(at(l, y0, out), at(l, y1, out), at(r, y1, out), at(r, y0, out), c);
    const blankTo = t.party[i] ?? -Infinity;
    const bays = Math.max(1, Math.round(len / t.bay));
    // Stone coping: a lip around the parapet, leaving the roof deck its own colour.
    quad(0, 1, parapet - 0.3, parapet + 0.06, 0.1, t.stone);
    s.body.quad(at(0, parapet + 0.06, -0.3), at(1, parapet + 0.06, -0.3), at(1, parapet + 0.06, 0.1), at(0, parapet + 0.06, 0.1), t.stone);
    // Stone belt course between the base and the brick.
    quad(0, 1, t.stoneTop - 0.45, t.stoneTop, 0.12, t.stoneShade);
    // The cornice's soffit, back to the wall.
    if (t.cornice) s.body.quad(at(0, t.top, 0), at(1, t.top, 0), at(1, t.top, 0.6), at(0, t.top, 0.6), t.stoneShade);
    // Paired sash windows, one pair per bay on every storey above the ground floor.
    for (let f = 0; f < t.floors; f++) {
      const y0 = t.ground + f * pitch + 0.75, y1 = y0 + Math.min(2.1, pitch - 1.1);
      if (y0 - 0.12 < blankTo) continue; // no window straddles a neighbour's roofline
      for (let k = 0; k < bays; k++) {
        const c = (k + 0.5) / bays;
        for (const side of [-1, 1]) {
          const m = c + (side * 0.62) / len, w = 0.5 / len;
          quad(m - w - 0.1 / len, m + w + 0.1 / len, y0 - 0.12, y1 + 0.12, 0.05, t.frame);
          const lit = litHash(seed, i, f, 2 * k + (side + 1) / 2) < 0.1;
          quad(m - w, m + w, y0, y1, 0.1, t.glass, lit);
        }
      }
    }
    // Ground floor: tall arched openings on the entrance fronts, flat-headed glazing elsewhere.
    if (blankTo > t.ground) return;
    const head = t.ground - 0.9;
    for (let k = 0; k < bays; k++) {
      const c = (k + 0.5) / bays, half = Math.min(1.3, t.bay * 0.3), w = half / len;
      const lit = litHash(seed, i + 8, 0, k) < 0.45;
      if (t.arches.includes(i)) {
        const spring = head - half;
        quad(c - w, c + w, s.base + 0.65, spring, 0.06, t.glass, lit);
        // Semicircular head: a five-segment fan over the opening.
        const p = (ang: number) => at(c + Math.cos(ang) * w, spring + Math.sin(ang) * half, 0.06);
        for (let n = 0; n < 5; n++) (lit ? s.lights : s.body).tri(at(c, spring, 0.06), p(Math.PI * (1 - n / 5)), p(Math.PI * (1 - (n + 1) / 5)), t.glass);
      } else {
        quad(c - w, c + w, s.base + 0.65, head, 0.06, t.glass, lit);
      }
    }
  });
}

function haasHowell(s: Shell) {
  const g0 = 322.9; // lidar ground, ring median
  // Lidar roof p50 30.1 m; the 33–36 m returns are a rooftop penthouse.
  const ground = g0 + 5.2, stoneTop = ground + 2 * 3.05, top = g0 + 28.6;
  brickTower(s, seedOf(haasHowellId), {
    hu: 14.05, hv: 8.2, ground, stoneTop, top, floors: 8, bay: 3.5,
    stone: '#d6ccb8', stoneShade: '#c2b7a2', brick: '#8f5a48', frame: '#ebe7de', glass: '#8a969c', roof: '#a19d95',
    // Faces: 0 north-east (the Rialto rises 22 m against it), 1 south-east (open to the
    // street), 2 Poplar Street (south-west, the arched entrance), 3 north-west (shops
    // about 13 m high against it).
    party: { 0: g0 + 22, 3: g0 + 13 }, arches: [2], cornice: true,
  });
  unit(s, 0, 0, 6, 5, top + 1.6, top + 4.8, '#8e5a48');
}

function standardBuilding(s: Shell) {
  const g0 = 320.6;
  // Lidar roof p50 40.1 m over eleven storeys; the 41–43 m returns are the stair and lift head.
  const ground = g0 + 5, stoneTop = ground + 3.4, top = g0 + 38.7;
  brickTower(s, seedOf(standardBuildingId), {
    hu: 14.1, hv: 5.65, ground, stoneTop, top, floors: 10, bay: 3.4,
    stone: '#d3cdbf', stoneShade: '#bdb6a7', brick: '#86533f', frame: '#e9e6df', glass: '#8a969c', roof: '#a19d95',
    // Faces: 0 Fairlie Street (north-west, the pedimented door), 1 north-east (a
    // neighbour about 17 m high against it), 2 the Theatrical Outfit side (south-east,
    // its parapet about 10 m up), 3 Luckie Street (south-west).
    party: { 1: g0 + 17, 2: g0 + 10 }, arches: [], cornice: false,
  });
  // Pedimented doorway on Fairlie Street (its position along the face is estimated).
  const { at } = face([-14.1, -5.65], [14.1, -5.65]);
  const door = 0.45, dw = 1.5 / 28.2;
  s.body.quad(at(door - dw, g0 + 3.9, 0.25), at(door - dw, g0 + 4.5, 0.25), at(door + dw, g0 + 4.5, 0.25), at(door + dw, g0 + 3.9, 0.25), '#e4dfd3');
  s.body.tri(at(door - dw, g0 + 4.5, 0.25), at(door, g0 + 5.1, 0.25), at(door + dw, g0 + 4.5, 0.25), '#e4dfd3');
  unit(s, -2, 0, 4, 3.5, top + 1.1, top + 3.5, '#7d5246');
}

function aderhold(s: Shell) {
  const seed = seedOf(aderholdId);
  const g0 = 322.6;
  // Lidar (relative to g0): a 3 m perimeter band at 19–20 m (the trellis over the
  // top storey's setback), the roof at 22 m, a plant block at 25 m over the west
  // end and an atrium skylight at 24.5 m.
  const ground = g0 + 5.4, floors = 3, pitch = 4.2, wallTop = ground + floors * pitch, // 18.0 m
    parapet = g0 + 19, trellis = g0 + 19.6, roof = g0 + 22;
  const hu = 30, hv = 26.5, inset = 3.5;
  const stone = '#d4c2a0', stoneShade = '#bfab88', pier = '#ddcdad', frame = '#4b4f52', glass = '#808d95',
    steel = '#575c5f', deck = '#8e8a83', plant = '#9a9da0';
  const plan = box(hu, hv);
  s.prism(plan, s.base, parapet, stone, deck);
  s.prism(box(hu - inset, hv - inset), parapet, roof, glass, deck);
  // Plant block and the atrium's skylight monitor.
  s.prism([[-27, -12], [-9, -12], [-9, 12], [-27, 12]], roof, g0 + 25, stoneShade, deck);
  s.prism([[-9, -6], [12, -6], [12, 3], [-9, 3]], roof, g0 + 24.5, '#8d9aa2', '#9aa6ad');
  // Rooftop air handlers on the open east half of the roof (estimated: too small for the lidar grid).
  for (const [u, v] of [[17, -15], [23, -15], [17, 13], [23, 13], [20, -1]] as P2[]) unit(s, u, v, 3.2, 2.2, roof, roof + 1.6, plant);

  plan.forEach((a, i) => {
    const b = plan[(i + 1) % 4];
    const { len, at } = face(a, b);
    const quad = (l: number, r: number, y0: number, y1: number, out: number, c: string, lit = false) =>
      (lit ? s.lights : s.body).quad(at(l, y0, out), at(l, y1, out), at(r, y1, out), at(r, y0, out), c);
    // Cast-stone piers about every 6.5 m; each bay holds a pair of tall dark-framed windows a storey.
    const bays = Math.max(1, Math.round(len / 6.5));
    for (let k = 0; k <= bays; k++) {
      const w = (k === 0 || k === bays ? 1.2 : 0.45) / len;
      quad(Math.max(0, k / bays - w), Math.min(1, k / bays + w), s.base + 0.65, wallTop, 0.25, pier);
    }
    for (let f = 0; f < floors; f++) {
      const y0 = ground + f * pitch + 0.5, y1 = ground + (f + 1) * pitch - 0.5;
      for (let k = 0; k < bays; k++) {
        quad((k + 0.14) / bays, (k + 0.86) / bays, y0 - 0.15, y1 + 0.15, 0.05, frame);
        for (const [l, r] of [[0.18, 0.48], [0.52, 0.82]]) {
          const lit = litHash(seed, i, f, 2 * k + (l < 0.5 ? 0 : 1)) < 0.12;
          quad((k + l) / bays, (k + r) / bays, y0, y1, 0.1, glass, lit);
        }
      }
    }
    // Attic band, then the ground-floor arcade: dark storefront glazing behind the piers
    // under a steel canopy in each bay. The lobby and study rooms stay lit.
    quad(0, 1, wallTop, parapet, 0.12, stoneShade);
    quad(0, 1, ground - 0.5, ground, 0.32, stoneShade);
    for (let k = 0; k < bays; k++) {
      const lit = litHash(seed, i + 8, 0, k) < 0.6;
      quad((k + 0.08) / bays, (k + 0.92) / bays, s.base + 0.65, ground - 1.4, 0.04, glass, lit);
      s.body.quad(at((k + 0.1) / bays, ground - 1.4, 1.6), at((k + 0.1) / bays, ground - 1.1, 0.25),
        at((k + 0.9) / bays, ground - 1.1, 0.25), at((k + 0.9) / bays, ground - 1.4, 1.6), steel);
    }
    // Top storey, set back behind the parapet: a ribbon of glass in steel frames.
    const inner = face(box(hu - inset, hv - inset)[i], box(hu - inset, hv - inset)[(i + 1) % 4]);
    const n = Math.max(1, Math.round(inner.len / 3.2));
    litFacade({ body: s.body, lights: s.lights } as unknown as Parameters<typeof litFacade>[0], seed, i + 4, box(hu - inset, hv - inset)[i], box(hu - inset, hv - inset)[(i + 1) % 4],
      parapet + 0.4, roof - 0.4, 1, inner.len / n, 0.86, 0.85, [glass], 0.15);
    // The steel trellis: slats from the setback wall out past the parapet, on an edge beam.
    const slats = Math.round(len / 1.6);
    for (let k = 0; k <= slats; k++) {
      const t = k / slats, w = 0.12 / len;
      s.body.quad(at(t - w, trellis, -inset), at(t - w, trellis, 1.2), at(t + w, trellis, 1.2), at(t + w, trellis, -inset), steel);
    }
    quad(0, 1, trellis - 0.45, trellis, 1.2, steel);
  });
}

/**
 * The Theatrical Outfit's Balzer Theater at Herren's, 84 Luckie Street: a low brick
 * building with a glazed lobby under a steel canopy on Luckie (the marquee's text is
 * left off). The mapped 40.4 m is a phantom tower; the 2019 lidar roof is 9.2 m.
 */
export const theatricalOutfitId = '3fca5444-4a91-4894-b46f-b030c87c9aba';

function theatricalOutfit(s: Shell) {
  const seed = seedOf(theatricalOutfitId);
  const g0 = 320.9, shop = g0 + 4.2, roof = g0 + 8.9, parapet = g0 + 9.6;
  const hu = 11.45, hv = 13.9;
  const brick = '#8a4f3d', trim = '#cfc6b4', glass = '#8a969c', steel = '#4f5456', deck = '#a19d95';
  const plan = box(hu, hv);
  s.prism(plan, s.base, roof, brick, deck);
  plan.forEach((a, i) => {
    const b = plan[(i + 1) % 4];
    const { len, at } = face(a, b);
    const quad = (l: number, r: number, y0: number, y1: number, out: number, c: string, lit = false) =>
      (lit ? s.lights : s.body).quad(at(l, y0, out), at(l, y1, out), at(r, y1, out), at(r, y0, out), c);
    quad(0, 1, roof, parapet, 0, brick);
    quad(0, 1, parapet - 0.35, parapet, 0.08, trim);
    // Faces: 0 north-east, 1 south-east, 2 Luckie Street (south-west), 3 north-west
    // (the Standard Building's wall). Only the street fronts have openings.
    if (i === 3) return;
    const bays = Math.max(1, Math.round(len / 4));
    const street = i === 2;
    for (let k = 0; k < bays; k++) {
      const l = (k + 0.15) / bays, r = (k + 0.85) / bays;
      quad(l, r, shop + 1, roof - 0.8, 0.06, glass, litHash(seed, i, 1, k) < 0.2);
      if (street) quad((k + 0.05) / bays, (k + 0.95) / bays, s.base + 0.65, shop - 0.6, 0.05, glass, true);
    }
    if (street) {
      // The lobby canopy, cantilevered over the sidewalk.
      s.body.quad(at(0.1, shop - 0.4, 2.2), at(0.1, shop - 0.1, 0), at(0.9, shop - 0.1, 0), at(0.9, shop - 0.4, 2.2), steel);
      quad(0.1, 0.9, shop - 0.9, shop - 0.4, 2.2, steel);
    }
  });
}

// Each building's frame: its centre and an axis along one street side.
const parts: [id: string, origin: P2, axis: P2, draw: (s: Shell) => void][] = [
  // Haas-Howell: along Poplar Street (the outline's south-west side).
  [haasHowellId, [170.5, -302.4], [18, 21.6], haasHowell],
  // Standard: along Fairlie Street (the outline's north-west side).
  [standardBuildingId, [173.4, -360.9], [21.7, -18.5], standardBuilding],
  // Aderhold: the block's grid runs about 40° off the City axes; follow the north-east side.
  [aderholdId, [226, -273], [43.1, -36.8], aderhold],
  // Theatrical Outfit: along Luckie Street, the outline's south-west side (its shorter one, 22.9 m).
  [theatricalOutfitId, [184.2, -347.7], [14.9, 17.4], theatricalOutfit],
];

/**
 * The block as one landmark: one shell (one body, one lamps mesh) owned by Haas-Howell
 * (or the next building present), with each building that is on the board drawn in its
 * own street frame and taken off the generic list.
 */
export function createFairliePoplar(buildings: VBuilding[], grid: GroundGrid) {
  const anchor = parts.find(([id]) => buildings.some(b => b.id === id))?.[0];
  if (!anchor) return null;
  // The probe checks that Haas-Howell's outline is still where this skin expects it.
  const owner = landmarkShell(buildings, grid, anchor, 'Fairlie–Poplar block (GSU)', blockOrigin, [1, 0], anchor === haasHowellId ? [[-24.5, 17.6]] : []);
  if (!owner) return null;
  const drawn = new Set<string>();
  for (const [id, origin, axis, draw] of parts) {
    const site = buildings.find(b => b.id === id);
    const s = site && part(owner, grid, site, origin, axis);
    if (!s) continue;
    draw(s);
    drawn.add(id);
  }
  const out = owner.finish('#f3d6a8', 0.5);
  return { ...out, buildings: out.buildings.filter(b => !drawn.has(b.id)) };
}
