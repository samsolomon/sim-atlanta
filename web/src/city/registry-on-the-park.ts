import type { GroundGrid } from '../terrain/grid';
import { pointInRing, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { along, faces, litFacade, outwardSign, seedOf, wound } from './skin-kit';

export const registryId = 'osm:way:1442258925';
const origin: P2 = [1049.4, -3466.5];

// The Registry on the Park (207 13th Street, 2017, formerly YOO on the Park): a 25-storey glass
// residential tower with stacked balconies inside a pale concrete frame, over a white podium whose
// 13th Street end carries perforated art screens. Heights are absolute NAVD88 from the April 2019
// lidar: main roof 356.9 m (p50 inside a 10 m inset), screen to 360.6 m (max). The mapped 98 m
// and Wikipedia's 321 ft are unverified; even from the lowest grade the lidar top is 86.5 m.
const towerPart = 'osm:way:536885263';
const podiumParts: [string, number][] = [
  ['osm:way:1454188327', 17.8], ['osm:way:1454188328', 17.0], ['osm:way:1454188329', 20.4], ['osm:way:1454188326', 20.4],
];
const roofNavd = 356.9, screenNavd = 360.6, podiumTop = 20.4;

const frame = '#e6e6e1', slab = '#dcddd9', rail = '#8a97a2'; // glass rails read pale in the photos
// Glass base #82919e: HSV saturation 18%, value 62% (the glass rules' V ≥ 62 band, S ≤ 30).
const glass = ['#82919e', '#7f8e9b', '#8594a1'];
const podiumWhite = '#e8e7e2', screenGreen = '#a9b98d', screenFrame = '#d9d9d3';

export function createRegistry(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const local = (ring: [number, number][]) => ring.map(([x, z]): P2 => [x - origin[0], z - origin[1]]);
  const towerRing = site.parts?.find(p => p.id === towerPart)?.rings[0];
  const podia = podiumParts.map(([id, h]) => ({ ring: site.parts?.find(p => p.id === id)?.rings[0], h }));
  if (!towerRing || podia.some(p => !p.ring)) return null;
  const shell = landmarkShell(buildings, grid, site.id, 'The Registry on the Park', origin, [1, 0], [[0, 0], [-20, -10], [20, 10]]);
  if (!shell) return null;
  const floor = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const footing = Math.min(floor, shell.base) - 0.65;
  const roof = roofNavd, top = screenNavd; // the shell's y is NAVD88
  const { body, lights } = shell;
  const seed = seedOf(site.id);

  // The tower as a clean rectangle inside its notched mapped outline (the notches are balcony
  // recesses that read as the balcony stacks below).
  const tr = local(towerRing);
  const xs = tr.map(p => p[0]), zs = tr.map(p => p[1]);
  const x0 = Math.min(...xs) + 2.4, x1 = Math.max(...xs) - 2.4, z0 = Math.min(...zs) + 3.2, z1 = Math.max(...zs) - 3.2;
  const tower: P2[] = wound([[x0, z0], [x1, z0], [x1, z1], [x0, z1]], 1);
  const out = outwardSign(tower);
  const podTop = floor + podiumTop;

  // Podium: white, with the art screens on its 13th Street (south) face, under a planted terrace.
  for (const { ring, h } of podia) {
    const r = wound(local(ring!), 1);
    shell.prism(r, footing, floor + h, podiumWhite, '#8fa06a');
  }
  shell.prism(tower, footing, podTop, podiumWhite, '#8fa06a');
  const south = wound(local(podia[2].ring!), 1);
  faces(south, (a, b, length) => {
    const m = along(a, b, length, length / 2, 1.5 * outwardSign(south));
    if (length < 12 || pointInRing(m[0], m[1], tower)) return;
    const o = outwardSign(south);
    const panels = Math.max(1, Math.round(length / 7));
    for (let k = 0; k < panels; k++) {
      const u0 = (k + 0.12) * length / panels, u1 = (k + 0.88) * length / panels;
      const p = along(a, b, length, u0, 0.08 * o), q = along(a, b, length, u1, 0.08 * o);
      const f0 = along(a, b, length, u0 - 0.3, 0.05 * o), f1 = along(a, b, length, u1 + 0.3, 0.05 * o);
      body.quad([f0[0], floor + 4.6, f0[1]], [f0[0], floor + h20(), f0[1]], [f1[0], floor + h20(), f1[1]], [f1[0], floor + 4.6, f1[1]], screenFrame);
      // The perforated screens glow green-white at night, as in the rendering.
      lights.quad([p[0], floor + 5, p[1]], [p[0], floor + h20() - 0.5, p[1]], [q[0], floor + h20() - 0.5, q[1]], [q[0], floor + 5, q[1]], screenGreen);
    }
    // Lobby and retail glazing under the screens.
    const g0 = along(a, b, length, 0.5, 0.06 * o), g1 = along(a, b, length, length - 0.5, 0.06 * o);
    lights.quad([g0[0], footing, g0[1]], [g0[0], floor + 4.2, g0[1]], [g1[0], floor + 4.2, g1[1]], [g1[0], footing, g1[1]], glass[0]);
  });
  function h20() { return podiumTop - 0.6; }

  // The shaft: glass in a pale frame, with stacked balconies across the middle of each long face.
  shell.prism(tower, podTop, roof, frame, '#9aa0a3');
  const storeys = Math.round((roof - podTop - 2) / 3.1), storey = (roof - podTop - 2) / storeys;
  faces(tower, (a, b, length, face) => {
    litFacade(shell, seed, face, along(a, b, length, 0.9, 0), along(a, b, length, length - 0.9, 0),
      podTop + 0.6, roof - 1.4, storeys, 1.6, 0.9, 0.8, glass, 0.3);
    if (length < 30) return;
    // Balcony stacks: a slab and a dark glass rail every storey over the middle 60% of the face.
    const u0 = length * 0.2, u1 = length * 0.8;
    const p = along(a, b, length, u0, 0), q = along(a, b, length, u1, 0);
    const pf = along(a, b, length, u0, 1.8 * out), qf = along(a, b, length, u1, 1.8 * out);
    for (let k = 1; k < storeys; k++) {
      const y = podTop + 0.6 + k * storey;
      body.quad([p[0], y, p[1]], [pf[0], y, pf[1]], [qf[0], y, qf[1]], [q[0], y, q[1]], slab);
      body.quad([pf[0], y - 0.25, pf[1]], [pf[0], y, pf[1]], [qf[0], y, qf[1]], [qf[0], y - 0.25, qf[1]], slab);
      body.quad([pf[0], y, pf[1]], [pf[0], y + 1.05, pf[1]], [qf[0], y + 1.05, qf[1]], [qf[0], y, qf[1]], rail);
    }
    // Frame fins dividing the balcony stack from the glass bays on either side.
    for (const u of [u0, u1]) {
      const f = along(a, b, length, u, 0), g = along(a, b, length, u, 2.0 * out);
      body.quad([f[0], podTop, f[1]], [f[0], roof + 1.2, f[1]], [g[0], roof + 1.2, g[1]], [g[0], podTop, g[1]], frame);
    }
  });
  // Rooftop: a pale screened penthouse level to the lidar top.
  const sr: P2[] = [[x0 + 5, z0 + 4], [x1 - 5, z0 + 4], [x1 - 5, z1 - 4], [x0 + 5, z1 - 4]];
  shell.prism(wound(sr, 1), roof, top, frame, '#8e9497');
  return shell.finish('#f2d6a8', 0.62);
}
