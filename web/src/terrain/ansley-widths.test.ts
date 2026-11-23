import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import upper from '../../../pipeline/prototypes/square-board/midtown-upper/context.json';
import brookwood from '../../../pipeline/prototypes/square-board/brookwood-south/context.json';
import { segDist, type P2 } from '../vignette/geom';
import { ANSLEY_WIDTHS, roadWidth } from './transport-data';

type Context = { roads: { cls: string; name: string | null; pts: P2[] }[]; buildings: { id: string; rings: P2[][] }[] };
const boards = { 'midtown-upper': upper as unknown as Context, 'brookwood-south': brookwood as unknown as Context };

test('widens only the named Ansley streets, and only inside Ansley', () => {
  const pts: P2[] = [[1200, -3900], [1210, -3950]];
  expect(roadWidth({ cls: 'residential', name: 'The Prado Northeast', pts })).toBe(12);
  expect(roadWidth({ cls: 'residential', name: 'Westminster Drive Northeast', pts })).toBe(7);
  // 15th Street west of Peachtree is not Ansley.
  expect(roadWidth({ cls: 'residential', name: '15th Street Northeast', pts: [[300, -3900], [320, -3900]] })).toBe(7);
  expect(roadWidth({ cls: 'secondary', name: 'The Prado Northeast', pts })).toBe(11);
  // Peachtree Circle by Winn Park lies just west of the house-style box.
  expect(roadWidth({ cls: 'residential', name: 'Peachtree Circle Northeast', pts: [[811, -4032], [787, -4082]] })).toBe(12);
});

test('the widened carriageways clear every building footprint and every mapped tree', () => {
  let streets = 0;
  for (const [id, board] of Object.entries(boards)) {
    const served = `public/data/scene/square-board/${id}/context.json`;
    const trees: [number, number][] = existsSync(served) ? JSON.parse(readFileSync(served, 'utf8')).trees : [];
    for (const road of board.roads) {
      if (!road.name || !(road.name in ANSLEY_WIDTHS) || roadWidth(road) === 7) continue;
      streets++;
      const half = roadWidth(road) / 2;
      const near = (x: number, z: number) => road.pts.slice(1).some((b, i) => segDist(x, z, road.pts[i], b) < half);
      const hits: string[] = [];
      for (const bd of board.buildings) {
        const ring = bd.rings[0];
        // Every metre along the footprint's walls.
        if (ring.some((a, i) => {
          const c = ring[(i + 1) % ring.length], n = Math.max(1, Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1])));
          return Array.from({ length: n }, (_, k) => near(a[0] + (c[0] - a[0]) * k / n, a[1] + (c[1] - a[1]) * k / n)).some(Boolean);
        })) hits.push(bd.id);
      }
      for (const [x, z] of trees) if (near(x, z)) hits.push(`tree ${x},${z}`);
      expect(hits, `${road.name} on ${id}`).toEqual([]);
    }
  }
  expect(streets).toBeGreaterThan(10);
});
