import type { GroundGrid } from '../terrain/grid';
import { pointInRing, rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

export const peachtree999Id = 'osm:way:886036475';
const origin: P2 = [728, -3026];
// Every elevation in the photos centres a full-height blue curtain wall between
// pale stone wings. The mapped crown rectangle sits over it; its centre anchors the glass.
const glassCentre: P2 = [2.8, 0.9];
const glassHalf = { northSouth: 12.5, eastWest: 7 };

export function create999Peachtree(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const parts = site.parts;
  const shaft = parts?.find(part => part.id === 'osm:way:234733182');
  const cap = parts?.find(part => part.id === 'osm:way:796359186');
  if (!parts || !shaft || !cap) return null;
  const shell = landmarkShell(buildings, grid, site.id, '999 Peachtree', origin, [1, 0], [[0, 0], [-10, 22], [14, -24]]);
  if (!shell) return null;
  const { body, lights } = shell;
  const plan = (ring: P2[]): P2[] => {
    const points: P2[] = ring.map(([x, z]) => [x - origin[0], z - origin[1]]);
    const sum = points.reduce((area, [x, z], i) => {
      const [nx, nz] = points[(i + 1) % points.length];
      return area + x * nz - nx * z;
    }, 0);
    return sum < 0 ? points.reverse() : points;
  };
  const datum = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const podiumTop = datum + 9.3, shoulder = datum + 54.6, roof = datum + shaft.h;
  const stone = '#e4ddd0', trim = '#ece6db', roofStone = '#a9a499', reveal = '#b9b0a0';
  const windows = ['#4f6676', '#57707f', '#4a6272'];
  const curtain = ['#6d8fa9', '#7898b0', '#6688a3'];
  const mullion = '#d9dbd6';
  const random = rng(999);

  // Mapped parts in the local plan with their top heights, to hide faces buried in a neighbour.
  const solids = parts.map(part => ({ ring: plan(part.rings[0]), top: datum + part.h }));
  const covered = (a: P2, b: P2, len: number) => {
    const mx = (a[0] + b[0]) / 2 + 0.6 * (b[1] - a[1]) / len;
    const mz = (a[1] + b[1]) / 2 - 0.6 * (b[0] - a[0]) / len;
    return Math.max(podiumTop, ...solids.filter(s => pointInRing(mx, mz, s.ring)).map(s => s.top));
  };

  const faces = (ring: P2[], draw: (a: P2, b: P2, len: number) => void) =>
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len > 0.5) draw(a, b, len);
    });

  const podium = plan(site.rings[0]);
  shell.prism(podium, shell.base, podiumTop, stone, roofStone);
  faces(podium, (a, b, len) => {
    const entry = len > 10 && a[0] < -13 && b[0] < -13 && Math.abs((a[1] + b[1]) / 2) < 2;
    shell.facade(a, b, datum + 0.35, podiumTop - 0.3, entry ? 1 : 2, entry ? 2.5 : 3.7,
      entry ? 0.97 : 0.62, entry ? 0.86 : 0.66, windows, entry ? 0.24 : 0.08);
    if (!entry) return;
    const along = (t: number, offset: number): P2 =>
      [a[0] + t * (b[0] - a[0]) + offset * (b[1] - a[1]) / len,
        a[1] + t * (b[1] - a[1]) - offset * (b[0] - a[0]) / len];
    shell.prism([along(0.12, 0), along(0.12, 1.8), along(0.88, 1.8), along(0.88, 0)],
      datum + 5.3, datum + 6.15, trim, roofStone);
  });

  const inGlass = (p: P2, a: P2, b: P2) => Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0])
    ? Math.abs(p[1] - glassCentre[1]) < glassHalf.northSouth
    : Math.abs(p[0] - glassCentre[0]) < glassHalf.eastWest;

  // Stone wings carry punched windows between broad piers and spandrels. The central
  // curtain wall is continuous glass with thin pale mullions; the wings stand 0.6 m proud of it.
  function framed(a: P2, b: P2, len: number, lo: number, hi: number, rows: number, tall: boolean) {
    if (hi - lo < 1) return;
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const count = Math.max(1, Math.round(len / 3.2));
    const pitch = (hi - lo) / rows;
    const point = (t: number, y: number, depth: number): [number, number, number] =>
      [a[0] + t * dx + depth * dz / len, y, a[1] + t * dz - depth * dx / len];
    const panel = (batch: typeof body, l: number, r: number, bottom: number, top: number, depth: number, color: string) =>
      batch.quad(point(l, bottom, depth), point(l, top, depth), point(r, top, depth), point(r, bottom, depth), color);
    for (let bay = 0; bay < count; bay++) {
      const seam = bay / count, next = (bay + 1) / count;
      const mid: P2 = [a[0] + (seam + next) / 2 * dx, a[1] + (seam + next) / 2 * dz];
      if (inGlass(mid, a, b)) {
        const m = 0.12 / len;
        panel(body, seam, seam + m, lo, hi, 0.12, mullion);
        for (let row = 0; row < rows; row++) {
          const y = lo + row * pitch;
          panel(random() < 0.1 ? lights : body, seam + m, next, y, y + pitch, 0.03, curtain[(bay + row) % curtain.length]);
        }
        continue;
      }
      const pier = Math.min(1.5, len / count * 0.45) / (2 * len);
      const l = seam + pier, r = next - pier;
      panel(body, seam, l, lo, hi, 0.6, trim);
      panel(body, r, next, lo, hi, 0.6, trim);
      body.quad(point(l, lo, 0), point(l, hi, 0), point(l, hi, 0.6), point(l, lo, 0.6), reveal);
      body.quad(point(r, lo, 0.6), point(r, hi, 0.6), point(r, hi, 0), point(r, lo, 0), reveal);
      const sill = tall ? 0.3 : 0.48;
      for (let row = 0; row < rows; row++) {
        const y = lo + row * pitch;
        panel(random() < 0.1 ? lights : body, l, r, y + sill * pitch, y + pitch, 0.08, windows[(bay + row) % windows.length]);
        panel(body, l, r, y, y + sill * pitch, 0.56, stone);
      }
    }
  }

  const floor = (hi: number, lo: number) => Math.max(1, Math.round((hi - lo) / 4.05));
  const tower = plan(shaft.rings[0]);
  shell.prism(tower, podiumTop, roof, stone, roofStone);
  faces(tower, (a, b, len) => {
    const lo = covered(a, b, len);
    if (lo < shoulder) framed(a, b, len, lo, shoulder, floor(shoulder, lo), false);
    if (lo < roof - 1) framed(a, b, len, Math.max(lo, shoulder), roof - 0.9, floor(roof - 0.9, Math.max(lo, shoulder)), true);
  });
  for (const part of parts) {
    if (part.h <= 9.3 || part === shaft || part === cap) continue;
    const ring = plan(part.rings[0]);
    const top = datum + part.h;
    shell.prism(ring, podiumTop, top, stone, roofStone);
    faces(ring, (a, b, len) => {
      const lo = covered(a, b, len);
      if (lo < top - 1) framed(a, b, len, lo, top - 0.35, floor(top - 0.35, lo), false);
    });
  }
  shell.prism(plan(cap.rings[0]), roof, datum + cap.h, '#d3ccbf', '#bdb7ab');
  return shell.finish('#f3e0b6', 0.53);
}
