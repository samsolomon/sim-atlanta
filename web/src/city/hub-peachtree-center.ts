import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litHash, seedOf } from './skin-kit';

/**
 * The Hub at Peachtree Center (the former Mall at Peachtree Center, renovated 2017–2019 by The
 * Beck Group for Banyan Street): the low block that closes the east end of the Peachtree Center
 * plaza, between the Harris and International towers, with Peachtree Center Avenue behind it.
 * Three photographed identifiers: the whole roof painted in flowing white and pale-blue waves
 * (satellite), a grey-and-white mural with yellow arcs across the upper Peachtree Center Avenue
 * face over a dark base with one red storefront (Street View, December 2025), and a gridded glass
 * atrium front facing the plaza (AIA Georgia, 2020). The mural is drawn as abstract patches and
 * arcs, not the portrait. Evidence: docs/log/ui/hub-peachtree-center/README.md.
 */
export const hubPeachtreeCenterId = 'ec83a792-f5f6-446e-9424-26858da5640e';

// Lidar, 22 April 2019: ground ring 316.3 m NAVD88, a flat roof at a median 29.9 m (p95 30.1).
const groundNavd = 316.3, roofH = 29.9;

// Flat vertex colours: a painted library surface is a hooked material the batcher never merges.
const precast = '#b9b4a8', roofWhite = '#eef0ee', wave = '#8db3cf', base = '#2f3236', red = '#a3322b';
const atriumGlass = '#6f879b', atriumLit = '#71899d', mullion = '#e6e8e6', ribbon = '#3d4a55', topGlass = '#7d93a6';
// Mostly light greys with a few dark shapes, as in the December 2025 photo.
const mural = ['#ecece8', '#ecece8', '#e0e0dc', '#d3d3cf', '#d3d3cf', '#b9bab7', '#a8a9a6', '#8a8c8c', '#5c5e61'], yellow = '#e2b52c';

type Shell = NonNullable<ReturnType<typeof landmarkShell>>;
type Builder = Shell['body'];

function ccw(ring: P2[]): P2[] {
  let area = 0;
  ring.forEach(([x, z], i) => { const [a, b] = ring[(i + 1) % ring.length]; area += x * b - a * z; });
  return area > 0 ? ring : [...ring].reverse();
}

/** A point on the face a → b: `t` along it, `y` up, `out` metres beyond the wall. */
function facePoint(a: P2, b: P2, t: number, y: number, out: number) {
  const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz);
  return [a[0] + t * dx + out * dz / l, y, a[1] + t * dz - out * dx / l];
}

function panel(b: Builder, a: P2, c: P2, t0: number, t1: number, lo: number, hi: number, out: number, color: string) {
  if (hi - lo < 0.05 || t1 <= t0) return;
  b.quad(facePoint(a, c, t0, lo, out), facePoint(a, c, t0, hi, out), facePoint(a, c, t1, hi, out), facePoint(a, c, t1, lo, out), color);
}

export function createHubPeachtreeCenter(buildings: VBuilding[], grid: GroundGrid) {
  const origin: P2 = [484, -716];
  const s = landmarkShell(buildings, grid, hubPeachtreeCenterId, 'The Hub at Peachtree Center', origin, [1, 0], [[0, 0]]);
  if (!s) return null;
  const roof = groundNavd + roofH;
  const seed = seedOf(hubPeachtreeCenterId);
  const ring = ccw(s.ring);
  s.prism(ring, s.base, roof, precast, roofWhite);

  ring.forEach((a, edge) => {
    const b = ring[(edge + 1) % ring.length];
    const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
    const nx = dz / length, nz = -dx / length;
    // Each face's own street grade, so the base band never sinks below the pavement.
    const street = Math.max(s.base + 0.35, ...[a, b].map(([x, z]) => grid.sample(x + origin[0], z + origin[1]) ?? s.base));
    if (nx > 0.7) {
      // Peachtree Center Avenue: dark base, one red storefront, the mural with a ribbon window
      // band through it, and a glazed band under the roof.
      const top = roof - 3.6, rib0 = street + 13, rib1 = street + 15;
      panel(s.body, a, b, 0, 1, street, street + 5, 0.05, base);
      panel(s.body, a, b, 0.58, 0.72, street + 0.2, street + 4.6, 0.1, red);
      panel(s.body, a, b, 0, 1, rib0, rib1, 0.06, ribbon);
      panel(s.body, a, b, 0, 1, top, roof - 0.8, 0.05, topGlass);
      const cols = Math.max(4, Math.round(length / 5.5));
      for (const [lo, hi, rows] of [[street + 5, rib0, 2], [rib1, top, 3]] as const) {
        for (let r = 0; r < rows; r++) for (let c = 0; c <= cols; c++) {
          // Alternate rows are offset half a patch, so the mural doesn't read as a checkerboard.
          const shift = r % 2 ? 0.5 : 0;
          const tone = mural[Math.floor(litHash(seed, 7, r + (lo > rib0 ? 10 : 0), c) * mural.length)];
          const y0 = lo + (hi - lo) * r / rows, y1 = lo + (hi - lo) * (r + 1) / rows;
          panel(s.body, a, b, Math.max(0, (c - shift) / cols), Math.min(1, (c + 1 - shift) / cols), y0, y1, 0.06, tone);
        }
      }
      // Two broad yellow arcs sweep across the mural.
      for (const [tc, yc, radius, from, to] of [[0.32, street + 18, 7, 200, 340], [0.78, street + 11, 5, 20, 190]] as const) {
        const steps = 8;
        for (let k = 0; k < steps; k++) {
          const a0 = (from + (to - from) * k / steps) * Math.PI / 180, a1 = (from + (to - from) * (k + 1) / steps) * Math.PI / 180;
          const p = (ang: number, r: number) => facePoint(a, b, tc + r * Math.cos(ang) / length, yc + r * Math.sin(ang), 0.11);
          s.body.quad(p(a0, radius - 0.35), p(a0, radius + 0.35), p(a1, radius + 0.35), p(a1, radius - 0.35), yellow);
        }
      }
    } else if (nx < -0.3) {
      // The plaza front: a gridded glass atrium over glass storefronts, white mullions.
      const top = roof - 2.2;
      panel(s.body, a, b, 0, 1, street + 0.3, top, 0.05, atriumGlass);
      const bays = Math.max(1, Math.round(length / 3)), floors = Math.max(1, Math.round((top - street) / 4.5));
      for (let f = 0; f < floors; f++) for (let i = 0; i < bays; i++) {
        if (litHash(seed, edge, f, i) >= 0.35) continue;
        const y0 = street + 0.3 + (top - street - 0.3) * f / floors;
        panel(s.lights, a, b, (i + 0.06) / bays, (i + 0.94) / bays, y0 + 0.2, y0 + (top - street) / floors - 0.3, 0.1, atriumLit);
      }
      for (let i = 0; i <= bays; i++) panel(s.body, a, b, Math.max(0, i / bays - 0.12 / length), Math.min(1, i / bays + 0.12 / length), street + 0.3, top, 0.15, mullion);
      for (let f = 0; f <= floors; f++) {
        const yy = street + 0.3 + (top - street - 0.3) * f / floors;
        panel(s.body, a, b, 0, 1, yy - 0.15, yy + 0.15, 0.15, mullion);
      }
    }
  });

  // The painted roof: flowing pale-blue waves over white, sweeping north-west to south-east.
  const x0 = 471 - origin[0], x1 = 500.5 - origin[0], zMin = -741.5 - origin[1], zMax = -691 - origin[1];
  const yRoof = roof + 0.05, segs = 12;
  for (let k = 0; k < 6; k++) {
    const zc = zMin + 3 + k * 8.4;
    const edge = (u: number, side: number) => {
      const x = x0 + (x1 - x0) * u;
      const z = zc + 9 * u - 4.5 + 3.2 * Math.sin(u * Math.PI * 2 + k * 0.7) + side * 1.6;
      return [x, yRoof, Math.min(zMax, Math.max(zMin, z))];
    };
    for (let j = 0; j < segs; j++) {
      const u0 = j / segs, u1 = (j + 1) / segs;
      s.body.quad(edge(u0, -1), edge(u0, 1), edge(u1, 1), edge(u1, -1), wave);
    }
  }

  return s.finish('#f2d6a8', 0.6);
}
