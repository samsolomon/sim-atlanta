import { readFileSync } from 'node:fs';
import { Raycaster, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { GroundGrid, type GroundManifest } from '../terrain/grid';
import { GroundSurface } from '../terrain/surface';
import { boardPoint, eastBounds, eastJoin } from './board-footprint';
import { joinedPlinth, loadEast, verifyJoin } from './king-memorial-board';

const westBounds = { minX: 990, maxX: 1000, minZ: 260, maxZ: 660 };
function grid(bounds: GroundManifest['bounds']) {
  const rows = (bounds.maxZ - bounds.minZ) / 5 + 1,
    cols = (bounds.maxX - bounds.minX) / 5 + 1;
  const manifest = {
    bounds,
    rows,
    cols,
    version: 1,
    stepM: 5,
    encoding: 'signed int16 little-endian',
    noData: -32768,
    scaleM: 0.1,
    offsetM: 0,
    sha256: '',
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 323.8 },
    horizontal: { originLon: -84.3916, originLat: 33.7539, radiusM: 6371008.8 },
  };
  const bytes = new ArrayBuffer(rows * cols * 2),
    view = new DataView(bytes);
  for (let i = 0; i < rows * cols; i++) view.setInt16(i * 2, 3100 + (Math.floor(i / cols) % 2), true);
  return { manifest, bytes, grid: new GroundGrid(manifest, bytes) };
}

it('keeps the same 73 drawn seam nodes at both levels of detail', () => {
  const west = grid(westBounds),
    east = grid(eastBounds);
  verifyJoin(west.grid, east.grid);
  for (const quality of ['low', 'high'] as const) {
    const meshes = [west, east].map((s) => new GroundSurface(s.grid, quality, [], eastJoin));
    for (let z = eastJoin.minZ; z <= eastJoin.maxZ; z += 5) {
      const expected = east.grid.sample(1000, z)! - 323.8;
      for (const m of meshes) expect(m.sampleScene(1000, z)).toBeCloseTo(expected, 4);
    }
    for (const m of meshes) m.geometry.dispose();
  }
  new DataView(east.bytes).setInt16(2 * east.manifest.cols * 27, 3090, true);
  expect(() => verifyJoin(west.grid, east.grid)).toThrow(/edge/);
});

it('clamps the camera and walnut plinth to the joined footprint', () => {
  const west = { minX: -1000, maxX: 1000, minZ: -1300, maxZ: 700 };
  expect(boardPoint(west, false, 1500, 450)).toEqual({ x: 1000, z: 450 });
  expect(boardPoint(west, true, 1500, 450)).toEqual({ x: 1500, z: 450 });
  expect(boardPoint(west, true, 1500, 800)).toEqual({ x: 1500, z: 640 });
  expect(boardPoint(west, true, 1040, -1000)).toEqual({ x: 1000, z: -1000 });
  const base = joinedPlinth(west, -45);
  base.updateMatrixWorld();
  function hits(x: number, z: number) {
    return new Raycaster(new Vector3(x, 20, z), new Vector3(0, -1, 0)).intersectObject(base);
  }
  expect(hits(1500, 450)[0].point.y).toBeCloseTo(-45);
  expect(hits(1004, -100)).toHaveLength(1);
  expect(hits(1500, -100)).toHaveLength(0);
  base.geometry.dispose();
  base.material.dispose();
});

afterEach(() => vi.unstubAllGlobals());
it('rejects mixed cached terrain before building a board', async () => {
  const west = grid(westBounds),
    east = grid(eastBounds);
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url.endsWith('.i16')
        ? new Response(east.bytes)
        : Response.json(url.endsWith('ground.json') ? east.manifest : {}),
    ),
  );
  await expect(loadEast('/data', west.grid, 'low', -45, new AbortController().signal)).rejects.toThrow(
    /checksum/,
  );
});
it('stages the complete five-story Marchon relation without the station canopy or platform', () => {
  const ctx = JSON.parse(
    readFileSync(new URL('../../../pipeline/prototypes/king-memorial/context.json', import.meta.url), 'utf8'),
  );
  const byId = new Map<string, { floors: number; rings: number[][][] }>(
    ctx.buildings.map((b: { id: string }) => [b.id, b]),
  );
  expect(byId.get('osm:relation:17262953')?.floors).toBe(5);
  expect(byId.get('osm:relation:17262953')?.rings[0]).toHaveLength(25);
  expect(byId.get('osm:way:897345399')?.floors).toBe(5);
  expect(byId.has('osm:way:270494115')).toBe(false);
  expect(ctx.rail).toEqual([]);
});

it('opens only the 360 m shared wall and retains the exterior skirt at both ends', async () => {
  const { createDowntownTerrain } = await import('../terrain/model');
  const ctx = { scale() {}, translate() {}, fillRect() {}, setLineDash() {} };
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  const terrain = createDowntownTerrain(
    grid(westBounds).grid,
    { bounds: westBounds, buildings: [], roads: [], rail: [] },
    [],
    { quality: 'low', join: eastJoin },
  );
  const walls = terrain.board.children as import('three').Mesh[];
  function edgeMidpoints(wall: import('three').Mesh) {
    const pos = wall.geometry.getAttribute('position'),
      along: number[] = [];
    for (let i = 0; i < pos.count; i += 3) {
      if ([i, i + 1, i + 2].every((j) => pos.getX(j) === 1000))
        along.push((pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3);
    }
    return along;
  }
  const seam = walls.find((w) => w.name === 'joining edge')!,
    exterior = walls.find((w) => w !== seam)!;
  expect(seam.visible).toBe(true);
  const joined = edgeMidpoints(seam),
    outer = edgeMidpoints(exterior);
  expect(joined).toHaveLength(72 * 2);
  expect(joined.every((z) => z > 280 && z < 640)).toBe(true);
  expect(outer.some((z) => z < 280)).toBe(true);
  expect(outer.some((z) => z > 640)).toBe(true);
  expect(outer.every((z) => z < 280 || z > 640)).toBe(true);
  terrain.openJoin();
  expect(seam.visible).toBe(false);
  expect(exterior.visible).toBe(true);
  terrain.dispose();
});
