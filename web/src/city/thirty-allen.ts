import { ShapeUtils, Vector2 } from 'three';
import type { GroundGrid } from '../terrain/grid';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { landmarkShell } from './landmark-shell';
import { wallRuns } from './marquis-offices';
import { litHash, seedOf } from './skin-kit';

export const thirtyAllenId = 'f78605b6-ea94-4b02-a0ba-0a89d1b3c84e';

// Roof elevations from USGS 2018 lidar, paired to the five mapped Overture parts.
const roofs = new Map([
  ['overture:0420aca6-b845-3e4b-9fa0-168d85385534', 369.6],
  ['overture:0c0440d9-4dd0-3e60-8458-23f131e5af3b', 362.5],
  ['overture:687cff3f-c145-3429-ac50-7a81b6a14465', 357.3],
  ['overture:c4956ab1-fe72-33d8-b79f-e217241b6f85', 322.2],
  ['overture:e0002309-e14c-39ae-a943-c323503e0524', 316.8],
]);

export function createThirtyAllen(buildings: VBuilding[], grid: GroundGrid) {
  const site = buildings.find(b => b.id === thirtyAllenId);
  if (!site?.parts || ![...roofs.keys()].every(id => site.parts?.some(p => p.id === id))) return null;
  const shell = landmarkShell(buildings, grid, thirtyAllenId, '30 Allen Plaza', [308, -1155], [1, 0], [[0, 0]]);
  if (!shell) return null;
  const frame = '#444953', glass = '#899da9', seed = seedOf(thirtyAllenId);
  for (const [index, part] of site.parts.entries()) {
    const top = roofs.get(part.id);
    if (!top) continue;
    const ring: P2[] = part.rings[0].map(([x, z]) => [x - 308, z + 1155]);
    if (ShapeUtils.isClockWise(ring.map(p => new Vector2(...p)))) ring.reverse();
    const penthouse = top === 362.5;
    const bottom = penthouse ? 357.3 : shell.base;
    shell.prism(ring, bottom, top - 1.8, glass, frame);
    shell.prism(ring, top - 1.8, top, frame, '#89898a');
    if (penthouse) continue;
    wallRuns(ring).forEach(([a, b], edge) => {
      const dx = b[0] - a[0], dz = b[1] - a[1], length = Math.hypot(dx, dz);
      if (length < 3) return;
      const point = (u: number, y: number, d: number) => [
        a[0] + (dx*u + dz*d)/length, y, a[1] + (dz*u - dx*d)/length,
      ];
      const panel = (l: number, r: number, y: number, h: number, d: number, color: string, lit = false) =>
        (lit ? shell.lights : shell.body).quad(point(l,y,d),point(l,h,d),point(r,h,d),point(r,y,d),color);
      const bays = Math.max(1, Math.round(length / 7.3)), width = length / bays;
      for (let i = 0; i < bays; i++) {
        const left = i * width, right = left + width;
        panel(left, left + 0.65, bottom, top - 1.8, 0.16, frame);
        panel(left + width/2, left + width/2 + 0.14, bottom, top - 1.8, 0.06, frame);
        for (let y = 309.5, floor = 0; y < top - 3; y += 3.65, floor++) {
          // The dusk reference shows more occupied upper offices and a bright west lantern.
          const lantern = top === 369.6 && y > 360;
          const occupancy = y >= 333 ? 0.39 : 0.13;
          if (lantern || litHash(seed, index*32 + edge, floor, i) < occupancy)
            panel(left + 0.8, left + width/2 - 0.15, y + 0.4, y + 2.6, 0.06, glass, true);
        }
        // Three straight segments approximate the shallow arch of the upper spandrel.
        if (top === 357.3) {
          const y = top - 10;
          const arch = [0, 0.24, 0.76, 1];
          for (let j = 0; j < 3; j++) {
            const l = left + width*arch[j], r = left + width*arch[j+1];
            shell.body.quad(point(l,y+(j===0?0:0.45),0.21),point(l,y+1,0.21),
              point(r,y+1,0.21),point(r,y+(j===2?0:0.45),0.21),frame);
          }
        }
        if (i === bays-1) panel(right-0.32,right,bottom,top-1.8,0.16,frame);
      }
      for (let y = 309.5; y < top - 2; y += 3.65)
        panel(0,length,y,y+0.23,0.11,frame);
    });
  }
  return shell.finish();
}
