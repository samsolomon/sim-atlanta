import type { GroundGrid } from '../terrain/grid';
import { pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

/**
 * Ansley Above the Park, 1130 Piedmont Avenue NE: a white mid-century apartment slab on 13th
 * Street with stacked balconies, a central blue-glass elevator strip that rises above the roof, a
 * lower east wing on Piedmont Avenue with deep cantilevered balconies, and a semicircular
 * porte-cochère with a blue fascia facing 13th Street. Heights are NAVD88 metres from the April
 * 2019 3DEP lidar, which disagrees with the estimated 52.8 m and the mapped 54 m: the slab roof is
 * 322 m (about 43 m over the 279 m street), the elevator strip 327.5 m, the east wing 306.5 m
 * and the canopy 285.4 m (docs/log/ui/ansley-above-the-park/README.md). City z grows to the
 * south, so 13th Street is on the south side. Flat vertex colours, no library surfaces.
 */
export const ansleyId = 'osm:way:269747490';
const slabPart = 'osm:way:886021361';
const wingPart = 'osm:way:886021362';
const canopyPart = 'osm:way:886021360';
const origin: P2 = [1170, -3535];

const slabRoof = 322,
  stripTop = 327.5,
  wingRoof = 306.5,
  canopyTop = 285.4;

// Glass from the provisional base-value table: base V >= 62 -> S <= 30.
const white = '#ebeae5',
  window = '#9ba7af', // S 11%, V 69%
  stripGlass = '#8199b4', // S 28%, V 71%: the blue elevator strip
  fascia = '#5677ad', // painted blue band on the porte-cochère (not glass)
  rail = '#c9cdcf',
  darkRail = '#55595e',
  roof = '#9a9892';

export function createAnsley(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const slab = site.parts?.find(p => p.id === slabPart);
  const wing = site.parts?.find(p => p.id === wingPart);
  const canopy = site.parts?.find(p => p.id === canopyPart);
  if (slab?.rings.length !== 1 || wing?.rings.length !== 1 || canopy?.rings.length !== 1) return null;
  const s = landmarkShell(buildings, grid, site.id, 'Ansley Above the Park', origin, [1, 0], [[0, 0], [-25, 0]]);
  if (!s) return null;
  const seed = seedOf(site.id);
  const local = (ring: P2[]): P2[] => {
    const plan = ring.map(([x, z]): P2 => [x - origin[0], z - origin[1]]);
    const area = plan.reduce((sum, [x, z], i) => sum + x * plan[(i + 1) % plan.length][1] - plan[(i + 1) % plan.length][0] * z, 0);
    return area < 0 ? plan.reverse() : plan;
  };
  const gradeAt = (u: number, v: number) => grid.sample(u + origin[0], v + origin[1]) ?? s.base;
  type Face = { a: P2; b: P2; length: number; n: P2 };
  const faces = (plan: P2[]): Face[] => plan.map((a, i) => {
    const b = plan[(i + 1) % plan.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    return { a, b, length, n: [(b[1] - a[1]) / length, -(b[0] - a[0]) / length] as P2 };
  }).filter(f => f.length > 2.5);
  const at = (f: Face, t: number, y: number, depth: number) =>
    [f.a[0] + t * (f.b[0] - f.a[0]) + depth * f.n[0], y, f.a[1] + t * (f.b[1] - f.a[1]) + depth * f.n[1]];
  const panel = (f: Face, l: number, r: number, lo: number, hi: number, depth: number, color: string, lit = false) =>
    (lit ? s.lights : s.body).quad(at(f, l, lo, depth), at(f, l, hi, depth), at(f, r, hi, depth), at(f, r, lo, depth), color);
  const flat = (f: Face, l: number, r: number, y: number, d: number, color: string) =>
    s.body.quad(at(f, l, y, 0), at(f, l, y, d), at(f, r, y, d), at(f, r, y, 0), color);

  const slabPlan = local(slab.rings[0]);
  const wingPlan = local(wing.rings[0]);
  const canopyPlan = local(canopy.rings[0]);
  // One floor datum for the whole building, so floors line up around every corner.
  const datum = s.base + 0.35;

  // The blue-glass elevator strip sits at the middle of the 13th Street (south) face of the slab.
  // Lidar: the core reaches 327-329 m around x 1166-1178, i.e. u = -2..6 behind that face.
  const southFaces = faces(slabPlan).filter(f => f.n[1] > 0.7);
  if (!southFaces.length) return null;
  const south = southFaces.reduce((a, b) => (b.length > a.length ? b : a));
  const c = (2 - south.a[0]) / (south.b[0] - south.a[0]);
  const w = 3 / south.length;
  const onStrip = (f: Face, l: number, r: number) => f === south && r > c - w - 0.01 && l < c + w + 0.01;

  /** A white block of punched windows, with balcony stacks on its long faces. */
  const block = (plan: P2[], other: P2[], otherTop: number, top: number, floors: number, deep: number, railColor: string, face0: number, minLong: number) => {
    s.prism(plan, s.base, top, white, roof);
    faces(plan).forEach((f, i) => {
      const behind = at(f, 0.5, 0, 1);
      // A face against the other (lower) block shows only above that block's roof.
      const covered = pointInRing(behind[0], behind[2], other) ? otherTop : -Infinity;
      if (covered >= top - 2) return;
      const mid = at(f, 0.5, 0, 0), grade = gradeAt(mid[0], mid[2]);
      const lobby = datum + 4.5, pitch = (top - 1 - lobby) / floors;
      const bays = Math.max(1, Math.round(f.length / 3.6));
      const long = f.length > minLong && covered < 0;
      // Punched windows: one window band per floor behind a white pier per bay (far fewer quads
      // than a pane per window); lit rooms sit between the two. Layers stand 5 cm apart or more (band 5, lit
      // rooms 10, piers 15, parapet 20 cm): closer ones z-fight at 400-600 m.
      const from = Math.max(lobby, covered);
      for (let k = 0; k <= bays; k++) {
        const l = Math.max(0, k / bays - 0.18 / bays), r = Math.min(1, k / bays + 0.18 / bays);
        if (!onStrip(f, l, r)) panel(f, l, r, from, top - 1, 0.15, white);
      }
      for (let j = 0; j < floors; j++) {
        const y = lobby + j * pitch;
        if (y < covered) continue;
        panel(f, 0, 1, y + 0.5, y + pitch - 0.5, 0.05, window);
        for (let k = 0; k < bays; k++) {
          if (litHash(seed, face0 + i, j, k) < 0.3) panel(f, (k + 0.18) / bays, (k + 0.82) / bays, y + 0.5, y + pitch - 0.5, 0.1, window, true);
        }
        // Balconies in alternate bays on long faces; their slabs read as white bands.
        if (long && j > 0) for (let k = 0; k < bays; k += 2) {
          if (onStrip(f, k / bays, (k + 1) / bays)) continue;
          // Slab top plus one front face: the white edge and the rail read as one band.
          flat(f, (k + 0.05) / bays, (k + 0.95) / bays, y, deep, white);
          panel(f, (k + 0.05) / bays, (k + 0.95) / bays, y - 0.3, y + 1.0, deep, railColor);
        }
      }
      if (covered < 0) panel(f, 0.02, 0.98, grade + 0.3, lobby - 0.6, 0.05, window, true);
      panel(f, -0.003, 1.003, top - 1, top, 0.2, white);
    });
  };
  block(slabPlan, wingPlan, wingRoof, slabRoof, 13, 1.4, rail, 0, 12);
  // The wing's Piedmont Avenue face is mapped in 8 m pieces; each still carries balconies.
  block(wingPlan, slabPlan, slabRoof, wingRoof, 8, 2.2, darkRail, 40, 7);

  // The elevator core: a white block in the south face's own frame, from the canopy roof up past
  // the slab roof, glazed in blue across its front.
  const corner = (t: number, d: number): P2 => { const p = at(south, t, 0, d); return [p[0], p[2]]; };
  const core: P2[] = [corner(c - w, -6), corner(c + w, -6), corner(c + w, 1.2), corner(c - w, 1.2)];
  s.prism(core, canopyTop, stripTop, white, roof);
  panel(south, c - w + 0.15 / south.length, c + w - 0.15 / south.length, canopyTop + 0.3, stripTop - 0.6, 1.25, stripGlass, true);

  // Semicircular porte-cochère: a thin roof on columns with a blue fascia, open beneath.
  const [cu, cv] = canopyPlan.reduce(([a, b], [u, v]) => [a + u / canopyPlan.length, b + v / canopyPlan.length], [0, 0]);
  const canopyGrade = gradeAt(cu, cv);
  const lo = Math.max(canopyGrade + 3.5, canopyTop - 1.2);
  s.prism(canopyPlan, lo, canopyTop, fascia, white);
  // Columns every ~5 m along the curved front, 1.2 m in from the edge (the mapped arc is in short
  // segments, so walk its length rather than its faces).
  let walked = 2.5;
  canopyPlan.forEach((a, i) => {
    const b = canopyPlan[(i + 1) % canopyPlan.length];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const n: P2 = [(b[1] - a[1]) / len, -(b[0] - a[0]) / len];
    if (len < 1e-6 || n[1] < -0.7) { walked = 2.5; return; } // the edge against the slab
    for (; walked < len; walked += 5) {
      const t = walked / len, x = a[0] + t * (b[0] - a[0]) - 1.2 * n[0], z = a[1] + t * (b[1] - a[1]) - 1.2 * n[1];
      const g = gradeAt(x, z);
      s.body.box(0.5, lo - g + 0.4, 0.5, x, (lo + g - 0.4) / 2, z, white);
    }
    walked -= len;
  });
  return s.finish('#ffdcae', 0.62);
}
