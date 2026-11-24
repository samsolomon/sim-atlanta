import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

export const seventeenthTowerId = 'osm:way:269542125';
const origin: P2 = [-203, -4185];
const lightwellId = 'osm:way:1562299338';
const officeId = 'osm:way:1562299339';
const westWingId = 'osm:way:1562299337';

export function createSeventeenthTower(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const lightwell = site.parts?.find(part => part.id === lightwellId);
  const office = site.parts?.find(part => part.id === officeId);
  const westWing = site.parts?.find(part => part.id === westWingId);
  if (lightwell?.rings.length !== 1 || office?.rings.length !== 1 || westWing?.rings.length !== 1) return null;
  const shell = landmarkShell(buildings, grid, site.id, '171 Seventeenth', origin, [1, 0], [[0, 0], [-22, 0], [34, 0]]);
  if (!shell) return null;
  const plan = (ring: P2[]): P2[] => {
    const points: P2[] = ring.map(([x, z]) => [x - origin[0], z - origin[1]]);
    const area = points.reduce((sum, [x, z], i) => {
      const [nx, nz] = points[(i + 1) % points.length];
      return sum + x * nz - nx * z;
    }, 0);
    return area < 0 ? points.reverse() : points;
  };
  const perimeter = plan(site.rings[0]);
  const faces = (ring: P2[], exteriorOnly: boolean, draw: (a: P2, b: P2, length: number) => void) => {
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length < 0.5) return;
      if (exteriorOnly && !perimeter.some((p, j) => {
        const q = perimeter[(j + 1) % perimeter.length];
        const dx = q[0] - p[0], dz = q[1] - p[1];
        const x = (a[0] + b[0]) / 2 - p[0], z = (a[1] + b[1]) / 2 - p[1];
        const length2 = dx * dx + dz * dz;
        const t = (x * dx + z * dz) / length2;
        return t >= 0 && t <= 1 && Math.abs(x * dz - z * dx) / Math.sqrt(length2) < 0.06;
      })) return;
      draw(a, b, length);
    });
  };

  // Use the same inferred street datum as the generic parts, with walls down to the DEM.
  const floor = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const podium = floor + 16.5;
  const glass = ['#607d92', '#658398', '#5b768b', '#6e899c'];
  const west = plan(westWing.rings[0]);
  const shaft = plan(office.rings[0]);
  const spine = plan(lightwell.rings[0]);
  shell.prism(perimeter, shell.base, podium, '#ac9380', '#817e76');
  faces(perimeter, false, (a, b) => {
    // The lightwell carries its own glazing through the stone base.
    if ([a, b].every(([x, z]) => spine.some(([sx, sz]) => x === sx && z === sz))) return;
    shell.facade(a, b, floor + 0.5, podium - 0.3, 4, 3.5, 0.68, 0.73, glass, 0.13);
  });
  const shoulder = floor + office.h;
  const crownBase = shoulder - 4;
  shell.prism(west, podium, floor + westWing.h, '#a29484', '#81847e');
  faces(west, true, (a, b) => shell.facade(a, b, podium, floor + westWing.h - 0.7, 17, 3.4, 0.72, 0.8, glass, 0.08));
  shell.prism(shaft, podium, shoulder, '#414d58', '#757e84');
  faces(shaft, true, (a, b) => shell.facade(a, b, podium, shoulder - 0.8, 19, 2.8, 0.965, 0.8, glass, 0.09));

  // The glazed central return reaches to the street, then changes to a backlit crown.
  shell.prism(spine, podium, crownBase, '#4b5a61', '#647074');
  const crownTop = floor + lightwell.h;
  shell.prism(spine, crownBase, crownTop, '#596269', '#8b969a');
  faces(spine, true, (a, b) => {
    shell.facade(a, b, floor + 0.5, crownBase, 22, 2.9, 0.95, 0.92, ['#597178', '#627c80'], 0.075);
    shell.facade(a, b, crownBase, shoulder, 4, 2.9, 0.96, 0.88, ['#afbab2', '#bac2b6'], 1);
  });
  faces(spine, false, (a, b) =>
    shell.facade(a, b, shoulder, crownTop - 0.24, 8, 2.9, 0.96, 0.88, ['#afbab2', '#bac2b6'], 1));
  return shell.finish('#fff0cb', 0.72);
}
