import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

/**
 * Hampton Inn & Suites Atlanta Midtown (2020) at West Peachtree and 15th: a
 * 20-storey hotel slab of pale grey precast with a warm tan centre field of
 * punched windows, a glazed West Peachtree / 15th corner, and a dark-bronze
 * frame that climbs that corner and arches over the 20th-floor rooftop lounge.
 * The 2019 lidar predates completion, so the height is the reported 20
 * storeys (~66 m). The wordmarks are left off.
 */
export const hamptonMidtownId = 'osm:way:885304559';

const grey = '#d9dad6',
  tan = '#c2b29c',
  bronze = '#76604a',
  glass = '#8a9499',
  cornerGlass = '#7d9099',
  base = '#5d6a70',
  trim = '#8e3a34',
  roofDeck = '#a6a39c';

export function createHamptonInnMidtown(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const s = landmarkShell(buildings, grid, site.id, 'Hampton Inn & Suites Midtown', [383, -3829], [1, 0],
    [[0, 0], [-15, 0], [15, 0]]);
  if (!s) return null;
  const seed = seedOf(hamptonMidtownId);
  const g0 = s.base + 0.35;
  const lobby = g0 + 6, floors = 18, pitch = 3.05, roomsTop = lobby + floors * pitch, // ≈ 61 m
    lounge = g0 + 64.5, parapet = g0 + 66;

  const area = s.ring.reduce((t, [x, z], i) => {
    const [x2, z2] = s.ring[(i + 1) % s.ring.length];
    return t + x * z2 - x2 * z;
  }, 0);
  const plan = area > 0 ? s.ring : [...s.ring].reverse();
  s.prism(plan, s.base, lobby, base, roofDeck);
  s.prism(plan, lobby, roomsTop, grey, roofDeck);
  // The rooftop lounge: a glazed box set back from the east, open terrace to the west.
  const us = plan.map(p => p[0]), vs = plan.map(p => p[1]);
  const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
  // Kept clear of the chamfered NE corner.
  const loungeBox: P2[] = [[u0 + 12, v0 + 6], [u1 - 0.5, v0 + 6], [u1 - 0.5, v1 - 1], [u0 + 12, v1 - 1]];
  s.prism(loungeBox, roomsTop, lounge, cornerGlass, roofDeck);
  s.prism(loungeBox, lounge, parapet, grey, roofDeck);

  // Facades on the ring's own segments (the north face has chamfered ends), so
  // nothing hangs past the outline. The NW chamfer at West Peachtree and 15th
  // (+z is south, so 15th Street is the north side) is the glazed corner.
  let chamfer: [P2, P2] | null = null, best = Infinity;
  plan.forEach((a, i) => {
    const b = plan[(i + 1) % plan.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    if (len < 3) return;
    const mid: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const diag = Math.abs(dx) > 1 && Math.abs(dz) > 1;
    // The corner chamfer nearest the NW corner is the glazed corner.
    const dNW = Math.hypot(mid[0] - u0, mid[1] - v0);
    if (diag && dNW < best) { best = dNW; chamfer = [a, b]; }
    const at = (t: number, y: number, out: number) => [a[0] + t * dx + out * dz / len, y, a[1] + t * dz - out * dx / len];
    const quad = (l: number, r: number, y0: number, y1: number, out: number, c: string, lit = false) =>
      (lit ? s.lights : s.body).quad(at(l, y0, out), at(l, y1, out), at(r, y1, out), at(r, y0, out), c);
    // Warm tan centre field on the long north and south faces (u -8…10).
    if (Math.abs(dx) > Math.abs(dz) * 3) {
      const tAt = (u: number) => (u - a[0]) / dx;
      const l = Math.max(0, Math.min(tAt(-8), tAt(10))), r = Math.min(1, Math.max(tAt(-8), tAt(10)));
      if (r > l) quad(l, r, lobby, roomsTop, 0.04, tan);
    }
    // Hotel rooms, noticeably lit at night.
    if (len > 5) {
      const bays = Math.max(1, Math.round(len / 3.1));
      litFacade(s, seed, i, a, b, lobby, roomsTop, floors, len / bays, 0.42, 0.5, [glass], 0.3);
    }
    // Base: storefront glazing lit, a red trim band above it.
    quad(0.03, 0.97, g0 + 0.3, lobby - 1.2, 0.05, base, true);
    quad(0, 1, lobby - 1.1, lobby - 0.4, 0.12, trim);
  });

  if (chamfer) {
    const [a, b] = chamfer as [P2, P2];
    const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
    let nx = dz / len, nz = -dx / len;
    // Outward is away from the slab's centre.
    if (((a[0] + b[0]) / 2) * nx + ((a[1] + b[1]) / 2) * nz < 0) { nx = -nx; nz = -nz; }
    const off = (p: P2, o: number, t = 0): P2 => [p[0] + nx * o + dx * t, p[1] + nz * o + dz * t];
    // Glazed corner, full height.
    const ga = off(a, 0.06), gb = off(b, 0.06);
    s.body.quad([ga[0], lobby, ga[1]], [ga[0], roomsTop, ga[1]], [gb[0], roomsTop, gb[1]], [gb[0], lobby, gb[1]], cornerGlass);
    // The dark-bronze frame: a post at each end of the chamfer and a lintel
    // arching over the roof terrace, all built as touching prisms.
    const top = parapet + 1.2, w = 0.55, rect = (c: P2, ux: number, uz: number, l0: number, l1: number, o0: number, o1: number): P2[] => [
      [c[0] + ux * l0 + nx * o0, c[1] + uz * l0 + nz * o0], [c[0] + ux * l1 + nx * o0, c[1] + uz * l1 + nz * o0],
      [c[0] + ux * l1 + nx * o1, c[1] + uz * l1 + nz * o1], [c[0] + ux * l0 + nx * o1, c[1] + uz * l0 + nz * o1]];
    const ux = dx / len, uz = dz / len;
    for (const p of [a, b]) {
      const sgn = p === a ? 1 : -1;
      s.prism(rect(p, ux, uz, sgn > 0 ? 0 : -w, sgn > 0 ? w : 0, -0.05, w), lobby, top, bronze, bronze);
    }
    const steps = 5;
    for (let k = 0; k < steps; k++) {
      const t0 = k / steps, t1 = (k + 1) / steps, tm = (t0 + t1) / 2;
      const lift = Math.sin(Math.PI * tm) * 1.0;
      s.prism(rect(a, ux, uz, t0 * len - 0.05, t1 * len + 0.05, -0.05, w), top - w + lift - 0.3, top + lift, bronze, bronze);
    }
  }
  return s.finish('#f6d9a8', 0.55);
}
