import { AdditiveBlending, Box3, Mesh, MeshBasicMaterial, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { GroundGrid } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import type { VBuilding } from '../vignette/world';
import { createSkylineLandmark } from './midtown-skyline';

const row = JSON.parse(readFileSync(new URL('../../../pipeline/prototypes/square-board/midtown-upper/context.json', import.meta.url), 'utf8'));
const tower: VBuilding = row.buildings.find((b: VBuilding) => b.id === 'osm:way:39450314');

it('keeps generic scenery when the upper Midtown footprint or grade is incomplete', () => {
  expect(createSkylineLandmark([tower], tower, null, () => 0)).toBeNull();
  expect(createSkylineLandmark([tower], tower, 0, () => null)).toBeNull();
  const clipped = { ...tower, rings: [tower.rings[0].slice(0, 6)] };
  expect(createSkylineLandmark([clipped], clipped, 0, () => 0)).toBeNull();
});

it('mounts the 250 m landmark on terrain and suppresses the generic roof', () => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  const bounds = { minX: 350, maxX: 430, minZ: -3730, maxZ: -3650 };
  const grid = new GroundGrid({ version: 1, rows: 17, cols: 17, stepM: 5, bounds, scaleM: .1,
    offsetM: 0, encoding: 'signed int16 little-endian', noData: -32768,
    vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 }, sha256: '' }, new Int16Array(17 * 17).fill(2820).buffer);
  const area = createDowntownTerrain(grid, { bounds, buildings: [tower], roads: [], rail: [] }, [], { quality: 'low' });
  try {
    const model = area.scenery.getObjectByName('One Atlantic Center')!;
    expect(new Box3().setFromObject(model).max.y).toBeCloseTo(232);
    area.group.updateMatrixWorld(true);
    const ray = new Raycaster(new Vector3(390, 500, -3690), new Vector3(0,-1,0));
    expect(ray.intersectObjects(area.scenery.children.filter(child => child !== model))).toHaveLength(0);
    area.setNight(1);
    expect(((model.children[1] as Mesh).material as MeshLambertMaterial).emissiveIntensity).toBeGreaterThan(0);
    // The shaft wears the shared Johnson/Burgee granite atlas, lit at night.
    const shaft = (model.getObjectByName('One Atlantic shaft') as Mesh).material as MeshLambertMaterial;
    expect(shaft.map).not.toBeNull();
    expect(shaft.emissiveIntensity).toBeGreaterThan(0);
    const strips = (model.getObjectByName('One Atlantic shaft') as Mesh).geometry;
    expect(strips.getAttribute('uv').count).toBe(strips.getAttribute('position').count);
    // Four faces x three zones, each on its own atlas bays: u spans the whole atlas once.
    const us = Array.from(strips.getAttribute('uv').array).filter((_, i) => i % 2 === 0);
    expect(Math.min(...us)).toBe(0);
    expect(Math.max(...us)).toBeCloseTo(1);
    const stone = (model.children[0] as Mesh).material as MeshLambertMaterial;
    for (const material of [shaft, stone]) expect(material.customProgramCacheKey()).toBe('one-atlantic-ashlar');
  } finally {
    area.dispose();
    vi.unstubAllGlobals();
  }
});

it.each([
  ['osm:way:885660351','1180 Peachtree',200],
  ['osm:way:269636921','Promenade Central',36.2],
  ['osm:way:269637575','Promenade Tower',211],
] as const)('replaces %s at the measured local grade', (id, name, height) => {
  const building: VBuilding = row.buildings.find((b: VBuilding) => b.id === id);
  const model = createSkylineLandmark([building,tower], building, -8, () => -3)!;
  expect(model.group.name).toBe(name);
  expect(model.buildings).toEqual([tower]);
  expect(new Box3().setFromObject(model.group).max.y).toBeCloseTo(height-3);
});

it('keeps the historic Georgian Terrace lower than its mapped rear addition', () => {
  const south = JSON.parse(readFileSync(new URL('../../../pipeline/prototypes/square-board/midtown-south/context.json', import.meta.url), 'utf8'));
  const hotel: VBuilding = south.buildings.find((b: VBuilding) => b.id === 'osm:way:886041064');
  const model = createSkylineLandmark([hotel], hotel, -5, () => 0)!;
  model.group.updateMatrixWorld(true);
  const heightAt = (x: number,z: number) => new Raycaster(new Vector3(x,150,z),new Vector3(0,-1,0)).intersectObject(model.group)[0].point.y;
  expect(heightAt(642,-2070)).toBeCloseTo(38); // parapet above the crowning cornice
  expect(heightAt(701,-2108)).toBeCloseTo(68);
  // Mapped three-storey podium east of the addition, and the raised Peachtree terrace.
  expect(heightAt(712.5,-2110)).toBeGreaterThan(11);
  expect(heightAt(712.5,-2110)).toBeLessThan(13);
  expect(heightAt(635,-2060)).toBeCloseTo(1.35);
});

it('raises the Georgian Terrace deck to the Peachtree grade', () => {
  const south = JSON.parse(readFileSync(new URL('../../../pipeline/prototypes/square-board/midtown-south/context.json', import.meta.url), 'utf8'));
  const hotel: VBuilding = south.buildings.find((b: VBuilding) => b.id === 'osm:way:886041064');
  // Ground rises 2.5 m from the site centre to the Peachtree sidewalk.
  const model = createSkylineLandmark([hotel], hotel, -5, (x) => x < 640 ? 2.5 : 0)!;
  model.group.updateMatrixWorld(true);
  const hit = new Raycaster(new Vector3(635,150,-2060),new Vector3(0,-1,0)).intersectObject(model.group)[0];
  expect(hit.point.y).toBeCloseTo(2.8);
});

it('lights the Promenade crown cool white at night and keeps its offices warm', () => {
  const building: VBuilding = row.buildings.find((b: VBuilding) => b.id === 'osm:way:269637575');
  const model = createSkylineLandmark([building], building, -8, () => -3)!;
  const neon = model.group.getObjectByName('Promenade crown neon') as Mesh;
  const offices = (model.group.children[1] as Mesh).material as MeshLambertMaterial;
  expect(neon.visible).toBe(false);
  model.setNight(1);
  expect(neon.visible).toBe(true);
  const colour = neon.geometry.getAttribute('color');
  // Blue at least matches red on every neon vertex: cool white, not amber.
  for (let i = 0; i < colour.count; i++) expect(colour.getZ(i)).toBeGreaterThanOrEqual(colour.getX(i));
  expect(offices.emissive.r).toBeGreaterThan(offices.emissive.b);
  // Additive, so twilight fades the neon in instead of drawing dark lines.
  const glow = neon.material as MeshBasicMaterial;
  expect(glow.blending).toBe(AdditiveBlending);
  model.setNight(.1);
  expect(glow.color.r).toBeCloseTo(.1);
  model.setNight(0);
  expect(neon.visible).toBe(false);
});

it('mounts Tower Square at 206 m and feeds night lighting to its return walls', () => {
  const south = JSON.parse(readFileSync(new URL('../../../pipeline/prototypes/square-board/midtown-south/context.json', import.meta.url), 'utf8'));
  const office: VBuilding = south.buildings.find((b: VBuilding) => b.id === 'osm:way:26800371');
  const model = createSkylineLandmark([office],office,-3,() => -1)!;
  expect(new Box3().setFromObject(model.group).max.y).toBeCloseTo(205);
  const mesh = model.group.getObjectByName('Tower Square wash') as Mesh;
  const wash = mesh.material as MeshBasicMaterial;
  model.setNight(1);
  expect(wash.opacity).toBeGreaterThan(0);
  expect(mesh.visible).toBe(true);
  model.setNight(0);
  expect(wash.opacity).toBe(0);
  expect(mesh.visible).toBe(false);
  // Each storey's recess is backed 0.8 m behind the long south face, not a hollow shaft.
  model.group.updateMatrixWorld(true);
  const ray = new Raycaster(new Vector3(467.7, 12.5, -2200), new Vector3(0, 0, 1));
  expect(ray.intersectObject(model.group)[0].point.z).toBeLessThan(-2095.8 - 32);
});

it('draws 1180 Peachtree as one textured curtain wall with two curved, night-lit veils', () => {
  const building: VBuilding = row.buildings.find((b: VBuilding) => b.id === 'osm:way:885660351');
  const model = createSkylineLandmark([building], building, -8, () => -3)!;
  const wall = model.group.getObjectByName('1180 curtain wall') as Mesh;
  expect(wall.geometry.getAttribute('uv').count).toBe(wall.geometry.getAttribute('position').count);
  const veils = [0, 1].map(i => model.group.getObjectByName(`1180 veil ${i}`) as Mesh);
  // Each veil's top edge sits inward of its base: the tips lean towards each other.
  for (const veil of veils) {
    const p = veil.geometry.getAttribute('position');
    let low = { y: Infinity, z: 0 }, high = { y: -Infinity, z: 0 };
    for (let i = 0; i < p.count; i++) {
      if (p.getY(i) < low.y) low = { y: p.getY(i), z: p.getZ(i) };
      if (p.getY(i) > high.y) high = { y: p.getY(i), z: p.getZ(i) };
    }
    expect(Math.abs(high.z)).toBeLessThan(Math.abs(low.z) - 5);
  }
  model.setNight(1);
  expect((wall.material as MeshLambertMaterial).emissiveIntensity).toBeGreaterThan(0);
  expect((veils[0].material as MeshLambertMaterial).emissiveIntensity).toBeGreaterThan(0);
  // The crown lattice glows from inside and the leading-edge light line appears only at night.
  const lattice = model.group.getObjectByName('1180 crown lattice') as Mesh;
  expect((lattice.material as MeshLambertMaterial).emissiveIntensity).toBeGreaterThan(0);
  const edge = model.group.getObjectByName('1180 edge light') as Mesh;
  expect(edge.visible).toBe(true);
  model.setNight(0);
  expect(edge.visible).toBe(false);
});

it('replaces the Biltmore with its masts and night-lit BILTMORE letters', () => {
  const central = JSON.parse(readFileSync(new URL('../../../pipeline/prototypes/square-board/midtown-central/context.json', import.meta.url), 'utf8'));
  const hotel: VBuilding = central.buildings.find((b: VBuilding) => b.id === 'osm:way:886034013');
  const model = createSkylineLandmark([hotel], hotel, -5, () => 0)!;
  expect(model.group.name).toBe('Atlanta Biltmore');
  // Degenerate mast bars once produced NaN normals, which bloom turned into a black square at night.
  model.group.traverse(o => {
    if (!(o instanceof Mesh)) return;
    o.geometry.computeVertexNormals();
    expect(Array.from(o.geometry.getAttribute('normal').array).some(Number.isNaN), o.name).toBe(false);
  });
  // The masts rise 46 m above the 56 m main roof.
  expect(new Box3().setFromObject(model.group).max.y).toBeCloseTo(102, 0);
  const letters = model.group.getObjectByName('Biltmore letters') as Mesh;
  expect(letters.visible).toBe(false);
  model.setNight(1);
  expect(letters.visible).toBe(true);
});

it('replaces the Academy of Medicine with its portico temple and lantern', () => {
  const central = JSON.parse(readFileSync(new URL('../../../pipeline/prototypes/square-board/midtown-central/context.json', import.meta.url), 'utf8'));
  const academy: VBuilding = central.buildings.find((b: VBuilding) => b.id === 'osm:way:42725820');
  const model = createSkylineLandmark([academy], academy, -2, () => 0)!;
  expect(model.group.name).toBe('Academy of Medicine');
  expect(new Box3().setFromObject(model.group).max.y).toBeCloseTo(15.5, 0);
  model.group.traverse(o => {
    if (!(o instanceof Mesh)) return;
    o.geometry.computeVertexNormals();
    expect(Array.from(o.geometry.getAttribute('normal').array).some(Number.isNaN), o.name).toBe(false);
  });
});

it('replaces the Wimbish House with its slate roof, turret and loggia', () => {
  const house: VBuilding = row.buildings.find((b: VBuilding) => b.id === 'osm:way:885325356');
  const model = createSkylineLandmark([house], house, -2, () => 0)!;
  expect(model.group.name).toBe('Wimbish House');
  expect(new Box3().setFromObject(model.group).max.y).toBeCloseTo(20.5, 0);
  model.group.traverse(o => {
    if (!(o instanceof Mesh)) return;
    o.geometry.computeVertexNormals();
    expect(Array.from(o.geometry.getAttribute('normal').array).some(Number.isNaN), o.name).toBe(false);
  });
});

it('replaces the Ponce de Leon Apartments with belvedere towers over a curved front', () => {
  const south = JSON.parse(readFileSync(new URL('../../../pipeline/prototypes/square-board/midtown-south/context.json', import.meta.url), 'utf8'));
  const ponce: VBuilding = south.buildings.find((b: VBuilding) => b.id === 'osm:way:208355680');
  const model = createSkylineLandmark([ponce], ponce, -2, () => 0)!;
  expect(model.group.name).toBe('Ponce de Leon Apartments');
  expect(new Box3().setFromObject(model.group).max.y).toBeCloseTo(52.5, 0);
  model.group.traverse(o => {
    if (!(o instanceof Mesh)) return;
    o.geometry.computeVertexNormals();
    expect(Array.from(o.geometry.getAttribute('normal').array).some(Number.isNaN), o.name).toBe(false);
  });
});

it('replaces the Federal Reserve Bank with its stepped marble tower and forecourt', () => {
  const central = JSON.parse(readFileSync(new URL('../../../pipeline/prototypes/square-board/midtown-central/context.json', import.meta.url), 'utf8'));
  const fed: VBuilding = central.buildings.find((b: VBuilding) => b.id === 'osm:way:28979077');
  const model = createSkylineLandmark([fed], fed, -2, () => 0)!;
  expect(model.group.name).toBe('Federal Reserve Bank of Atlanta');
  model.group.updateMatrixWorld(true);
  const top = (x: number, z: number) => new Raycaster(new Vector3(x, 200, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y;
  // Lidar: the corner tower crown stands above the slab cornice and its recessed top floor.
  expect(top(588 + 54, -3155 + 24)).toBeCloseTo(61.9, 0);
  expect(top(588 + 24, -3155 - 50)).toBeCloseTo(47.5, 0);
  expect(top(588 + 45, -3155 - 20)).toBeCloseTo(53.7, 0);
  expect(top(588 - 60, -3155 + 30)).toBeCloseTo(14.2, 0);
  const crown = model.group.getObjectByName('Fed crown') as Mesh;
  model.setNight(1);
  expect((crown.material as MeshLambertMaterial).emissiveIntensity).toBeGreaterThan(0);
  model.group.traverse(o => {
    if (!(o instanceof Mesh)) return;
    o.geometry.computeVertexNormals();
    expect(Array.from(o.geometry.getAttribute('normal').array).some(Number.isNaN), o.name).toBe(false);
  });
});
