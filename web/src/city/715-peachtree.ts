import type { GroundGrid } from '../terrain/grid';
import type { TerrainQuality } from '../terrain/surface';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

export const peachtree715Id = 'osm:way:234938708';
const origin: P2 = [685, -2238];
// The rooftop penthouse block (lidar 44–45 m), local metres.
const penthouse: P2[] = [[-24, -14], [14, -11.5], [13, 6], [-25, 4]];

// Heights from the April 2019 lidar (90th-percentile returns on an 8 m grid, ground 309.7 m
// NAVD88): the 10-storey 1972 office cube at 40 m, with a 44–45 m penthouse over its middle.
// The mapped 8 m interior part (illustrative tier) sits inside the cube and is not drawn.
export function create715Peachtree(buildings: VBuilding[], site: VBuilding, grid: GroundGrid, quality: TerrainQuality) {
  const high = quality === 'high';
  const shell = landmarkShell(buildings, grid, site.id, '715 Peachtree', origin, [1, 0], [[0, 0], [-25, -20], [25, 20]]);
  if (!shell) return null;
  const seed = seedOf(site.id);
  let face = 0;
  const ccw = (ring: P2[]): P2[] => {
    const area = ring.reduce((sum, [x, z], i) => {
      const [nx, nz] = ring[(i + 1) % ring.length];
      return sum + x * nz - nx * z;
    }, 0);
    return area < 0 ? [...ring].reverse() : ring;
  };
  const edges = (ring: P2[], draw: (a: P2, b: P2, length: number) => void) =>
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length > 2) draw(a, b, length);
    });
  const datum = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const roof = datum + 40, penthouseTop = datum + 44.5, base = datum + 5;
  // Carter's leasing photographs: a clean white precast egg-crate frame, a step brighter than the
  // generic beige; square windows set deep in it, reading dark; a warm wood-clad retail base.
  const white = '#f4f3ef', reveal = '#4b5359', wood = '#b07c4e', roofColor = '#c3c1b9';
  const glass = ['#7f8c94', '#85929a'];
  const storefront = ['#6a7b84', '#6e818a'];
  const floors = 9, pitch = (roof - 1.2 - base) / floors;

  const cube = ccw(shell.ring);
  shell.prism(cube, shell.base, roof, white, roofColor);
  edges(cube, (a, b, length) => {
    const out = (t: number, y: number, d: number): [number, number, number] =>
      [a[0] + t * (b[0] - a[0]) + d * (b[1] - a[1]) / length, y, a[1] + t * (b[1] - a[1]) - d * (b[0] - a[0]) / length];
    // Warm wood cladding wraps the street level between storefront bays.
    shell.body.quad(out(0, datum, 0.05), out(0, base, 0.05), out(1, base, 0.05), out(1, datum, 0.05), wood);
    litFacade(shell, seed, face++, a, b, datum + 0.4, base - 0.6, 1, high ? 4 : 10, 0.6, 0.86, storefront, 0.4);
    // Egg-crate: each window sits in a dark reveal; the pane (glass) is a smaller quad within it.
    const bays = Math.max(1, Math.round(length / (high ? 3.2 : 6.4)));
    const rows = floors;
    const rowPitch = (roof - 1.2 - base) / rows;
    for (let r = 0; r < rows; r++) {
      const y0 = base + r * rowPitch + rowPitch * 0.22, y1 = base + (r + 1) * rowPitch - rowPitch * 0.12;
      for (let k = 0; k < bays; k++) {
        const l = (k + 0.2) / bays, rr = (k + 0.8) / bays;
        shell.body.quad(out(l, y0, 0.06), out(l, y1, 0.06), out(rr, y1, 0.06), out(rr, y0, 0.06), reveal);
      }
    }
    // The pane inside each reveal: lit at night as an office, mostly dark.
    litFacade(shell, seed, face++, a, b, base, roof - 1.2, rows, high ? 3.2 : 6.4, 0.42, 0.52, glass, 0.1);
  });
  const ph = ccw(penthouse);
  shell.prism(ph, roof, penthouseTop, white, '#a7a59e');
  edges(ph, (a, b) => litFacade(shell, seed, face++, a, b, roof + 0.5, penthouseTop - 0.6, 1, high ? 3 : 8, 0.7, 0.6, glass, 0.05));
  return shell.finish('#f4d9a8', 0.62);
}
