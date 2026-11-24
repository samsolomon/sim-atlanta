import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

export const nomiaId = 'osm:way:1300593936';
const origin: P2 = [441, -4246];
// The slab's long axis, from the minimum rotated rectangle of the mapped tower parts.
const axis: P2 = [Math.cos(-28.94 * Math.PI / 180), Math.sin(-28.94 * Math.PI / 180)];
const towerIds = ['osm:way:1450754085', 'osm:way:1450754086', 'osm:way:1450754087', 'osm:way:1456611173', 'osm:way:1456611174'];
const garageId = 'osm:way:1450754089';
const lobbyId = 'osm:way:1450754088';

export function createNomia(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const parts = site.parts ?? [];
  if (!towerIds.every(id => parts.some(p => p.id === id && p.rings.length === 1))) return null;
  const shell = landmarkShell(buildings, grid, site.id, 'Nomia', origin, axis, [[0, 0], [-25, 5], [25, -5]]);
  if (!shell) return null;
  const angle = Math.atan2(axis[1], axis[0]), c = Math.cos(angle), s = Math.sin(angle);
  const frame = (ring: P2[]): P2[] => {
    const local = ring.map(([x, z]): P2 => [(x - origin[0]) * c + (z - origin[1]) * s, -(x - origin[0]) * s + (z - origin[1]) * c]);
    const area = local.reduce((sum, [x, z], i) => {
      const [nx, nz] = local[(i + 1) % local.length];
      return sum + x * nz - nx * z;
    }, 0);
    return area < 0 ? local.reverse() : local;
  };
  const faces = (ring: P2[], draw: (a: P2, b: P2, length: number) => void) =>
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length > 0.6) draw(a, b, length);
    });

  // 33 storeys: the parts' 111.6 m is inferred and the building postdates the 2019 lidar.
  // Photographs show 31 residential floors at about 3.1 m over a taller lobby, a lighter
  // amenity floor with a glazed rail, and a pale mechanical penthouse.
  const datum = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const lobbyTop = datum + 6.2, residentialTop = datum + 6.2 + 31 * 3.12, amenityTop = residentialTop + 4.4;
  const plantTop = amenityTop + 5.5;
  const frameColor = '#34443d', glass = ['#5b7783', '#63808b'], amenity = '#9fa9a6', pale = '#d6d3cb';

  // The tower footprint is the outer boundary of the mapped tower parts, in the slab frame.
  const tower = frame([
    [404.0, -4239.6], [413.4, -4222.5], [445.8, -4240.5], [445.3, -4241.6], [452.8, -4245.8],
    [453.8, -4244.2], [475.1, -4256.0], [466.2, -4272.2], [461.9, -4269.9], [461.1, -4271.3],
  ]);
  shell.prism(tower, shell.base, residentialTop, frameColor, '#5d6461');
  faces(tower, (a, b, length) => {
    shell.facade(a, b, datum + 0.4, lobbyTop - 0.3, 1, 3.4, 0.86, 0.86, glass, 0.3);
    shell.facade(a, b, lobbyTop, residentialTop, 31, length > 12 ? 3.05 : 2.9, 0.84, 0.82, glass, 0.3);
  });
  shell.prism(tower, residentialTop, amenityTop, amenity, '#7c8280');
  faces(tower, (a, b) => shell.facade(a, b, residentialTop + 0.3, amenityTop - 0.4, 1, 3, 0.9, 0.86, ['#6e8790'], 0.45));

  // Stacked balconies run up the narrow ends of the slab.
  const xs = tower.map(([x]) => x);
  const west = Math.min(...xs), east = Math.max(...xs);
  const vs = tower.map(([, v]) => v), mid = (Math.min(...vs) + Math.max(...vs)) / 2;
  for (const [end, dir] of [[west, -1], [east, 1]] as const) {
    for (let floor = 1; floor < 31; floor++) {
      const y = lobbyTop + floor * 3.12;
      shell.prism([[end, mid - 2.5], [end + dir * 1.6, mid - 2.5], [end + dir * 1.6, mid + 2.5], [end, mid + 2.5]],
        y - 0.22, y, '#3a4541', '#4a5551');
    }
  }

  // Penthouse plant at the middle of the roof, set back behind the amenity rail.
  shell.prism(frame([[426, -4253], [446, -4264], [451, -4255], [431, -4244]]), amenityTop, plantTop, pale, '#b9b6ae');

  for (const [id, color] of [[garageId, frameColor], [lobbyId, '#38423f']] as const) {
    const part = parts.find(p => p.id === id);
    if (part?.rings.length !== 1) continue;
    const ring = frame(part.rings[0]);
    const top = datum + part.h;
    shell.prism(ring, shell.base, top, color, '#5d6461');
    faces(ring, (a, b) => shell.facade(a, b, datum + 0.4, top - 0.4, Math.max(1, Math.round(part.h / 3.3)), 3.2, 0.8, 0.7, glass, 0.12));
  }
  return shell.finish('#f3d6a2', 0.62);
}
