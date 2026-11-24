import type { GroundGrid } from '../terrain/grid';
import type { TerrainQuality } from '../terrain/surface';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

export const elevanceTechId = 'osm:way:996610148';
const origin: P2 = [357, -2319];
const towerId = 'osm:way:1344870475';

// Heights from the April 2019 lidar (90th-percentile returns on an 8 m grid, ground 297.1 m
// NAVD88): the central tower 76 m and the two wings (the mapped "podium" parts, inferred 54 m)
// 68–73 m, used as 70 m. A 104 m return at the north-west corner appears in no photograph and is
// treated as a construction crane (the tower opened in 2020).
//
// AIA Atlanta award photographs: a glass-walled lobby under a cantilevered base; the parking
// floors above wrapped in a pale silver vertical-fin metal screen with a large triangular fold at
// the corner; and above that, blue reflective glass with horizontal spandrel bands, stepping
// back in tiers. Silver screen against blue glass is the identifying contrast.
export function createElevanceTech(buildings: VBuilding[], site: VBuilding, grid: GroundGrid, quality: TerrainQuality) {
  const high = quality === 'high';
  const parts = site.parts ?? [];
  const towerPart = parts.find(p => p.id === towerId);
  const wings = parts.filter(p => p.id === 'podium' && p.rings.length);
  if (!towerPart?.rings.length || wings.length !== 2) return null;
  const shell = landmarkShell(buildings, grid, site.id, 'Elevance Health Technology Center', origin, [1, 0], [[0, 0], [-15, -15], [15, 15]]);
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
  const inside = (x: number, z: number, ring: P2[]) => {
    let hit = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, zi] = ring[i], [xj, zj] = ring[j];
      if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) hit = !hit;
    }
    return hit;
  };
  const datum = site.floorY === undefined ? shell.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const roof = datum + 76, wingTop = datum + 70, lobbyTop = datum + 7, screenTop = datum + 34;
  const masses = [{ ring: local(towerPart.rings[0]), top: roof }, ...wings.map(p => ({ ring: local(p.rings[0]), top: wingTop }))];
  const coveredTo = (a: P2, b: P2, length: number) => {
    const mx = (a[0] + b[0]) / 2 + 0.6 * (b[1] - a[1]) / length;
    const mz = (a[1] + b[1]) / 2 - 0.6 * (b[0] - a[0]) / length;
    return Math.max(datum, ...masses.filter(m => inside(mx, mz, m.ring)).map(m => m.top));
  };
  const edges = (ring: P2[], draw: (a: P2, b: P2, length: number) => void) =>
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length > 2) draw(a, b, length);
    });
  const silver = '#d3d6d8', fin = '#eef0f1', finShadow = '#a9afb3', roofColor = '#a2a6aa', spandrel = '#8796a6';
  const blue = ['#a9bacc', '#aebfd1'];
  const lobbyGlass = ['#4c6272'];

  for (const { ring, top } of masses) {
    shell.prism(ring, shell.base, top, silver, roofColor);
    edges(ring, (a, b, length) => {
      const lo = coveredTo(a, b, length);
      if (top - lo < 1) return;
      const out = (t: number, y: number, d: number): [number, number, number] =>
        [a[0] + t * (b[0] - a[0]) + d * (b[1] - a[1]) / length, y, a[1] + t * (b[1] - a[1]) - d * (b[0] - a[0]) / length];
      const street = lo <= datum + 0.01;
      if (street) {
        // Glass-walled lobby under the screen, which reads as a cantilevered band.
        litFacade(shell, seed, face++, a, b, datum + 0.4, lobbyTop - 0.3, 1, high ? 4 : 12, 0.95, 0.92, lobbyGlass, 0.45);
        // Silver vertical-fin screen over the parking floors: fins on a pale field, with a
        // darker line between so the rhythm reads from the board camera.
        const fins = Math.max(2, Math.round(length / (high ? 1.6 : 4)));
        for (let k = 0; k < fins; k++) {
          const t = (k + 0.5) / fins, w = (high ? 0.22 : 0.5) / length;
          shell.body.quad(out(t - w, lobbyTop, 0.3), out(t - w, screenTop, 0.3), out(t + w, screenTop, 0.3), out(t + w, lobbyTop, 0.3), fin);
          shell.body.quad(out(t + w, lobbyTop, 0.12), out(t + w, screenTop, 0.12), out(t + w + w, screenTop, 0.12), out(t + w + w, lobbyTop, 0.12), finShadow);
        }
      }
      // Blue glass above the screen, with a dark spandrel band at every floor.
      const from = street ? screenTop : lo + 0.2;
      const floors = Math.max(1, Math.round((top - 0.5 - from) / 3.95));
      litFacade(shell, seed, face++, a, b, from, top - 0.5, floors, high ? 3 : 9, 0.98, 0.72, blue, 0.1);
      if (high || floors <= 12) {
        for (let f = 0; f < floors; f++) {
          const y = from + f * (top - 0.5 - from) / floors;
          shell.body.quad(out(0, y, 0.11), out(0, y + 0.7, 0.11), out(1, y + 0.7, 0.11), out(1, y, 0.11), spandrel);
        }
      }
    });
  }
  // The triangular fold in the screen on the West Peachtree face near the north corner
  // (position and size estimated from the corner photograph), drawn just proud of the fins.
  // The west wall slants from x −23.9 (z −32) to −24.2 (z −0.1); sit the fold on the fin plane.
  const tri = (z: number, y: number): [number, number, number] => [-23.9 - 0.3 * (z + 32) / 31.9 - 0.32, y, z];
  shell.body.tri(tri(-24, lobbyTop), tri(-30, screenTop), tri(-18, screenTop), '#f4f1e8');
  shell.body.tri(tri(-24, lobbyTop), tri(-18, screenTop), tri(-30, screenTop), '#f4f1e8');

  // The 16th-floor sky bridge to 712 West Peachtree spans 12.3 m beyond this footprint, past
  // the skin footprint audit's allowance; it follows once the audit can take a per-part outline.
  return shell.finish('#f4d9a8', 0.62);
}
