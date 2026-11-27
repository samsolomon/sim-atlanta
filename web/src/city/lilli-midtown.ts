import type { GroundGrid } from '../terrain/grid';
import type { TerrainQuality } from '../terrain/surface';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

export const lilliMidtownId = 'osm:way:886041059';
const origin: P2 = [660, -2177];
// Heights from the April 2019 lidar (90th-percentile returns on an 8 m grid, ground
// 310.6 m NAVD88) replace the inferred 86.4 m: the 24-storey slab's main roof is 78 m,
// and its north-west half rises to 86 m for the rooftop amenity level and pool deck,
// with plant to 89 m. The south strip is a one-storey retail front at about 8 m.
const crown: P2[] = [[-17.7, -13.9], [5, -12.6], [5.3, -2], [-18.3, -2.5]];
const plant: P2[] = [[-14, -12], [-4, -11.5], [-4, -6], [-14, -6.5]];

export function createLilliMidtown(buildings: VBuilding[], site: VBuilding, grid: GroundGrid, quality: TerrainQuality) {
  // Low tier draws the curtain wall in double-width panes; high keeps the photographed module.
  const high = quality === 'high';
  const parts = site.parts ?? [];
  const tower = parts.find(p => p.id === 'podium');
  const retail = parts.find(p => p.id === 'osm:way:1342535120');
  if (!tower || !retail) return null;
  const shell = landmarkShell(buildings, grid, site.id, 'Lilli Midtown', origin, [1, 0], [[0, 0], [-10, -8], [10, 0]]);
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
  const local = (ring: P2[]) => ccw(ring.map(([x, z]): P2 => [x - origin[0], z - origin[1]]));
  const edges = (ring: P2[], draw: (a: P2, b: P2, length: number) => void) =>
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length > 0.8) draw(a, b, length);
    });
  const datum = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const roof = datum + 78, crownTop = datum + 86, plantTop = datum + 89, shop = datum + 8;
  // Brasfield & Gorrie dusk exterior: neutral charcoal-grey glass, less blue than the generic
  // curtain walls, framed by bold white slab edges and white verticals, with irregular grey panels.
  const white = '#f2f2ee', roofColor = '#b9bab5';
  const glass = ['#868b8f', '#8c9194', '#9b9fa1'];
  const storefront = ['#6a7b84', '#6e818a'];

  const slab = local(tower.rings[0]);
  shell.prism(slab, shell.base, roof, white, roofColor);
  edges(slab, (a, b, length) => {
    // The south face sits behind the retail strip for its first storey.
    const behindShop = (a[1] + b[1]) / 2 > 8;
    if (!behindShop) litFacade(shell, seed, face++, a, b, datum + 0.4, datum + 5.6, 1, high ? 3.4 : 10, 0.86, 0.84, storefront, 0.4);
    const from = behindShop ? shop + 0.3 : datum + 6;
    // Panes fill less of each floor than before, so the white slab edge reads as a band.
    litFacade(shell, seed, face++, a, b, from, roof - 0.6, Math.max(1, Math.round((roof - 0.6 - from) / 3.15)),
      high ? (length > 20 ? 3 : 2.8) : 6, 0.93, 0.66, glass, 0.32);
    // White frame verticals at roughly 9 m, standing just proud of the glass.
    if (length > 9) {
      const n = Math.round(length / 9);
      const out = (t: number, y: number): [number, number, number] =>
        [a[0] + t * (b[0] - a[0]) + 0.14 * (b[1] - a[1]) / length, y, a[1] + t * (b[1] - a[1]) - 0.14 * (b[0] - a[0]) / length];
      for (let k = 1; k < n; k++) {
        const t = k / n, w = 0.35 / length;
        shell.body.quad(out(t - w, from), out(t - w, roof), out(t + w, roof), out(t + w, from), white);
      }
    }
  });
  const top = ccw(crown);
  shell.prism(top, roof, crownTop, white, roofColor);
  edges(top, (a, b) => litFacade(shell, seed, face++, a, b, roof + 0.3, crownTop - 0.5, 2, high ? 3 : 6, 0.95, 0.85, glass, 0.4));
  shell.prism(ccw(plant), crownTop, plantTop, '#c9c7c0', '#a3a39e');
  // Pool deck on the 78 m roof east of the amenity level.
  shell.prism(ccw([[7, -11], [19, -10.3], [18.6, -4], [7, -4.5]]), roof, roof + 0.05, '#5aa8c4', '#5aa8c4');

  const strip = local(retail.rings[0]);
  shell.prism(strip, shell.base, shop, '#d6d4cd', '#9c9a93');
  edges(strip, (a, b) => litFacade(shell, seed, face++, a, b, datum + 0.4, shop - 0.6, 1, high ? 3.4 : 10, 0.86, 0.86, storefront, 0.4));
  return shell.finish('#f4d9a8', 0.62);
}
