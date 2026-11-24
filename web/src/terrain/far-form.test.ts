import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { afterEach, expect, it } from 'vitest';
import { northConnectorGround, northConnectorTransport } from '../square-board/connector-ground';
import { southConnectorTransport } from '../square-board/south-connector-decks';
import { cityRoadHeight } from '../city/road-height';
import { bridgeApproaches } from './bridge-approaches';
import { FAR_BAND, FAR_M, farForms, farState, orderForFar, setFarOrdering, updateFarForms } from './far-form';
import { GroundGrid } from './grid';
import { junctionPortals } from './junction-decks';
import { streetPortals } from './street-bridges';
import { GroundSurface } from './surface';
import { createSurfaceTransport } from './transport';
import type { TerrainCity } from './transport-data';

afterEach(() => setFarOrdering(true));

it('switches each mesh once across the band, without thrashing at the threshold', () => {
  const range = FAR_M.low;
  let far = false, flips = 0;
  // Orbit at exactly the threshold with ±5 m of jitter: never crosses ±10 %.
  for (let i = 0; i < 1000; i++) {
    const next = farState(range + 5 * Math.sin(i), far, range);
    if (next !== far) flips++;
    far = next;
  }
  expect(flips).toBe(0);
  expect(farState(range * (1 + FAR_BAND) + 1, false, range)).toBe(true);
  expect(farState(range * (1 - FAR_BAND) + 1, true, range)).toBe(true);
  expect(farState(range * (1 - FAR_BAND) - 1, true, range)).toBe(false);
});

it('keeps the far triangles as an ordered prefix and every triangle exactly once', () => {
  const pos: number[] = [];
  for (let t = 0; t < 10; t++) pos.push(t, 0, 0, t, 1, 0, t, 0, 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const { keep, newOfOld } = orderForFar(g, (t) => t % 3 === 0);
  expect(keep).toBe(6 * 3);
  const xs = Array.from({ length: 10 }, (_, t) => g.getAttribute('position').getX(t * 3));
  expect(xs).toEqual([1, 2, 4, 5, 7, 8, 0, 3, 6, 9]);
  for (let t = 0; t < 10; t++) expect(g.getAttribute('position').getX(newOfOld[t] * 3)).toBe(t);
});

const src = new URL('../../../pipeline/prototypes/square-board/', import.meta.url);
const json = (u: URL) => JSON.parse(readFileSync(u, 'utf8'));
function build(name: 'north-band' | 'south-band') {
  const d = new URL(name + '/', src);
  const manifest = json(new URL('ground.json', d)), bytes = Uint8Array.from(readFileSync(new URL('ground.i16', d))).buffer;
  const grid = name === 'north-band' ? northConnectorGround(manifest, bytes) : new GroundGrid(manifest, bytes);
  const context = json(new URL('context.json', d));
  const city: TerrainCity = name === 'north-band' ? northConnectorTransport(context) : southConnectorTransport(context);
  const surface = new GroundSurface(grid, 'low'), bare = surface.sampleScene.bind(surface);
  const approach = bridgeApproaches([...streetPortals(city), ...junctionPortals(city)], manifest.vertical.sceneZeroNavd88M, bare, city.bounds, city.roads);
  const transport = createSurfaceTransport(city, grid, approach.groundAt);
  return { city, surface, approach, transport, height: cityRoadHeight(city, approach.groundAt, transport.deckAt) };
}

for (const name of ['north-band', 'south-band'] as const)
  it('answers deckAt, roadHeight and sampleScene identically with the far order on ' + name, () => {
    setFarOrdering(false);
    const before = build(name);
    setFarOrdering(true);
    const after = build(name);
    let compared = 0;
    for (const run of after.city.terrainTransport!.roads) {
      const twin = before.city.terrainTransport!.roads[after.city.terrainTransport!.roads.indexOf(run)];
      for (const [x, z] of run.pts) for (const [dx, dz] of [[0, 0], [0.7, -0.4], [-1.3, 0.9]]) {
        const a = before.transport.deckAt(x + dx, z + dz, twin), b = after.transport.deckAt(x + dx, z + dz, run);
        expect(b).toBe(a);
        if (a !== null) compared++;
      }
    }
    const { minX, maxX, minZ, maxZ } = after.city.bounds;
    for (let x = minX + 3; x < maxX; x += 23) for (let z = minZ + 3; z < maxZ; z += 19) {
      expect(after.surface.sampleScene(x, z)).toBe(before.surface.sampleScene(x, z));
      for (const road of after.city.roads.slice(0, 40)) {
        const twin = before.city.roads[after.city.roads.indexOf(road)];
        expect(after.height(x, z, road)).toBe(before.height(x, z, twin));
      }
    }
    expect(compared).toBeGreaterThan(100);
    // The structures mesh is registered with a smaller far prefix.
    const decks = after.transport.group.getObjectByName('Decks and embedded rails') as THREE.Mesh;
    const form = farForms().find((f) => f.mesh === decks)!;
    expect(form.keep).toBeLessThan(decks.geometry.getAttribute('position').count);
    expect(form.keep).toBeGreaterThan(0);
    // Near: full draw. Far: the prefix.
    after.transport.group.updateMatrixWorld(true);
    const away = new THREE.Vector3(1e5, 1e4, 1e5);
    new THREE.Group().add(after.transport.group);
    updateFarForms(away, 'low', 0);
    expect(decks.geometry.drawRange.count).toBe(form.keep);
    updateFarForms(new THREE.Vector3(...form.box!.getCenter(new THREE.Vector3()).toArray()), 'low', 0);
    expect(decks.geometry.drawRange.count).toBe(Infinity);
    for (const t of [before, after]) { t.transport.dispose(); t.approach.geometry.dispose(); t.approach.walls.dispose(); t.surface.geometry.dispose(); }
  });
