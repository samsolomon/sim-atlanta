import type { GroundGrid } from '../terrain/grid';
import { rng, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { surfaces } from '../materials';
import { landmarkShell } from './landmark-shell';

export const viewpointId = 'osm:way:536670474';
const TOWER = 'osm:way:536671916', PODIUM = 'osm:way:536671914', RETAIL = ['osm:way:886036481', 'osm:way:886036483'];
const origin: P2 = [715, -2673.5], axis: P2 = [1, 0.0837];

/**
 * Heights above the Peachtree sidewalk from the 2019 USGS lidar (grade 304.4 m NAVD88):
 * retail 316.8, garage 340.2 south and 342.7 north, tower roof 424.3, and a glass crown
 * screen that sweeps from 427.2 m at the east end to 437.5 m over Peachtree.
 */
export const VIEWPOINT = {
  retail: 12.4, garageSouth: 35.8, garageNorth: 38.3, roof: 119.9, crownEast: 122.8, crownWest: 133.1,
  floor: 3.33,
} as const;

const glassBlue = '#56708a', precast = '#d3d3cf', balcony = '#8e979d', garage = '#b8b5ad',
  slot = '#3f4a52', roofGrey = '#a6a39b';

export function createViewPoint(buildings: VBuilding[], site: VBuilding, grid: GroundGrid) {
  const parts = site.parts;
  const tower = parts?.find(p => p.id === TOWER);
  const podia = parts?.filter(p => p.id === PODIUM) ?? [];
  const retail = parts?.filter(p => RETAIL.includes(p.id)) ?? [];
  if (!parts || !tower || podia.length !== 2 || retail.length !== 2) return null;
  const s = landmarkShell(buildings, grid, site.id, 'ViewPoint', origin, axis, [[0, 0], [-20, -20], [20, 20]]);
  if (!s) return null;
  const angle = Math.atan2(axis[1], axis[0]), c = Math.cos(angle), n = Math.sin(angle);
  const local = (ring: P2[]): P2[] => {
    const pts: P2[] = ring.map(([x, z]) => [(x - origin[0]) * c + (z - origin[1]) * n, -(x - origin[0]) * n + (z - origin[1]) * c]);
    const area = pts.reduce((sum, [x, z], i) => sum + x * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * z, 0);
    return area < 0 ? pts.reverse() : pts;
  };
  const datum = site.floorY === undefined ? s.base + 0.35 : site.floorY + grid.manifest.vertical.sceneZeroNavd88M;
  const H = VIEWPOINT, roof = datum + H.roof, random = rng(855);
  const glass = surfaces.curtainGlass({ tint: 'blue', mullion: 1.6, floor: H.floor });
  const panels = surfaces.precast({ width: 3.2, height: 3.6 });
  // Stacked balconies read as silver slabs with a dark line at each floor.
  const slabs = surfaces.curtainGlass({ tint: 'silver', mullion: 40, floor: H.floor });

  // u runs east along the broad faces, v runs south (z is −north).
  const box = (u0: number, u1: number, v0: number, v1: number, lo: number, hi: number, colour: string, top = true) => {
    const q = (a: number[], b: number[], cc: number[], d: number[]) => s.body.quad(a, b, cc, d, colour);
    q([u0, lo, v0], [u0, hi, v0], [u1, hi, v0], [u1, lo, v0]);
    q([u1, lo, v1], [u1, hi, v1], [u0, hi, v1], [u0, lo, v1]);
    q([u0, lo, v1], [u0, hi, v1], [u0, hi, v0], [u0, lo, v0]);
    q([u1, lo, v0], [u1, hi, v0], [u1, hi, v1], [u1, lo, v1]);
    if (top) q([u0, hi, v0], [u0, hi, v1], [u1, hi, v1], [u1, hi, v0]);
  };

  // Shaft: blue curtain glass on the mapped outline, stepped out at the Peachtree end.
  const shaft = local(tower.rings[0]);
  s.prism(shaft, datum, roof, glassBlue, roofGrey, { wall: glass });
  const west = Math.min(...shaft.map(p => p[0])), east = Math.max(...shaft.map(p => p[0]));
  const north = Math.min(...shaft.map(p => p[1])), south = Math.max(...shaft.map(p => p[1]));
  const broadWest = -26.9;

  // Garage wings north and south, light precast with a dark opening band on each deck.
  for (const part of podia) {
    const ring = local(part.rings[0]);
    const isNorth = Math.max(...ring.map(p => p[1])) < 0;
    const top = datum + (isNorth ? H.garageNorth : H.garageSouth);
    s.prism(ring, datum, top, garage, roofGrey, { wall: panels });
    const face = isNorth ? Math.min(...ring.map(p => p[1])) - 0.05 : Math.max(...ring.map(p => p[1])) + 0.05;
    const far = Math.max(...ring.map(p => p[0])) + 0.05;
    const [v0, v1] = isNorth ? [face, north] : [south, face];
    for (let y = datum + H.retail + 1.2; y + 2.4 < top; y += 3.6) {
      s.body.quad([broadWest, y, face], [broadWest, y + 1.5, face], [far, y + 1.5, face], [far, y, face], slot);
      s.body.quad([far, y, v0], [far, y + 1.5, v0], [far, y + 1.5, v1], [far, y, v1], slot);
    }
  }

  // Shops along Peachtree and 6th: a precast block with a storefront band and a row of
  // upper windows on the street faces. The rounded corner is the glass rotunda.
  for (const part of retail) {
    const ring = local(part.rings[0]);
    s.prism(ring, datum, datum + H.retail, precast, roofGrey, { wall: panels });
    ring.forEach((a, i) => {
      const b = ring[(i + 1) % ring.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const out: P2 = [(b[1] - a[1]) / len, -(b[0] - a[0]) / len];
      const street = out[0] < -0.7 || out[1] > 0.7, corner = len < 4.5 && a[0] < -26 && a[1] > 45;
      if (!street || (len < 4.5 && !corner)) return;
      const at = (t: number, y: number) => [a[0] + t * (b[0] - a[0]) + out[0] * 0.06, y, a[1] + t * (b[1] - a[1]) + out[1] * 0.06];
      const band = (lo: number, hi: number) => s.body.quad(at(0, lo), at(0, hi), at(1, hi), at(1, lo), glassBlue);
      if (!corner) {
        // Open shop windows glow after dark; the band above stays glass.
        s.lights.quad(at(0, datum + 0.3), at(0, datum + 5), at(1, datum + 5), at(1, datum + 0.3), glassBlue);
      }
      s.paint(glass, () => {
        if (corner) band(datum, datum + H.retail - 0.6);
        else band(datum + 6.6, datum + 10.4);
      });
    });
  }
  // The 865 entrance canopy under the tower's Peachtree end.
  box(west - 3.2, west, -4.6, 4.9, datum + 4.6, datum + 5.1, '#e2dfd8');

  // Precast pilasters frame six balcony stacks on each broad face.
  const bays = 6, bay = (east - broadWest) / bays;
  for (const [face, garageTop, out] of [[north, H.garageNorth, -1], [south, H.garageSouth, 1]] as const) {
    const lo = datum + garageTop, v = face + out * 0.25;
    for (let k = 0; k <= bays; k++) {
      const u = broadWest + k * bay;
      s.body.quad([u - 0.6, lo, v], [u - 0.6, roof + 0.4, v], [u + 0.6, roof + 0.4, v], [u + 0.6, lo, v], precast);
    }
    s.paint(slabs, () => {
      for (let k = 0; k < bays; k++) {
        const u = broadWest + (k + 0.5) * bay;
        const v0 = face, v1 = face + out * 1.6;
        box(u - 1.5, u + 1.5, Math.min(v0, v1), Math.max(v0, v1), lo + 0.6, roof - 3.4, balcony);
      }
    });
  }

  // Each narrow end: a precast centre strip carrying one balcony stack; the Peachtree end
  // adds stacks on its stepped glass corners.
  s.body.quad([east + 0.12, datum + H.retail, -3.6], [east + 0.12, roof, -3.6], [east + 0.12, roof, 3.6], [east + 0.12, datum + H.retail, 3.6], precast);
  s.body.quad([west - 0.12, datum + H.retail, 4.4], [west - 0.12, roof, 4.4], [west - 0.12, roof, -4.1], [west - 0.12, datum + H.retail, -4.1], precast);
  s.paint(slabs, () => {
    box(east, east + 1.6, -1.6, 1.6, datum + H.retail + 3, roof - 3.4, balcony);
    box(west - 1.6, west, -1.4, 1.7, datum + H.retail + 3, roof - 3.4, balcony);
    box(-31.4 - 1.6, -31.4, -8.8, -4.4, datum + H.retail + 3, roof - 3.4, balcony);
    box(-31.4 - 1.6, -31.4, 4.6, 8.6, datum + H.retail + 3, roof - 3.4, balcony);
  });

  // The glass crown screen rises toward Peachtree in a long sweep.
  const crown = (u: number) => {
    const t = Math.min(1, Math.max(0, (12 - u) / 40));
    return datum + H.crownEast + t * (H.crownWest - H.crownEast);
  };
  s.paint(surfaces.curtainGlass({ tint: 'silver', mullion: 1.6, floor: 40 }), () => {
    const steps = 8;
    for (const v of [north - 0.05, south + 0.05]) {
      for (let i = 0; i < steps; i++) {
        const u0 = west + (east - west) * i / steps, u1 = west + (east - west) * (i + 1) / steps;
        const a = [u0, roof, v], b = [u0, crown(u0), v], cc = [u1, crown(u1), v], d = [u1, roof, v];
        if (v < 0) s.body.quad(a, b, cc, d, '#8f9fa9');
        else s.body.quad(d, cc, b, a, '#8f9fa9');
      }
    }
    s.body.quad([west, roof, south], [west, crown(west), south], [west, crown(west), north], [west, roof, north], '#8f9fa9');
    s.body.quad([east, roof, north], [east, crown(east), north], [east, crown(east), south], [east, roof, south], '#8f9fa9');
  });

  // Residential windows: a stable third of the glass between stacks is lit. Each lit pane
  // spans one pilaster (which stands in front of it), so a corner unit is one quad.
  const lit = (u0: number, u1: number, v: number, y: number) =>
    s.lights.quad([u0, y, v], [u0, y + 2.5, v], [u1, y + 2.5, v], [u1, y, v], glassBlue);
  for (const [face, garageTop, out] of [[north, H.garageNorth, -1], [south, H.garageSouth, 1]] as const) {
    const v = face + out * 0.06;
    for (let y = datum + garageTop + 0.8; y + 3 < roof; y += H.floor) {
      for (let k = 0; k <= bays; k++) {
        if (random() > 0.4) continue;
        const u = broadWest + k * bay;
        const a = k === 0 ? u + 0.2 : u - bay / 2 + 1.7, b = k === bays ? u - 0.2 : u + bay / 2 - 1.7;
        if (out < 0) lit(b, a, v, y); else lit(a, b, v, y);
      }
    }
  }
  return s.finish('#f6dcae', 0.7);
}
