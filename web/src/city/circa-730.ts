import type { GroundGrid } from '../terrain/grid';
import type { TerrainQuality } from '../terrain/surface';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { litFacade, seedOf } from './skin-kit';

export const circa730Id = 'osm:way:234938413';
const origin: P2 = [577, -2289];
const wingId = 'osm:way:1343480962';
const stripId = 'osm:way:1343480972';
// The rooftop core over the middle of the slab (lidar 48–49 m), in world coordinates.
const coreWorld: P2[] = [[579, -2297], [596, -2296], [595, -2280], [578, -2281]];

// Heights from the April 2019 lidar (90th-percentile returns on an 8 m grid, ground 305.2 m
// NAVD88): the 1960s office slab reads 44 m, a central core 48–49 m, the mapped low wing on Peachtree
// as the same 44–49 m (so the slab covers it), and the east strip a single storey.
export function createCirca730(buildings: VBuilding[], site: VBuilding, grid: GroundGrid, quality: TerrainQuality) {
  const high = quality === 'high';
  const parts = site.parts ?? [];
  const slabPart = parts.find(p => p.id === 'podium');
  const wingPart = parts.find(p => p.id === wingId);
  const stripPart = parts.find(p => p.id === stripId);
  if (!slabPart?.rings.length) return null;
  const shell = landmarkShell(buildings, grid, site.id, 'Circa 730', origin, [1, 0], [[0, -5], [-35, -5], [35, -3]]);
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
  const roof = datum + 44, coreTop = datum + 48.5, stripTop = datum + 3.6, lobby = datum + 5.2;
  const slab = local(slabPart.rings[0]);
  const wing = wingPart?.rings.length ? local(wingPart.rings[0]) : null;
  const strip = stripPart?.rings.length ? local(stripPart.rings[0]) : null;
  // The lidar reads 44–49 m over the mapped 8 m wing (an illustrative-tier part), so the slab
  // continues over it; only the east strip is low.
  const masses = [{ ring: slab, top: roof }, ...(wing ? [{ ring: wing, top: roof }] : []), ...(strip ? [{ ring: strip, top: stripTop }] : [])];
  const covered = (a: P2, b: P2, length: number) => {
    const mx = (a[0] + b[0]) / 2 + 0.6 * (b[1] - a[1]) / length;
    const mz = (a[1] + b[1]) / 2 - 0.6 * (b[0] - a[0]) / length;
    return Math.max(datum, ...masses.filter(m => inside(mx, mz, m.ring)).map(m => m.top));
  };
  const edges = (ring: P2[], draw: (a: P2, b: P2, length: number) => void) =>
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length > 1.2) draw(a, b, length);
    });
  // White precast spandrels between continuous ribbons of pale grey-green glass, as in the
  // owner's photographs; the narrow ends are solid white with a single glazed slot.
  const white = '#f3f2ee', roofColor = '#c4c2ba';
  const ribbon = ['#4f6670', '#566d77'];
  const storefront = ['#6a7b84', '#6e818a'];
  const floors = 10, pitch = (roof - 1 - lobby) / floors;

  shell.prism(slab, shell.base, roof, white, roofColor);
  edges(slab, (a, b, length) => {
    const lo = covered(a, b, length);
    if (roof - lo < 1) return;
    const street = lo <= datum + 0.01;
    // A recessed glass lobby under the slab on the street sides.
    if (street) litFacade(shell, seed, face++, a, b, datum + 0.4, lobby - 0.3, 1, high ? 3.2 : 10, 0.9, 0.86, storefront, 0.4);
    const from = street ? lobby : lo + 0.3;
    const rows = Math.max(1, Math.round((roof - 1 - from) / pitch));
    if (length > 40) {
      // Long faces: one continuous ribbon per floor (office night: mostly dark).
      litFacade(shell, seed, face++, a, b, from, roof - 1, rows, high ? 3 : 8, 0.985, 0.55, ribbon, 0.1);
    } else if (high || length > 6) {
      // End walls: a single central slot of glass.
      const t0 = 0.42, t1 = 0.58;
      const at = (t: number): P2 => [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
      litFacade(shell, seed, face++, at(t0), at(t1), from, roof - 1, rows, 10, 0.95, 0.8, ribbon, 0.1);
    }
  });
  const core = local(coreWorld);
  shell.prism(core, roof, coreTop, white, roofColor);
  if (wing) {
    shell.prism(wing, shell.base, roof, white, roofColor);
    edges(wing, (a, b, length) => {
      const lo = covered(a, b, length);
      if (roof - lo < 1) return;
      litFacade(shell, seed, face++, a, b, datum + 0.4, lobby - 0.3, 1, high ? 3.2 : 10, 0.9, 0.86, storefront, 0.4);
      const rows = Math.max(1, Math.round((roof - 1 - lobby) / pitch));
      litFacade(shell, seed, face++, a, b, lobby, roof - 1, rows, high ? 3 : 8, 0.985, 0.55, ribbon, 0.1);
    });
  }
  if (strip) {
    shell.prism(strip, shell.base, stripTop, '#d6d4cd', '#9c9a93');
    edges(strip, (a, b, length) => {
      if (covered(a, b, length) > datum + 0.01) return;
      litFacade(shell, seed, face++, a, b, datum + 0.3, stripTop - 0.4, 1, high ? 3.2 : 10, 0.9, 0.85, storefront, 0.4);
    });
  }
  return shell.finish('#f4d9a8', 0.62);
}
