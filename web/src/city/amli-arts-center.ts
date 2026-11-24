import type { GroundGrid } from '../terrain/grid';
import type { TerrainQuality } from '../terrain/surface';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';

export const amliArtsCenterId = 'osm:way:885667868';
const origin: P2 = [282, -3890];

// NAVD88 from the 22 April 2019 3DEP returns (docs/log/ui/amli-arts-center/README.md).
const grade = 274.4;
const lobbyTop = grade + 6;
const deckTop = grade + 19.7;
const roof = grade + 89.9;
const crownTop = grade + 96.5;

// The 29-storey tower along 15th Street, traced from the lidar.
const tower: P2[] = [
  [263.1, -3860.5], [297.2, -3860.9], [302.0, -3861.4], [339.1, -3871.2], [339.5, -3880.4],
  [336.6, -3889.6], [320.0, -3892.5], [296.4, -3887.4], [263.1, -3887.5],
];
// The precast garage on Spring Street. Its edge against the tower sits inside the tower.
const garage: P2[] = [
  [225.4, -3858.9], [263.6, -3859.6], [263.6, -3887.0], [263.4, -3911.2], [263.5, -3937.2], [226.0, -3937.5],
];

const local = (ring: P2[]): P2[] => ring.map(([x, z]) => [x - origin[0], z - origin[1]]);

/** Edges with the outward side to the right of a → b in plan (x east, z south). */
function edges(ring: P2[], draw: (a: P2, b: P2, length: number) => void) {
  let area = 0;
  ring.forEach(([x, z], i) => { const [u, v] = ring[(i + 1) % ring.length]; area += x * v - u * z; });
  const r = area > 0 ? ring : [...ring].reverse();
  r.forEach((a, i) => {
    const b = r[(i + 1) % r.length];
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length > 3) draw(a, b, length);
  });
}

export function createAmliArtsCenter(buildings: VBuilding[], grid: GroundGrid, quality: TerrainQuality) {
  const found = landmarkShell(buildings, grid, amliArtsCenterId, 'Amli Arts Center', origin, [1, 0],
    [[0, 15], [-40, -20], [40, 10]]);
  if (!found) return null;
  const shell = found;
  const high = quality === 'high';
  const white = '#ecebe6', precast = '#d4d1c8';
  const dark = ['#2f3a44', '#35414c', '#2b3540'];
  const light = ['#93a9b6', '#9cb1bd', '#8aa1af'];
  const t = local(tower), g = local(garage);

  shell.prism(g, shell.base, deckTop, precast, '#bdb8ad');
  shell.prism(t, shell.base, roof, white, '#8f9192');

  // Pool deck and amenity pavilion on the garage roof.
  const flat = (x0: number, z0: number, x1: number, z1: number, y: number, color: string) => {
    const [[a, b], [c, d]] = local([[x0, z0], [x1, z1]]);
    shell.body.quad([a, y, b], [a, y, d], [c, y, d], [c, y, b], color);
  };
  flat(231, -3930, 258, -3898, deckTop + 0.03, '#d6d0c2');
  flat(234, -3926, 250, -3914, deckTop + 0.06, '#4fb0c4');
  flat(234, -3908, 256, -3893, deckTop + 0.06, '#6f8f5a');
  if (high) shell.prism(local([[251, -3926], [258, -3926], [258, -3918], [251, -3918]]), deckTop, deckTop + 4, white, '#cfcdc6');

  // Garage tiers and the glazed shop base on Spring Street.
  edges(g, (a, b, length) => {
    if (length < 10) return;
    shell.facade(a, b, lobbyTop + 0.8, deckTop - 0.6, high ? 4 : 2, high ? 7.5 : 30, high ? 0.82 : 0.9, 0.5, ['#45484b'], 0);
    shell.facade(a, b, shell.base + 0.6, lobbyTop - 0.3, 1, high ? 5 : 30, 0.9, 0.85, ['#3d6f8e'], 0.5);
  });

  const floors = Math.round((roof - lobbyTop) / 3);
  edges(t, (a, b, length) => {
    const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length;
    const nx = uz, nz = -ux;
    const at = (u: number, y: number, out: number) => [a[0] + ux * u + nx * out, y, a[1] + uz * u + nz * out];
    const band = (u0: number, u1: number, y0: number, y1: number, out: number, color: string) =>
      shell.body.quad(at(u0, y0, out), at(u0, y1, out), at(u1, y1, out), at(u1, y0, out), color);
    // Broad faces carry dark glass fields inside white frames; the ends are lighter glass.
    // The east-west runs along 15th Street and the pool deck are the broad faces.
    const broad = Math.abs(ux) > 0.85;
    const colors = broad ? dark : light;
    if (high) shell.facade(a, b, lobbyTop + 0.2, roof - 0.3, floors, broad ? 1.6 : 2.4, 0.94, 0.88, colors, 0.4);
    else if (length > 8) shell.facade(a, b, lobbyTop + 0.2, roof - 0.3, Math.round(floors / 2), 14, 0.9, 0.92, colors, 0.4);
    shell.facade(a, b, shell.base + 0.6, lobbyTop - 0.4, 1, high ? 4 : 14, 0.88, 0.85, ['#3a4b57'], 0.55);
    if (!broad || length < 20) return;
    // White frame fins at the ends and the middle, rising past the roof into the open crown.
    const fins = [[0, 3.2], [length / 2 - 1.3, length / 2 + 1.3], [length - 3.2, length]];
    for (const [u0, u1] of fins) {
      band(u0, u1, lobbyTop, crownTop, 0.35, white);
      if (high) {
        shell.body.quad(at(u0, lobbyTop, 0), at(u0, crownTop, 0), at(u0, crownTop, 0.35), at(u0, lobbyTop, 0.35), '#d9d8d2');
        shell.body.quad(at(u1, lobbyTop, 0.35), at(u1, crownTop, 0.35), at(u1, crownTop, 0), at(u1, lobbyTop, 0), '#d9d8d2');
      }
    }
    band(0, length, crownTop - 1.3, crownTop, 0.35, white);
    if (high) balconies(a, b, length);
  });

  function balconies(a: P2, b: P2, length: number) {
    // Recessed balconies read as pale slabs across the dark fields at every other floor.
    const ux = (b[0] - a[0]) / length, uz = (b[1] - a[1]) / length;
    const nx = uz, nz = -ux, pitch = (roof - 0.3 - lobbyTop - 0.2) / floors;
    const runs = [[4, length / 2 - 2.2], [length / 2 + 2.2, length - 4]];
    for (let j = 2; j < floors; j += 2) {
      const y = lobbyTop + 0.2 + j * pitch;
      for (const [u0, u1] of runs) for (let u = u0; u + 3.5 <= u1; u += 7) {
        const at = (s: number, out: number, h: number) => [a[0] + ux * s + nx * out, h, a[1] + uz * s + nz * out];
        shell.body.quad(at(u, 0.12, y + 1.05), at(u, 0.12, y), at(u + 3.5, 0.12, y), at(u + 3.5, 0.12, y + 1.05), '#6f7f8a');
        shell.body.quad(at(u, 0.12, y), at(u, 0.12, y - 0.18), at(u + 3.5, 0.12, y - 0.18), at(u + 3.5, 0.12, y), '#c9c9c4');
      }
    }
  }

  return shell.finish('#f2d6a8', 0.66);
}
