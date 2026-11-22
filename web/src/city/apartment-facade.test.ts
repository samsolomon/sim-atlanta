import { describe, expect, it } from 'vitest';
import { Builder, type P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { apartmentFinish } from './apartment-facade';
import { marchonFinishes } from './marchon-frontage';

const ring: P2[] = [[0, 0], [16, 0], [16, 16], [0, 16]];
const palette = { wall: 'white', roof: 'gray', accent: 'gray', shopFrame: 'gray', trim: 'silver', recess: 'black', glass: 'blue' };
const building: VBuilding = { id: 'example', rings: [ring], h: null, floors: 4 };
const layout = () => ({ groundUse: 'residential', balconyEvery: 2 }) as const;

function draw(vertices: P2[], hole: boolean) {
  const mesh = new Builder(), lights = new Builder();
  apartmentFinish(building, palette, layout)!.drawRing!(mesh, vertices, hole, 0, 15.5, lights);
  const points: number[][] = [];
  for (const batch of [mesh, lights])
    for (let i = 0; i < batch.pos.length; i += 3) points.push(batch.pos.slice(i, i + 3));
  return points.sort();
}

describe('apartment facades', () => {
  it.each([false, true])('recesses towards the occupied side under either winding (hole=%s)', hole => {
    const points = draw(ring, hole);
    expect(draw([...ring].reverse(), hole)).toEqual(points);
    const onBottomBay = points.filter(([x, y, z]) => x > 3 && x < 13 && y > 5 && Math.abs(z) < 2);
    const depths = onBottomBay.map(([, , z]) => z);
    expect(depths).toContain(hole ? -1.05 : 1.05);
    expect(depths).not.toContain(hole ? 1.05 : -1.05);
  });

  it('selects the observed apartments by ID, leaves unclassified buildings alone and keeps the garage solid', () => {
    const finish = marchonFinishes([]);
    expect(finish(building)).toBeUndefined();
    expect(finish({ ...building, id: 'osm:way:1254384192' })).toMatchObject({ plainWalls: true });
    for (const [id, floors] of [['osm:relation:17262953', 5], ['osm:way:1254383435', 4]] as const) {
      const mesh = new Builder();
      const height = floors * 3.6 + 1.1;
      finish({ ...building, id, floors })!.drawRing!(mesh, ring, false, 0, height, new Builder());
      const slabHeights = new Set<number>();
      for (let i = 0; i < mesh.pos.length; i += 3) {
        const [x, y, z] = mesh.pos.slice(i, i + 3);
        if (x > 2 && x < 14 && z === 1.05) slabHeights.add(y);
      }
      // A stack above the ground floor has one more slab boundary than balconies.
      expect(slabHeights.size).toBe(floors);
    }
    expect(apartmentFinish({ ...building, floors: null }, palette, layout)).toBeUndefined();
  });
});
