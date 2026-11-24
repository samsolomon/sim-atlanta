import { DoubleSide, Mesh, MeshLambertMaterial } from 'three';
import type { GroundGrid } from '../terrain/grid';
import { Builder, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

/**
 * One Georgia Center, 600 West Peachtree (1968, built as the Life of Georgia headquarters): a
 * square tower clad in white Georgia marble as a deep eggcrate of close vertical fins and projecting
 * floor slabs over pale reflective glass, a solid ribbed white band at the top, and a recessed
 * colonnade at the base. At night the white grid is floodlit and few offices are lit. Evidence,
 * estimates and gaps: docs/log/ui/one-georgia-center/README.md.
 */
export const oneGeorgiaCenterId = 'osm:way:30978402';

// Heights above the 2019 lidar ground ring (303.5 m NAVD88): roof 109.5 (median), central
// penthouse 113 (the 95th percentile, 112.8, sits over it).
const groundNavd = 303.5, roofH = 109.5, penthouseH = 113.2;
const lobbyH = 9, bandLo = 95, floors = 21;
const pitch = (bandLo - lobbyH) / floors;
const finPitch = 2.35, finOut = 0.9;

// Flat vertex colours, not library surfaces: a painted mesh compiles its own shader program,
// and the low tier has no program to spare.
// Glass base #b2bdc3: S 0.09, V 0.76 (sunlit rendered check in the PR).
const marble = '#f1efe9', marbleShade = '#e3e0d8', glass = '#b2bdc3', glassLit = '#b4bfc5';
const lobbyGlass = '#7a7d7e', roofDeck = '#9a9a94';

/** Counter-clockwise in (x, z), so the outward normal of a→b is (dz, -dx)/length. */
function ccw(ring: P2[]): P2[] {
  let area = 0;
  ring.forEach(([x, z], i) => { const [a, b] = ring[(i + 1) % ring.length]; area += x * b - a * z; });
  return area > 0 ? ring : [...ring].reverse();
}

/** Offset a CCW ring by `d` metres along vertex bisectors (negative moves inward). */
function offset(ring: P2[], d: number): P2[] {
  const normal = (a: P2, b: P2) => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [dz / l, -dx / l]; };
  return ring.map((p, i) => {
    const [ax, az] = normal(ring[(i + ring.length - 1) % ring.length], p), [bx, bz] = normal(p, ring[(i + 1) % ring.length]);
    const ml = Math.hypot(ax + bx, az + bz) || 1, mx = (ax + bx) / ml, mz = (az + bz) / ml;
    const k = d / Math.max(0.5, mx * ax + mz * az);
    return [p[0] + mx * k, p[1] + mz * k];
  });
}

/** Drop vertices that lie on a straight run (within 1 degree), so each face is one edge. */
function straighten(ring: P2[]): P2[] {
  return ring.filter((p, i) => {
    const a = ring[(i + ring.length - 1) % ring.length], b = ring[(i + 1) % ring.length];
    const u = Math.atan2(p[1] - a[1], p[0] - a[0]), v = Math.atan2(b[1] - p[1], b[0] - p[0]);
    return Math.abs(Math.atan2(Math.sin(v - u), Math.cos(v - u))) > Math.PI / 180;
  });
}

export function createOneGeorgiaCenter(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const origin: P2 = [341, -1881];
  const s = landmarkShell(buildings, grid, site.id, 'One Georgia Center', origin, [1, 0], [[0, 0], [-12, -12], [12, 12]]);
  if (!s) return null;
  const y = (h: number) => groundNavd + h;
  const seed = seedOf(site.id);
  const plan = straighten(ccw(s.ring));
  // The floodlit white grid: lit by its own cool-white material, so offices stay warm.
  const wash = new Builder();

  const quad = (b: Builder, a: P2, c: P2, t0: number, t1: number, lo: number, hi: number, out: number, color: string) => {
    const dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz);
    const p = (t: number, yy: number) => [a[0] + t * dx + out * dz / l, yy, a[1] + t * dz - out * dx / l];
    b.quad(p(t0, lo), p(t0, hi), p(t1, hi), p(t1, lo), color);
  };
  /** A horizontal strip from the wall out to `out`, at height `yy`: a slab's top. */
  const ledge = (b: Builder, a: P2, c: P2, yy: number, out: number, color: string) => {
    const dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz), nx = dz / l * out, nz = -dx / l * out;
    b.quad([a[0], yy, a[1]], [c[0], yy, c[1]], [c[0] + nx, yy, c[1] + nz], [a[0] + nx, yy, a[1] + nz], color);
  };

  // The glass box over a lobby recessed 2.5 m behind the colonnade, then the solid crown band
  // (floodlit with the grid) and the roof.
  s.prism(plan, y(lobbyH) - 0.9, y(bandLo), glass, roofDeck);
  s.prism(offset(plan, -2.5), s.base, y(lobbyH) - 0.9, lobbyGlass, marbleShade);
  for (let i = 0; i < plan.length; i++) {
    const a = plan[i], b = plan[(i + 1) % plan.length];
    quad(wash, a, b, 0, 1, y(bandLo), y(roofH), 0, marble);
  }
  s.prism(plan, y(roofH) - 0.2, y(roofH), marble, roofDeck);
  s.prism([[-14, -8], [10, -8], [10, 8], [-14, 8]], y(roofH), y(penthouseH), marble, '#b9b7b0');

  plan.forEach((a, edge) => {
    const b = plan[(edge + 1) % plan.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < 4) return;
    // An even bay count, so the colonnade's piers land on both corners.
    const bays = 2 * Math.round(length / finPitch / 2);
    const ext = finOut / length;
    // The colonnade: square marble piers on every second fin, standing on the wall line.
    for (let i = 0; i <= bays; i += 2) {
      const t = i / bays, w = 0.45 / length;
      quad(wash, a, b, t - w, t + w, s.base, y(lobbyH), 0.45, marble);
    }
    // Fins: full-height marble boxes 0.8 m wide, standing finOut off the glass. A face and one
    // side each (the other side is the neighbouring face's job at a corner).
    for (let i = 0; i <= bays; i++) {
      const t = i / bays, w = 0.4 / length;
      quad(wash, a, b, t - w, t + w, y(lobbyH), y(bandLo), finOut, marble);
      const dx = b[0] - a[0], dz = b[1] - a[1];
      const foot = (u: number, out: number): number[] => [a[0] + u * dx + out * dz / length, a[1] + u * dz - out * dx / length];
      const [p0, p1] = [foot(t - w, 0), foot(t - w, finOut)];
      wash.quad([p0[0], y(lobbyH), p0[1]], [p0[0], y(bandLo), p0[1]], [p1[0], y(bandLo), p1[1]], [p1[0], y(lobbyH), p1[1]], marbleShade);
    }
    // Floor slabs: a face and a top at every floor, run past both ends so corners close.
    for (let f = 0; f <= floors; f++) {
      const yy = y(lobbyH + f * pitch);
      quad(wash, a, b, -ext, 1 + ext, yy - 0.9, yy, finOut, marbleShade);
      ledge(wash, a, b, yy, finOut, marble);
    }
    // Offices at 23:30: few lit, per the 2020 night photograph.
    for (let f = 0; f < floors; f++) {
      const lo = y(lobbyH + f * pitch);
      for (let i = 0; i < bays; i++) {
        if (litHash(seed, edge, f, i) >= 0.04) continue;
        quad(s.lights, a, b, (i + 0.1) / bays, (i + 0.9) / bays, lo + 0.2, lo + pitch - 0.6, 0.06, glassLit);
      }
    }
    // The crown band's vertical ribs.
    for (let i = 1; i < bays; i += 1) {
      const t = i / bays, w = 0.12 / length;
      quad(wash, a, b, t - w, t + w, y(bandLo), y(roofH) - 0.3, 0.08, marbleShade);
    }
  });

  const built = s.finish('#f2e6cf', 0.6);
  const washMesh = new Mesh(wash.geometry(),
    new MeshLambertMaterial({ vertexColors: true, side: DoubleSide, emissive: '#dfe7ee', emissiveIntensity: 0 }));
  washMesh.castShadow = washMesh.receiveShadow = true;
  built.group.add(washMesh);
  return {
    ...built,
    setNight(night: number) {
      built.setNight(night);
      washMesh.material.emissiveIntensity = night * 0.3;
    },
  };
}
