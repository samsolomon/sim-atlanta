import { expect, it } from 'vitest';
import { Builder } from '../vignette/geom';
import { litFacade, litHash, seedOf } from './skin-kit';

const faces = 4, floors = 27, bays = 13;

/** Lit panes per face as a floor x bay grid. */
function field(lit: (f: number, j: number, k: number) => boolean) {
  return Array.from({ length: faces }, (_, f) => Array.from({ length: floors }, (_, j) => Array.from({ length: bays }, (_, k) => lit(f, j, k))));
}

/** The worst diagonal: over each bay step dk (≠ 0), lit pairs (j, k) and (j + 1, k + dk), summed over faces. */
function worstDiagonalPairs(grid: boolean[][][]) {
  let worst = 0;
  for (let dk = -6; dk <= 6; dk++) {
    if (!dk) continue;
    let n = 0;
    for (const face of grid)
      for (let j = 0; j + 1 < floors; j++)
        for (let k = 0; k < bays; k++)
          if (k + dk >= 0 && k + dk < bays && face[j][k] && face[j + 1][k + dk]) n++;
    worst = Math.max(worst, n);
  }
  return worst;
}

/** Longest run of lit panes along any (+1, ±1) diagonal. */
function longestDiagonalRun(grid: boolean[][][]) {
  let best = 0;
  for (const face of grid)
    for (const dk of [-1, 1])
      for (let j = 0; j < floors; j++)
        for (let k = 0; k < bays; k++) {
          let n = 0;
          while (j + n < floors && k + n * dk >= 0 && k + n * dk < bays && face[j + n][k + n * dk]) n++;
          best = Math.max(best, n);
        }
  return best;
}

it('lights about the requested share of panes with no diagonal staircases', () => {
  for (const density of [0.03, 0.12, 0.3]) {
    for (const id of ['osm:way:26795281', 'osm:way:234733557', 'osm:way:885332250']) {
      const seed = seedOf(id);
      const grid = field((f, j, k) => litHash(seed, f, j, k) < density);
      const share = grid.flat(2).filter(Boolean).length / (faces * floors * bays);
      expect(share).toBeGreaterThan(density * 0.5);
      expect(share).toBeLessThan(density * 1.6 + 0.005);
      // An independent field at this density expects about density² × pairs per diagonal step;
      // allow three times that plus a small floor.
      const pairs = faces * (floors - 1) * (bays - 1);
      expect(worstDiagonalPairs(grid)).toBeLessThanOrEqual(Math.ceil(3 * density * density * pairs) + 3);
      // Runs of 4 or more lit panes along a diagonal are rare at office densities.
      if (density <= 0.12) expect(longestDiagonalRun(grid)).toBeLessThan(4);
    }
  }
});

it('rejects the linear-modulus rule it replaces', () => {
  // The kind of rule this hash replaces lights a regular lattice: staircases on one diagonal.
  const grid = field((f, j, k) => (j * 31 + k * 17 + f * 43) % 37 === 0);
  const share = grid.flat(2).filter(Boolean).length / (faces * floors * bays);
  const pairs = faces * (floors - 1) * (bays - 1);
  expect(worstDiagonalPairs(grid)).toBeGreaterThan(Math.ceil(3 * share * share * pairs) + 3);
});

it('is stable and varies by building, face, floor and bay', () => {
  const s = seedOf('osm:way:1');
  expect(litHash(s, 0, 3, 4)).toBe(litHash(s, 0, 3, 4));
  const values = new Set([litHash(s, 0, 3, 4), litHash(s, 1, 3, 4), litHash(s, 0, 4, 4), litHash(s, 0, 3, 5), litHash(seedOf('osm:way:2'), 0, 3, 4)]);
  expect(values.size).toBe(5);
});

it('litFacade lays the facade grid and lights panes by the shared hash', () => {
  const body = new Builder(), lights = new Builder();
  const seed = seedOf('osm:way:885332250');
  litFacade({ body, lights }, seed, 2, [0, 0], [30, 0], 10, 46, 10, 3, 0.8, 0.7, ['#445566', '#556677'], 0.2);
  // 10 panes along 30 m at 3 m, 10 rows, two triangles each.
  expect((body.pos.length + lights.pos.length) / 9).toBe(200);
  let lit = 0;
  for (let j = 0; j < 10; j++) for (let i = 0; i < 10; i++) if (litHash(seed, 2, j, i) < 0.2) lit++;
  expect(lights.pos.length / 18).toBe(lit);
  expect(lit).toBeGreaterThan(5);
  expect(lit).toBeLessThan(40);
});

it('measures how far a mesh reaches past its footprint and its top', async () => {
  const { BoxGeometry, Mesh, MeshBasicMaterial, Group } = await import('three');
  const { footprintReport, outsideRings } = await import('./skin-kit');
  const square: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]];
  expect(outsideRings([square], 5, 5)).toBe(0);
  expect(outsideRings([square], 13, 5)).toBeCloseTo(3);
  const group = new Group();
  const box = new Mesh(new BoxGeometry(2, 2, 2), new MeshBasicMaterial());
  box.position.set(14, 1, 5); // 3 to 5 m outside the east wall
  group.add(box);
  const r = footprintReport(group, [square], { maxProjection: 2.5, top: 1.5 });
  expect(r.worst).toBeCloseTo(2.5); // 5 m out, less the 2.5 m allowance
  expect(r.outside).toBeCloseTo(5);
  expect(r.vertical).toBeCloseTo(0.5);
  box.position.set(5, 1, 5);
  expect(footprintReport(group, [square]).worst).toBe(0);
});

it('flags a part hanging off the wall but not a slab that runs back to it', async () => {
  const { Group, Mesh, MeshBasicMaterial } = await import('three');
  const { detachedParts } = await import('./skin-kit');
  const square: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const body = new Builder();
  // The building's south and east walls, and a balcony slab from the east wall out to 1.7 m
  // with a rail at its edge.
  body.quad([0, 0, 0], [0, 9, 0], [10, 9, 0], [10, 0, 0], '#ffffff');
  body.quad([10, 0, 0], [10, 9, 0], [10, 9, 10], [10, 0, 10], '#ffffff');
  body.quad([10, 3, 2], [11.7, 3, 2], [11.7, 3, 4], [10, 3, 4], '#ffffff');
  body.quad([11.7, 3, 2], [11.7, 4, 2], [11.7, 4, 4], [11.7, 3, 4], '#ffffff');
  const attached = new Group();
  attached.add(new Mesh(body.geometry(), new MeshBasicMaterial()));
  expect(detachedParts(attached, [square])).toEqual([]);
  // Alexan before #550: a stack of vertical plates 1.7 m off the wall, each 0.2 m above the
  // last (so they cluster with each other) but joined to nothing on the building.
  const plate = new Builder();
  for (let y = 3; y < 9; y += 1.2) plate.quad([11.7, y, 6], [11.7, y + 1, 6], [11.7, y + 1, 8], [11.7, y, 8], '#ffffff');
  attached.add(new Mesh(plate.geometry(), new MeshBasicMaterial()));
  const found = detachedParts(attached, [square]);
  expect(found).toHaveLength(1);
  expect(found[0].gap).toBeCloseTo(1.7);
  // A window pane laid 0.07 m off a wall that itself sits 0.5 m outside a simplified outline
  // still belongs to the building: not detached.
  const pane = new Builder();
  pane.quad([10.07, 5, 6], [10.07, 6, 6], [10.07, 6, 7], [10.07, 5, 7], '#ffffff');
  const wall = new Builder();
  wall.quad([10, 0, 0], [10, 9, 0], [10, 9, 10], [10, 0, 10], '#ffffff');
  wall.quad([0, 9, 0], [0, 9, 10], [10, 9, 10], [10, 9, 0], '#ffffff'); // the roof, mostly inside the outline
  const g2 = new Group();
  g2.add(new Mesh(wall.geometry(), new MeshBasicMaterial()), new Mesh(pane.geometry(), new MeshBasicMaterial()));
  expect(detachedParts(g2, [[[0, 0], [9.5, 0], [9.5, 10], [0, 10]]])).toEqual([]);
});

it('joins parts that cross mid-span with no vertex near each other', async () => {
  const { Group, Mesh, MeshBasicMaterial } = await import('three');
  const { detachedParts } = await import('./skin-kit');
  const square: [number, number][] = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const b = new Builder();
  // A long rib running out from the building (anchored), and a cross-rib outside the outline that
  // passes through its middle: their nearest vertices are metres apart.
  b.quad([5, 0, 5], [5, 1, 5], [25, 1, 5], [25, 0, 5], '#ffffff');
  b.quad([15, 0.5, 0], [15, 0.5, 10], [15.2, 0.5, 10], [15.2, 0.5, 0], '#ffffff');
  b.quad([15.1, -0.5, 0], [15.1, 1.5, 0], [15.1, 1.5, 10], [15.1, -0.5, 10], '#ffffff');
  const g = new Group();
  g.add(new Mesh(b.geometry(), new MeshBasicMaterial()));
  expect(detachedParts(g, [square])).toEqual([]);
});
