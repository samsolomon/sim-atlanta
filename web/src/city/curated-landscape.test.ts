import { existsSync, readFileSync } from 'node:fs';
import { Mesh } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import curated from './fixtures/curated-landscape.json';
import { createCuratedLandscape } from './curated-landscape';
import { GroundGrid, type GroundManifest } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import type { TerrainCity } from '../terrain/transport-data';
import type { VBuilding } from '../vignette/world';

const scene = new URL('../../public/data/scene/downtown/', import.meta.url);
const proto = new URL('../../../pipeline/prototypes/downtown-ground/', import.meta.url);
const staged = existsSync(new URL('vignette.json', scene));
const id = curated[0].id;
afterEach(() => vi.unstubAllGlobals());

function positions(mesh: Mesh) {
  const p = mesh.geometry.getAttribute('position');
  return Array.from({ length: p.count }, (_, i) => [p.getX(i), p.getY(i), p.getZ(i)]);
}

it('replaces a curated footprint with a wall and a bed that follow a falling slope', () => {
  // Ground falls 6 m from z = -1051 (sidewalk) to z = -1037, like the surveyed site.
  const ground = (_x: number, z: number) => 306 - (z + 1051) * 6 / 14;
  const site = { id, h: 1.44, floors: null, rings: [[[-856.45, -1051.25], [-812.57, -1050.56], [-808.66, -1037.61], [-856.65, -1038.36]]] } as unknown as VBuilding;
  const other = { ...site, id: 'neighbour' };
  const result = createCuratedLandscape([site, other], site, null, ground)!;
  expect(result.buildings.map(b => b.id)).toEqual(['neighbour']);
  const points = positions(result.group.children[0] as Mesh);
  const bed = points.filter(([x, y, z]) => Math.abs(y - (ground(x, z) + .06)) < 1e-3);
  expect(bed.length).toBeGreaterThan(400);
  // The cap clears the sidewalk side by the parapet, and the face reaches the bed.
  const top = Math.max(...points.filter(([, , z]) => z < -1050).map(p => p[1]));
  expect(top).toBeGreaterThan(ground(0, -1051.3) + .3);
  expect(Math.min(...points.map(p => p[1]))).toBeLessThan(ground(0, -1049));
});

it.skipIf(!staged)('draws the curated terrace in place of the downtown building box', () => {
  const ctx: object = new Proxy(function () {}, { get: () => ctx, apply: () => ctx });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  const city = JSON.parse(readFileSync(new URL('vignette.json', scene), 'utf8')) as TerrainCity;
  // A new Overture release would otherwise bring the box back without a warning.
  for (const entry of curated) expect(city.buildings.some(b => b.id === entry.id), entry.id).toBe(true);
  const manifest: GroundManifest = JSON.parse(readFileSync(new URL('ground.json', proto), 'utf8'));
  const grid = new GroundGrid(manifest, Uint8Array.from(readFileSync(new URL('ground.i16', proto))).buffer);
  const area = createDowntownTerrain(grid, city, [], { quality: 'high' });
  try {
    const terrace = area.scenery.getObjectByName('curated:' + id)!;
    expect(terrace).toBeDefined();
    const bed = positions(terrace.children[0] as Mesh).filter(([x, y, z]) => {
      const g = area.groundAt(x, z);
      return g !== null && Math.abs(y - g - .06) < 1e-4;
    });
    expect(bed.length).toBeGreaterThan(400);
    // No generic building roof remains inside the footprint.
    const shell = area.scenery.children.find(o => o instanceof Mesh && o.geometry.hasAttribute('aBase')) as Mesh;
    const inside = positions(shell).filter(([x, , z]) => x > -850 && x < -815 && z > -1049 && z < -1040);
    expect(inside).toEqual([]);
  } finally { area.dispose(); }
});
