import type { GroundGrid } from '../terrain/grid';
import { rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

export const peachtree999Id = 'osm:way:886036475';
const origin: P2 = [728, -3026];

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
  const stone = '#bcb19d', trim = '#d0c5b2', roofStone = '#928d82';
  const glass = ['#526775', '#465c6c', '#5c7080'];
  const random = rng(999);

  const faces = (ring: P2[], draw: (a: P2, b: P2, len: number) => void) =>
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len > 0.5) draw(a, b, len);
    });

  const podium = plan(site.rings[0]);
  shell.prism(podium, shell.base, podiumTop, stone, roofStone);
  faces(podium, (a, b, len) => {
    const entry = len > 10 && a[0] < -13 && b[0] < -13
      && Math.abs((a[1] + b[1]) / 2) < 2;
    shell.facade(a, b, datum + 0.35, podiumTop - 0.3, entry ? 1 : 2, entry ? 2.5 : 3.7,
      entry ? 0.97 : 0.72, entry ? 0.86 : 0.72, glass, entry ? 0.24 : 0.08);
    if (!entry) return;
    const along = (t: number, offset: number): P2 =>
      [a[0] + t * (b[0] - a[0]) + offset * (b[1] - a[1]) / len,
        a[1] + t * (b[1] - a[1]) - offset * (b[0] - a[0]) / len];
    shell.prism([along(0.12, 0), along(0.12, 1.8), along(0.88, 1.8), along(0.88, 0)],
      datum + 5.3, datum + 6.15, trim, roofStone);
  });

  // Each pier and floor band sits in front of the glass plane. The reveals
  // darken the jambs from a corner view, where the stone frame is most legible.
  function framed(a: P2, b: P2, len: number, lo: number, hi: number, rows: number, upper: boolean) {
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const count = Math.max(1, Math.round(len / 3.65));
    const pitch = (hi - lo) / rows;
    const point = (t: number, y: number, depth: number): [number, number, number] =>
      [a[0] + t * dx + depth * dz / len, y, a[1] + t * dz - depth * dx / len];
    const panel = (batch: typeof body, l: number, r: number, bottom: number, top: number, depth: number, color: string) =>
      batch.quad(point(l, bottom, depth), point(l, top, depth), point(r, top, depth), point(r, bottom, depth), color);
    const pierLength = Math.min(1.2, len / count * 0.34);
    for (let bay = 0; bay < count; bay++) {
      const seam = bay / count, next = (bay + 1) / count;
      const margin = pierLength / (2 * len);
      const l = seam + margin, r = next - margin;
      const rail = upper && bay > count * 0.35 && bay < count * 0.64 ? 0.19 : upper ? 0.49 : 0.76;
      panel(body, seam, l, lo, hi, 0.23, trim);
      panel(body, r, next, lo, hi, 0.23, trim);
      body.quad(point(l, lo, 0), point(l, hi, 0), point(l, hi, 0.23), point(l, lo, 0.23), stone);
      body.quad(point(r, lo, 0.23), point(r, hi, 0.23), point(r, hi, 0), point(r, lo, 0), stone);
      for (let row = 0; row < rows; row++) {
        const y = lo + row * pitch;
        const batch = random() < 0.10 ? lights : body;
        panel(batch, l, r, y + rail, y + pitch, 0.06, glass[(bay + row) % glass.length]);
        panel(body, l, r, y, y + rail, 0.22, stone);
      }
    }
  }

  const tower = plan(shaft.rings[0]);
  shell.prism(tower, podiumTop, roof, '#817e77', roofStone);
  faces(tower, (a, b, len) => {
    framed(a, b, len, podiumTop, shoulder, 11, false);
    framed(a, b, len, shoulder, roof - 0.9, 15, true);
  });
  for (const part of parts) {
    if (part.h <= 9.3 || part === shaft || part === cap) continue;
    const ring = plan(part.rings[0]);
    const top = datum + part.h;
    shell.prism(ring, podiumTop, top, stone, roofStone);
    faces(ring, (a, b, len) => framed(a, b, len, podiumTop, top - 0.35, part.h > 15 ? 11 : 1, false));
  }
  shell.prism(plan(cap.rings[0]), roof, datum + cap.h, '#aaa195', '#9b968b');
  return shell.finish('#f3e0b6', 0.53);
}
