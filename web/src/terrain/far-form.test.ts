import { existsSync, readFileSync } from 'node:fs';
import * as THREE from 'three';
import { afterEach, expect, it } from 'vitest';
import { northConnectorGround, northConnectorTransport } from '../square-board/connector-ground';
import { southConnectorTransport } from '../square-board/south-connector-decks';
import { cityRoadHeight } from '../city/road-height';
import { bridgeApproaches } from './bridge-approaches';
import { FAR_BAND, FAR_M, farForms, farState, orderForFar, registerFar, setFarOrdering, updateFarForms } from './far-form';
import { GroundGrid } from './grid';
import { junctionPortals } from './junction-decks';
import { streetPortals } from './street-bridges';
import { GroundSurface } from './surface';
import { createSurfaceTransport } from './transport';
import type { TerrainCity } from './transport-data';
import { triangleHeight } from './tread-height';
import { Line } from '../vignette/geom';
import { turn } from '../testing/turn';

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

it('draws the far prefix in the shadow pass only, then restores the colour-pass range', () => {
  const pos: number[] = [];
  for (let t = 0; t < 4; t++) pos.push(t, 0, 0, t, 1, 0, t, 0, 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
  new THREE.Group().add(mesh);
  const { keep } = orderForFar(g, (t) => t >= 2);
  registerFar(mesh, keep, { shadow: 'low' });
  const near = new THREE.Vector3(0, 0, 0);
  const call = (hook: 'onBeforeShadow' | 'onAfterShadow') =>
    (mesh[hook] as (...a: unknown[]) => void)();
  updateFarForms(near, 'high', 0);
  call('onBeforeShadow');
  expect(g.drawRange.count).toBe(Infinity);
  call('onAfterShadow');
  updateFarForms(near, 'low', 0);
  call('onBeforeShadow');
  expect(g.drawRange.count).toBe(keep);
  call('onAfterShadow');
  expect(g.drawRange.count).toBe(Infinity);
  g.dispose();
});

// Release 8: the far prefix is also what the shadow pass draws (#514). Freight deck tops are
// in the freight mesh, which doesn't cast, so the deck undersides in the structures mesh were a
// freight viaduct's only horizontal shadow caster; dropping them striped the shadow under the
// downtown viaduct over the Connector (757,519). For every deck of any kind (road, freight,
// footbridge, inferred or surveyed), every sample under it must keep a horizontal caster in
// the shadow-pass prefix, on both tiers.
const vignette = new URL('../../public/data/scene/downtown/vignette.json', import.meta.url);
function boardFor(name: 'downtown' | 'north-band' | 'south-band') {
  if (name === 'downtown') {
    const g = new URL('../../../pipeline/prototypes/downtown-ground/', import.meta.url);
    return { grid: new GroundGrid(json(new URL('ground.json', g)), Uint8Array.from(readFileSync(new URL('ground.i16', g))).buffer), city: json(vignette) as TerrainCity };
  }
  const d = new URL(name + '/', src);
  const manifest = json(new URL('ground.json', d)), bytes = Uint8Array.from(readFileSync(new URL('ground.i16', d))).buffer;
  const context = json(new URL('context.json', d));
  return { grid: name === 'north-band' ? northConnectorGround(manifest, bytes) : new GroundGrid(manifest, bytes),
    city: name === 'north-band' ? northConnectorTransport(context) : southConnectorTransport(context) };
}
for (const quality of ['low', 'high'] as const)
  for (const name of ['downtown', 'north-band', 'south-band'] as const)
    it.skipIf(name === 'downtown' && !existsSync(vignette))(`keeps a shadow caster under every deck in the shadow-pass prefix on ${name} at ${quality}`, async () => {
      const { grid, city } = boardFor(name);
      const surface = new GroundSurface(grid, quality), bare = surface.sampleScene.bind(surface);
      const transport = createSurfaceTransport(city, grid, bare);
      const decks = transport.group.getObjectByName('Decks and embedded rails') as THREE.Mesh;
      const form = farForms().find((f) => f.mesh === decks)!;
      expect(form.shadow).toBe('always'); // drawn as the prefix in every shadow redraw
      const pos = decks.geometry.getAttribute('position') as THREE.BufferAttribute;
      let samples = 0, missing = 0, viaduct = false;
      for (const run of [...city.terrainTransport!.roads, ...city.terrainTransport!.rail]) {
        if (run.kind !== 'bridge' || run.cls === 'tram' || run.pts.length < 2) continue;
        const line = new Line(run.pts);
        await turn(); // a run per turn of the event loop (test-setup.ts)
        for (let s = 1; s < line.length - 1; s += 3) {
          const { x, z } = line.at(s);
          if (!triangleHeights(pos, x, z, 0, pos.count / 3).length) continue; // not drawn on this board
          samples++;
          if (Math.hypot(x - 757, z - 519) < 60) viaduct = true;
          if (!triangleHeights(pos, x, z, 0, form.keep / 3).length) missing++;
        }
      }
      if (name === 'downtown') expect(viaduct).toBe(true);
      expect(samples).toBeGreaterThan(50);
      expect(missing).toBe(0);
      transport.dispose(); surface.geometry.dispose();
    }, 120_000);

function triangleHeights(pos: THREE.BufferAttribute, x: number, z: number, from: number, to: number) {
  const out: number[] = [];
  for (let t = from; t < to; t++) {
    const h = triangleHeight(pos, t * 3, x, z);
    if (h !== null) out.push(h);
  }
  return out;
}
