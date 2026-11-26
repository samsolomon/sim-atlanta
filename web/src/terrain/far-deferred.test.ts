import { existsSync, readFileSync } from 'node:fs';
import { PerspectiveCamera, type Mesh } from 'three';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import type { FarBox } from '../city/far-board';
import { neighborhoodTrees } from '../city/neighborhood-trees';
import { joins } from '../square-board/sections';
import { turn } from '../testing/turn';
import { GroundGrid } from './grid';
import { createDowntownTerrain, FAR_GROUND_M } from './model';
import type { GroundYield } from './surface-build';

/**
 * A board built before the page is ready leaves its far-board form for later (deferFarBoxes,
 * built by buildFar). The later build must make the same boxes as building them with the board,
 * and the buildings must draw as they are until it has.
 */
const ROW = 'brookwood-south';
const dir = new URL(`../../public/data/scene/square-board/${ROW}/`, import.meta.url);
const staged = existsSync(new URL('context.json', dir));

beforeAll(() => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  vi.stubGlobal('requestAnimationFrame', (next: () => void) => { void turn().then(next); return 1; });
});
afterAll(() => { vi.unstubAllGlobals(); });

function board(deferFarBoxes: boolean) {
  const grid = new GroundGrid(JSON.parse(readFileSync(new URL('ground.json', dir), 'utf8')), Uint8Array.from(readFileSync(new URL('ground.i16', dir))).buffer);
  const city = JSON.parse(readFileSync(new URL('context.json', dir), 'utf8'));
  // One building drawn on its own, as downtown draws its Summit: it joins the far form too.
  const own = [...city.buildings].sort((a, b) => b.height - a.height)[0].id as string;
  return createDowntownTerrain(grid, city, neighborhoodTrees(city, 'low'), { quality: 'low', bottomY: -48, join: joins(ROW), separateBuilding: own, deferFarBoxes });
}
type Area = ReturnType<typeof board>;

const far = (area: Area) => area.scenery.getObjectByName('far-board buildings') as Mesh | undefined;
const buildings = (area: Area) => area.scenery.children.filter(o => o.userData.building && !o.name.startsWith('far-board'));
/**
 * A box's size, height, colours and facade, to compare as numbers. Not its axis or centre: where a
 * footprint has several smallest rectangles, the later fit (from 32-bit positions) may take another.
 */
const measures = (b: FarBox) => [b.y0, b.y1, Math.sqrt(b.hx * b.hz * 4), b.r, b.g, b.b, b.roof?.r ?? -1, b.style ?? -1, b.base ?? 0,
  b.baseStyle ?? -1, b.baseTop ?? 0, b.ring?.length ?? 0];
const listed = (boxes: readonly FarBox[]) => boxes.map(measures).sort((a, b) => {
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > .01) return a[i] - b[i];
  return 0;
});
/** A camera far enough for the far form. */
function lookFromAfar(area: Area) {
  const camera = new PerspectiveCamera();
  camera.position.set((area.bounds.minX + area.bounds.maxX) / 2, 20_000, area.bounds.maxZ);
  expect(20_000).toBeGreaterThan(FAR_GROUND_M);
  area.update(0, camera);
}
function expectSame(later: Area, now: Area) {
  expect(later.farBoxes.length).toBe(now.farBoxes.length);
  const a = listed(later.farBoxes), b = listed(now.farBoxes);
  const differ = a.flatMap((box, i) => box.some((v, k) => Math.abs(v - b[i][k]) > .01) ? [{ later: box, now: b[i] }] : []);
  expect(differ).toEqual([]);
  expect(far(later)!.geometry.getAttribute('position').count).toBe(far(now)!.geometry.getAttribute('position').count);
}

it.skipIf(!staged)('draws the buildings as they are until buildFar, then the same far form', async () => {
  const now = board(false), later = board(true);
  expect(now.farBoxes.length).toBeGreaterThan(100);
  expect(later.buildingFragment).toBeDefined();
  expect(far(now)).toBeDefined();

  expect(far(later)).toBeUndefined();
  expect(later.farBoxes.length).toBeLessThan(now.farBoxes.length / 2);
  lookFromAfar(later);
  expect(buildings(later).every(o => o.visible)).toBe(true);

  let frames = 0;
  const built = later.buildFar().then(() => frames);
  const count = () => { frames++; if (!far(later)) void turn().then(count); };
  count();
  // Spread over frames, not one task.
  expect(await built).toBeGreaterThan(1);
  expectSame(later, now);
  lookFromAfar(later); lookFromAfar(now);
  expect(far(later)!.visible).toBe(true);
  // The same buildings give way to the boxes (some landmarks keep their own form at any distance).
  const shown = (area: Area) => [...buildings(area), area.buildingFragment!].map(o => `${o.name}:${o.visible}`);
  expect(shown(later)).toEqual(shown(now));
  expect(buildings(later).some(o => !o.visible)).toBe(true);
  later.group.clear(); now.group.clear();
}, 120_000);

it.skipIf(!staged)('grounds on a cut made while the far form is building', async () => {
  const now = board(false), later = board(true);
  // A 12 m deep cut under the biggest far box.
  const under = [...now.farBoxes].sort((a, b) => b.hx * b.hz - a.hx * a.hz)[0];
  const floor = now.terrainAt(under.cx, under.cz)! - 12;
  const cut: GroundYield = { ring: [[under.cx - 20, under.cz - 20], [under.cx + 20, under.cz - 20], [under.cx + 20, under.cz + 20], [under.cx - 20, under.cz + 20]], floor: () => floor };
  const built = later.buildFar();
  await turn(); await turn(); await turn();
  expect(far(later)).toBeUndefined();
  later.carve([cut]);
  now.carve([cut]);
  await built;
  expect(Math.min(...later.farBoxes.map(b => b.y0))).toBeCloseTo(Math.min(...now.farBoxes.map(b => b.y0)), 1);
  expect(later.farBoxes.length).toBe(now.farBoxes.length);
}, 120_000);

it.skipIf(!staged)('has nothing to build when the far form came with the board', async () => {
  const now = board(false), mesh = far(now);
  await now.buildFar();
  expect(far(now)).toBe(mesh);
}, 120_000);
