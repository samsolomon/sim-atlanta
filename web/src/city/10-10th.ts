import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

export const tenTenthId = 'osm:way:235006974';
const origin: P2 = [414, -3104];

// The two inferred tower parts (42.9 and 46.2 m) undershoot the 2019 lidar, which puts
// the main roof at 64.6 m (median) and the penthouse at about 68.4 m (95th percentile).
const tower: P2[] = [
  [-50.5, 15.9], [-33.3, 15.9], [-33.3, 18.3], [33.7, 18.2], [33.6, -20.3],
  [-42.2, -20.2], [-42.2, -5.8], [-50.5, -5.8],
];
// Mechanical penthouse, estimated from the aerial photograph.
const penthouse: P2[] = [[-24, -11], [4, -11], [4, 7], [-24, 7]];
const podiumId = 'podium';
const pavilionIds = ['osm:way:1430435530', 'osm:way:1430435531'];

const ccw = (ring: P2[]): P2[] => {
  const area = ring.reduce((sum, [x, z], i) => {
    const [nx, nz] = ring[(i + 1) % ring.length];
    return sum + x * nz - nx * z;
  }, 0);
  return area < 0 ? [...ring].reverse() : ring;
};

export function create10Tenth(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const podiumPart = site.parts?.find(part => part.id === podiumId);
  if (podiumPart?.rings.length !== 1) return null;
  const shell = landmarkShell(buildings, grid, site.id, '10 10th', origin, [1, 0], [[0, 0], [-45, 5], [30, -15]]);
  if (!shell) return null;
  const local = (ring: P2[]) => ccw(ring.map(([x, z]): P2 => [x - origin[0], z - origin[1]]));
  const datum = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const podiumTop = datum + 10.8, silverBase = datum + 56.2, roof = datum + 64.6, plantTop = datum + 68.4;
  const brick = '#86503f', silver = '#bcc1c4', stone = '#c9c0b0', roofColor = '#8a8a86';
  const glass = ['#3f5361', '#455a68'];
  const storefront = ['#56707e', '#5d7785'];

  const faces = (ring: P2[], draw: (a: P2, b: P2, length: number) => void) =>
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length > 0.5) draw(a, b, length);
    });
  // The silver bay with continuous window ribbons wraps the southeast corner over the
  // plaza, and a narrow silver return closes the west end. Everything between is brick.
  const ribbon = (p: P2) => (p[0] > 12 && p[1] > -2) || p[0] < -44;
  const split = (a: P2, b: P2, draw: (a: P2, b: P2, silver: boolean) => void) => {
    const cuts = [0, 1];
    for (const x of [12, -44]) {
      const t = (x - a[0]) / (b[0] - a[0]);
      if (Number.isFinite(t) && t > 0.02 && t < 0.98) cuts.push(t);
    }
    const z = (-2 - a[1]) / (b[1] - a[1]);
    if (Number.isFinite(z) && z > 0.02 && z < 0.98) cuts.push(z);
    cuts.sort((p, q) => p - q);
    for (let i = 1; i < cuts.length; i++) {
      const at = (t: number): P2 => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
      const l = at(cuts[i - 1]), r = at(cuts[i]);
      draw(l, r, ribbon(at((cuts[i - 1] + cuts[i]) / 2)));
    }
  };

  const shaft = ccw(tower);
  shell.prism(shaft, shell.base, silverBase, brick, roofColor);
  shell.prism(shaft, silverBase, roof, silver, roofColor);
  faces(shaft, (a, b) => split(a, b, (l, r, metal) => {
    const len = Math.hypot(r[0] - l[0], r[1] - l[1]);
    const out = (p: P2, y: number): [number, number, number] =>
      [p[0] + 0.035 * (r[1] - l[1]) / len, y, p[1] - 0.035 * (r[0] - l[0]) / len];
    if (metal) {
      shell.body.quad(out(l, podiumTop), out(l, silverBase), out(r, silverBase), out(r, podiumTop), silver);
      shell.facade(l, r, podiumTop, silverBase, 10, 3.1, 0.97, 0.46, glass, 0.06);
    } else {
      shell.facade(l, r, podiumTop, silverBase, 10, 3.1, 0.56, 0.5, glass, 0.06);
    }
    // The south face's lower floors sit behind the podium.
    if ((l[1] + r[1]) / 2 < 18) shell.facade(l, r, datum + 0.4, podiumTop - 0.4, 2, 4.6, 0.78, 0.78, storefront, 0.18);
    shell.facade(l, r, silverBase, roof - 0.7, 2, 3.1, 0.7, 0.55, glass, 0.06);
  }));

  // The two-storey podium along 10th Street: brick piers and tall storefront glass.
  const podium = local(podiumPart.rings[0]);
  shell.prism(podium, shell.base, podiumTop, brick, '#9c9a92');
  faces(podium, (a, b) => shell.facade(a, b, datum + 0.4, podiumTop - 0.5, 2, 4.6, 0.74, 0.8, storefront, 0.2));
  for (const id of pavilionIds) {
    const part = site.parts?.find(p => p.id === id);
    if (part?.rings.length !== 1) continue;
    const ring = local(part.rings[0]);
    const top = datum + Math.max(3.3, part.h);
    shell.prism(ring, shell.base, top, stone, '#9a988f');
    faces(ring, (a, b) => shell.facade(a, b, datum + 0.3, top - 0.4, 1, 3.2, 0.8, 0.8, storefront, 0.2));
  }

  shell.prism(ccw(penthouse), roof, plantTop, silver, '#9ea3a5');
  faces(ccw(penthouse), (a, b) => shell.facade(a, b, roof + 0.6, plantTop - 0.6, 1, 1.2, 0.8, 0.85, ['#6e7477'], 0));
  return shell.finish();
}
