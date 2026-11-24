import * as THREE from 'three';
import { afterEach, expect, test } from 'vitest';
import type { TerrainCity } from '../terrain/transport-data';
import type { P2 } from '../vignette/geom';
import type { VBuilding } from '../vignette/world';
import { residential } from './residential';
import { HouseBlock, PREBUILD_M, SWITCH_M, TILE_M, compactFar, houseLod, houseNearForTests, houseNearStats, takeHouseLodChange } from './house-lod';

afterEach(() => { houseNearForTests.setNextFrame(undefined); houseNearForTests.setClock(undefined); });

const rect = (x: number, z: number, w: number, d: number): P2[] => [[x, z], [x + w, z], [x + w, z + d], [x, z + d]];
// Two streets of houses 1.7 km apart, so they fall in different tiles.
function street(x0: number, n: number): VBuilding[] {
  return Array.from({ length: n }, (_, i) => ({ id: `h${x0}-${i}`, cls: 'house', h: null, floors: null, rings: [rect(x0 + i * 16, 0, 11, 9)] }));
}
const buildings = [...street(0, 40), ...street(1700, 12)];
const city = { bounds: { minX: -100, maxX: 2000, minZ: -100, maxZ: 100 }, buildings,
  roads: [{ cls: 'residential', name: 'Lab St', bridge: false, tunnel: false, pts: [[-100, 20], [2000, 20]] }], rail: [] } as unknown as TerrainCity;
const tris = (o: THREE.Object3D) => { let n = 0; o.traverse(m => { if (m instanceof THREE.Mesh) n += m.geometry.getAttribute('position').count / 3; }); return n; };

function make(force?: 'near' | 'far') {
  const homes = residential(city, undefined, () => 0, () => 0, 'low');
  return houseLod({ houses: homes.city.buildings.filter(b => homes.isHouse(b.id)), bounds: city.bounds, ground: () => 0,
    foundation: () => 0, near: homes.finishFor, far: homes.farFinishFor, roofUnits: 3, force });
}

test('a far house is a fraction of a near one', () => {
  const near = make('near'), far = make('far');
  const perNear = tris(near.group) / buildings.length, perFar = tris(far.group) / buildings.length;
  console.log(`house triangles: near ${perNear.toFixed(0)}, far ${perFar.toFixed(0)}`);
  expect(perFar).toBeLessThan(perNear / 3);
  near.dispose(); far.dispose();
});

test('builds only far houses until a camera comes within range of a tile, then the near version there alone, in the background', async () => {
  const lod = make();
  expect(lod.tiles).toHaveLength(2);
  expect(lod.tiles.every(t => !t.nearWorld)).toBe(true);
  const camera = new THREE.PerspectiveCamera();
  // Far from both tiles: nothing near is built.
  camera.position.set(900, 3000, 0); camera.updateMatrixWorld();
  lod.group.updateMatrixWorld(true);
  takeHouseLodChange();
  for (const t of lod.tiles) t.update(camera);
  await houseNearForTests.done();
  expect(lod.tiles.every(t => !t.nearWorld)).toBe(true);
  // Over the first street: update() builds nothing itself and the far version stays up...
  camera.position.set(90, 150, 0); camera.updateMatrixWorld();
  for (const t of lod.tiles) t.update(camera);
  expect(lod.tiles.map(t => !!t.nearWorld)).toEqual([false, false]);
  expect(lod.tiles[0].farWorld.group.visible).toBe(true);
  expect(takeHouseLodChange()).toBe(false);
  // ...until the queued build finishes; only that tile builds, and the next update shows it.
  await houseNearForTests.done();
  expect(lod.tiles.map(t => !!t.nearWorld)).toEqual([true, false]);
  for (const t of lod.tiles) t.update(camera);
  expect(lod.tiles[0].near.visible).toBe(true);
  expect(lod.tiles[0].farWorld.group.visible).toBe(false);
  expect(takeHouseLodChange()).toBe(true);
  expect(SWITCH_M).toBeGreaterThanOrEqual(TILE_M);
  lod.dispose();
});

test('starts a near build before the switch, measured to the nearest house, and clips new near houses like the far ones', async () => {
  const lod = make();
  const camera = new THREE.PerspectiveCamera();
  const plane = new THREE.Plane(new THREE.Vector3(1, 0, 0), 0);
  lod.tiles.forEach(t => t.farWorld.group.traverse(m => { if (m instanceof THREE.Mesh) (m.material as THREE.Material).clippingPlanes = [plane]; }));
  // 1.3 km from the end of the first street (about 1.6 km from its middle): past the switch, so
  // it still draws far, but inside PREBUILD_M of its nearest house, so its near version builds.
  camera.position.set(-1300, 0, 0); camera.updateMatrixWorld();
  lod.tiles[0].update(camera);
  await houseNearForTests.done();
  expect(lod.tiles[0].nearWorld).not.toBeNull();
  expect(lod.tiles[0].isNear).toBe(false);
  lod.tiles[0].nearWorld!.group.traverse(m => { if (m instanceof THREE.Mesh) expect((m.material as THREE.Material).clippingPlanes).toEqual([plane]); });
  // Inside the switch it swaps at once: the near version is already there.
  camera.position.set(-850, 0, 0); camera.updateMatrixWorld();
  lod.tiles[0].update(camera);
  expect(lod.tiles[0].isNear).toBe(true);
  lod.dispose();
});

test('builds queued tiles nearest first, a few ms a frame, and drops a build whose tile leaves range', async () => {
  const frames: (() => void)[] = [];
  const step = async () => { frames.shift()?.(); for (let i = 0; i < 20; i++) await Promise.resolve(); };
  houseNearForTests.setNextFrame(() => new Promise<void>(r => frames.push(r)));
  // Every clock read is a millisecond later: a 3 ms budget is two steps a frame.
  let t = 0;
  houseNearForTests.setClock(() => t++);
  const lod = make();
  const camera = new THREE.PerspectiveCamera();
  // Both tiles in range, the second (12 houses at x 1700) nearer than the first (ends at x 635).
  camera.position.set(1500, 0, 0); camera.updateMatrixWorld();
  expect(1500 - 635).toBeLessThan(PREBUILD_M);
  for (const t of lod.tiles) t.update(camera);
  const before = { ...houseNearStats };
  const order: number[] = [];
  for (let f = 0; f < 2000 && order.length < 2; f++) {
    await step();
    lod.tiles.forEach((t, i) => { if (t.nearWorld && !order.includes(i)) order.push(i); });
  }
  expect(order).toEqual([1, 0]);
  // Spread over frames, not one task.
  expect(houseNearStats.frames - before.frames).toBeGreaterThan(2);
  lod.dispose();
  // A fresh set: the camera comes into range, then leaves before the build finishes.
  const fresh = make();
  camera.position.set(90, 150, 0); camera.updateMatrixWorld();
  fresh.tiles[0].update(camera);
  await step(); await step();
  camera.position.set(90, 9000, 0); camera.updateMatrixWorld();
  fresh.tiles[0].update(camera);
  for (let f = 0; f < 200 && frames.length; f++) await step();
  await houseNearForTests.done();
  expect(fresh.tiles[0].nearWorld).toBeNull();
  fresh.dispose();
});

test('draws a block of far tiles as one mesh, and each tile on its own once one comes near', async () => {
  const lod = make();
  const blocks = lod.group.children.filter((c): c is HouseBlock => c instanceof HouseBlock);
  expect(blocks).toHaveLength(1);
  const [b] = blocks;
  const camera = new THREE.PerspectiveCamera();
  const drawn = () => { const out: THREE.Mesh[] = []; lod.group.traverseVisible(m => { if (m instanceof THREE.Mesh) out.push(m); }); return out; };
  camera.position.set(900, 3000, 0); camera.updateMatrixWorld();
  lod.group.updateMatrixWorld(true);
  takeHouseLodChange();
  b.update(camera);
  expect(drawn()).toEqual([b.merged]);
  expect(b.merged.userData.building).toBe(true);
  // The tiles' far meshes are ranges of the block's buffer.
  const ranges = lod.tiles.map(t => (t.farWorld.group.children[0] as THREE.Mesh).geometry);
  expect(ranges.every(g => g.attributes.position === b.merged.geometry.attributes.position)).toBe(true);
  expect(ranges.reduce((n, g) => n + g.drawRange.count, 0)).toBe(b.merged.geometry.drawRange.count);
  camera.position.set(90, 150, 0); camera.updateMatrixWorld();
  b.update(camera);
  await houseNearForTests.done();
  takeHouseLodChange();
  b.update(camera);
  expect(b.merged.visible).toBe(false);
  expect(lod.tiles[0].near.visible).toBe(true);
  expect(lod.tiles[1].farWorld.group.visible).toBe(true);
  lod.dispose();
});

test('stores far houses as bytes, within a byte step of the floats', () => {
  const far = make('far');
  far.group.traverse(o => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (m as THREE.InstancedMesh).isInstancedMesh) return;
    expect(m.geometry.getAttribute('color').array).toBeInstanceOf(Uint8Array);
    expect(m.geometry.getAttribute('normal').array).toBeInstanceOf(Int8Array);
    expect(m.geometry.getAttribute('aStyle').array).toBeInstanceOf(Int8Array);
  });
  far.dispose();
  // compactFar on known floats: colours and normals within one byte step, style ids exact.
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute([.0031, .5, 1, .2, .7, .9, 0, .33, .66], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, .6, .8, 0, -.7071, 0, .7071], 3));
  g.setAttribute('aStyle', new THREE.Float32BufferAttribute([-2, 0, 5], 1));
  const group = new THREE.Group();
  group.add(new THREE.Mesh(g));
  const floats = { color: [...g.getAttribute('color').array], normal: [...g.getAttribute('normal').array] };
  compactFar({ group } as unknown as Parameters<typeof compactFar>[0]);
  const col = g.getAttribute('color'), nor = g.getAttribute('normal');
  floats.color.forEach((v, i) => expect(Math.abs((col.array[i] as number) / 255 - v)).toBeLessThanOrEqual(.5 / 255 + 1e-9));
  floats.normal.forEach((v, i) => expect(Math.abs((nor.array[i] as number) / 127 - v)).toBeLessThanOrEqual(.5 / 127 + 1e-9));
  expect([...g.getAttribute('aStyle').array]).toEqual([-2, 0, 5]);
});

test('stops far houses casting shadows past a long orbit, and starts again', () => {
  const lod = make('far');
  const casters = () => { let n = 0; lod.group.traverse(m => { if ((m as THREE.Mesh).isMesh && m.castShadow) n++; }); return n; };
  const all = casters();
  expect(all).toBeGreaterThan(0);
  lod.setDetail({ houseShadows: false });
  expect(casters()).toBe(0);
  lod.setDetail({ houseShadows: true });
  expect(casters()).toBe(all);
  lod.dispose();
});

test('draws every house past the very-far orbit as one outward-facing box, in one mesh', () => {
  const homes = residential(city, undefined, () => 0, () => 0, 'low');
  const houses = homes.city.buildings.filter(b => homes.isHouse(b.id));
  const lod = houseLod({ houses, bounds: city.bounds, ground: () => 0, foundation: () => 0, near: homes.finishFor, far: homes.farFinishFor,
    roofUnits: 3, box: b => homes.boxOf(b.id) });
  const farFar = lod.group.getObjectByName('houses (far-far)') as THREE.Mesh;
  expect(farFar).toBeDefined();
  expect(farFar.visible).toBe(false);
  // Ten triangles a house.
  expect(farFar.geometry.getAttribute('position').count / 3).toBe(houses.length * 10);
  // Every face's normal points away from its own house's centre (walls) or up (tops).
  const p = farFar.geometry.getAttribute('position'), n = farFar.geometry.getAttribute('normal');
  for (let f = 0; f < p.count / 3; f++) {
    // Normalized attribute: getX/getY/getZ already return −1…1.
    const i = f * 3, ny = n.getY(i);
    if (ny > .9) continue;
    const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
    // The face's own house: the nearest box centre.
    const [hx, hz] = houses.map(h => homes.boxOf(h.id)!.centre).reduce((a, q) => Math.hypot(q[0] - cx, q[1] - cz) < Math.hypot(a[0] - cx, a[1] - cz) ? q : a);
    expect(n.getX(i) * (cx - hx) + n.getZ(i) * (cz - hz)).toBeGreaterThan(0);
  }
  lod.setDetail({ farHouses: true });
  expect(farFar.visible).toBe(true);
  expect(lod.group.children.filter(c => c !== farFar).every(c => !c.visible)).toBe(true);
  lod.setDetail({ farHouses: false });
  expect(farFar.visible).toBe(false);
  lod.dispose();
});

test('raises a far-far box to a hillside house fitted floor', () => {
  const homes = residential(city, undefined, () => 0, () => 0, 'low');
  const houses = homes.city.buildings.filter(b => homes.isHouse(b.id)).map((b, i) => i === 0 ? { ...b, floorY: 4 } : b);
  const lod = houseLod({ houses, bounds: city.bounds, ground: () => 0, foundation: () => 0, near: homes.finishFor, far: homes.farFinishFor,
    roofUnits: 3, box: b => homes.boxOf(b.id) });
  const g = (lod.group.getObjectByName('houses (far-far)') as THREE.Mesh).geometry.getAttribute('position');
  // The first house's ten triangles: its walls still start at the foundation (0) and its top
  // sits on the fitted floor plus the box height.
  const ys = Array.from({ length: 30 }, (_, i) => g.getY(i));
  expect(Math.min(...ys)).toBe(0);
  expect(Math.max(...ys)).toBeCloseTo(4 + homes.boxOf(houses[0].id)!.height);
  lod.dispose();
});

test('keeps a forced house version at every distance (no far-far form)', () => {
  const homes = residential(city, undefined, () => 0, () => 0, 'low');
  const lod = houseLod({ houses: homes.city.buildings.filter(b => homes.isHouse(b.id)), bounds: city.bounds, ground: () => 0, foundation: () => 0,
    near: homes.finishFor, far: homes.farFinishFor, roofUnits: 3, box: b => homes.boxOf(b.id), force: 'far' });
  expect(lod.group.getObjectByName('houses (far-far)')).toBeUndefined();
  lod.setDetail({ farHouses: true });
  expect(lod.group.children.every(c => c.visible)).toBe(true);
  lod.dispose();
});

test('exports one far box per house for the far-board mesh, matching the far-far boxes', () => {
  const homes = residential(city, undefined, () => 0, () => 0, 'low');
  const houses = homes.city.buildings.filter(b => homes.isHouse(b.id));
  const lod = houseLod({ houses, bounds: city.bounds, ground: () => 0, foundation: () => 0, near: homes.finishFor, far: homes.farFinishFor,
    roofUnits: 3, box: b => homes.boxOf(b.id) });
  expect(lod.boxes).toHaveLength(houses.length);
  const p = (lod.group.getObjectByName('houses (far-far)') as THREE.Mesh).geometry.getAttribute('position');
  lod.boxes.forEach((b, i) => {
    const src = homes.boxOf(houses.find(h => homes.boxOf(h.id)!.centre[0] === b.cx && homes.boxOf(h.id)!.centre[1] === b.cz)!.id)!;
    expect([b.hx, b.hz, b.y1 - b.y0]).toEqual([src.long, src.half, src.height]);
    expect(Math.hypot(b.ux, b.uz)).toBeCloseTo(1);
    // Every vertex of the house's ten triangles lies inside its exported box.
    for (let v = i * 30; v < i * 30 + 30; v++) {
      const dx = p.getX(v) - b.cx, dz = p.getZ(v) - b.cz;
      expect(Math.abs(dx * b.ux + dz * b.uz)).toBeLessThanOrEqual(b.hx + 1e-3);
      expect(Math.abs(-dx * b.uz + dz * b.ux)).toBeLessThanOrEqual(b.hz + 1e-3);
    }
  });
  // Colours are linear 0–1 floats, the roof apart from the walls.
  expect(lod.boxes.every(b => [b.r, b.g, b.b, b.roof.r, b.roof.g, b.roof.b].every(c => c >= 0 && c <= 1))).toBe(true);
  lod.dispose();
});

test('exports no far boxes without a box source (the high tier)', () => {
  const homes = residential(city, undefined, () => 0, () => 0, 'low');
  const lod = houseLod({ houses: homes.city.buildings.filter(b => homes.isHouse(b.id)), bounds: city.bounds, ground: () => 0, foundation: () => 0,
    near: homes.finishFor, far: homes.farFinishFor, roofUnits: 3 });
  expect(lod.boxes).toEqual([]);
  lod.dispose();
});
