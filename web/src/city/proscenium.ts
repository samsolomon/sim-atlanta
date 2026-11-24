import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

export const prosceniumId = 'osm:way:269843396';
const origin: P2 = [729, -3606];
// The rounded bay at the Peachtree end carries window ribbons for its full height and
// rises above the main roof. Everything west of it is the granite office grid.
const bayStart = 32.2;
// The central glazed slot on the two long faces, estimated from the north aerial.
const slot = { centre: 0, half: 3.2 };

export function createProscenium(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const shell = landmarkShell(buildings, grid, site.id, 'The Proscenium', origin, [1, 0], [[0, 0], [-28, 0], [35, 0]]);
  if (!shell) return null;
  const ccw = (ring: P2[]): P2[] => {
    const area = ring.reduce((sum, [x, z], i) => {
      const [nx, nz] = ring[(i + 1) % ring.length];
      return sum + x * nz - nx * z;
    }, 0);
    return area < 0 ? [...ring].reverse() : ring;
  };
  const faces = (ring: P2[], draw: (a: P2, b: P2, length: number) => void) =>
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length > 0.5) draw(a, b, length);
    });
  // Mapped 98 m (lidar agrees), 24 storeys: a 6 m lobby, then 23 office floors of 4 m.
  // The top five floors are wrapped in continuous blue glass ribbons.
  const datum = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const lobbyTop = datum + 6, ribbonBase = datum + 78, roof = datum + 98, bayTop = datum + 104;
  const granite = '#d5cab7', trim = '#e1d8c7', roofColor = '#8e8c86';
  const punched = ['#3d4c58', '#44535f'];
  const blue = ['#4a73a0', '#5480ab'];
  const lobby = ['#5b7480', '#627b87'];

  const plan = ccw(shell.ring);
  const bay = ccw(plan.filter(([x]) => x >= bayStart - 0.05));
  shell.prism(plan, shell.base, roof, granite, roofColor);
  faces(plan, (a, b, length) => {
    const mid: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const inBay = mid[0] > bayStart - 0.05;
    shell.facade(a, b, datum + 0.4, lobbyTop - 0.4, 1, 3.4, inBay ? 0.9 : 0.78, 0.86, lobby, inBay ? 0.35 : 0.2);
    if (inBay) {
      shell.facade(a, b, lobbyTop, roof - 0.6, 23, 3, 0.97, 0.55, punched, 0.06);
      return;
    }
    const longFace = Math.abs(b[0] - a[0]) > Math.abs(b[1] - a[1]) && length > 30;
    if (longFace) {
      // Split the face around the glazed slot.
      const t0 = (slot.centre - slot.half - a[0]) / (b[0] - a[0]);
      const t1 = (slot.centre + slot.half - a[0]) / (b[0] - a[0]);
      const at = (t: number): P2 => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
      const [l, r] = [Math.min(t0, t1), Math.max(t0, t1)];
      shell.facade(a, at(l), lobbyTop, ribbonBase, 18, 3, 0.52, 0.56, punched, 0.06);
      shell.facade(at(l), at(r), lobbyTop, ribbonBase, 18, 2.1, 0.92, 0.84, blue, 0.06);
      shell.facade(at(r), b, lobbyTop, ribbonBase, 18, 3, 0.52, 0.56, punched, 0.06);
    } else {
      shell.facade(a, b, lobbyTop, ribbonBase, 18, 3, 0.52, 0.56, punched, 0.06);
    }
    shell.facade(a, b, ribbonBase, roof - 0.8, 5, 3, 0.98, 0.62, blue, 0.06);
  });

  // The Peachtree bay steps up past the main roof in two tiers.
  shell.prism(bay, roof, bayTop, trim, roofColor);
  faces(bay, (a, b) => shell.facade(a, b, roof + 0.4, bayTop - 0.6, 2, 3, 0.97, 0.55, blue, 0.06));
  return shell.finish();
}
