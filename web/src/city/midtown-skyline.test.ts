import { AdditiveBlending, Box3, Mesh, MeshBasicMaterial, MeshLambertMaterial, Raycaster, Vector3 } from 'three';
import { expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { GroundGrid } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import type { VBuilding } from '../vignette/world';
import { pointInRing } from '../vignette/geom';
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
  ['osm:way:269843469','Four Seasons Hotel',190],
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
  // Aimed between two storeys' panes, above the transfer beam, where only the backing stands.
  const ray = new Raycaster(new Vector3(467.7, 20.75, -2200), new Vector3(0, 0, 1));
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
      if (p.getY(i) < low.y) low = { y: p.getY(i), z: p.getZ(i) + veil.position.z };
      if (p.getY(i) > high.y) high = { y: p.getY(i), z: p.getZ(i) + veil.position.z };
    }
    expect(Math.abs(high.z)).toBeLessThan(Math.abs(low.z) - 5);
  }
  model.setNight(1);
  expect((wall.material as MeshLambertMaterial).emissiveIntensity).toBeGreaterThan(0);
  expect((veils[0].material as MeshLambertMaterial).emissiveIntensity).toBeGreaterThan(0);
  // Without veil depth, the post pass outlines background lattice through the wash.
  for (const veil of veils) {
    expect((veil.material as MeshLambertMaterial).depthWrite).toBe(true);
    expect((veil.material as MeshLambertMaterial).opacity).toBe(1);
  }
  // The crown lattice glows from inside and the leading-edge light line appears only at night.
  // The crown is a soft wash at night (Kendall/Heaton night skyline): no crown
  // material's emissive may saturate a channel, or it clips to a white slab.
  for (const name of ['1180 veil 0', '1180 veil 1', '1180 crown lattice', '1180 veil frames']) {
    const m = (model.group.getObjectByName(name) as Mesh).material as MeshLambertMaterial;
    expect(Math.max(m.emissive.r, m.emissive.g, m.emissive.b) * m.emissiveIntensity, name).toBeLessThan(name.startsWith('1180 veil ') && !name.endsWith('frames') ? .61 : .7);
  }
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

it('replaces 1100 Peachtree with its notched shaft, lit loggia and stepped pyramid at lidar heights', () => {
  const site: VBuilding = row.buildings.find((b: VBuilding) => b.id === 'osm:way:39450210');
  const model = createSkylineLandmark([site, tower], site, -2, () => 0)!;
  expect(model.group.name).toBe('1100 Peachtree');
  expect(model.buildings).toEqual([tower]);
  model.group.updateMatrixWorld(true);
  const top = (u: number, v: number) => {
    const x = 745.5 + (u - v) * Math.SQRT1_2, z = -3430.5 + (u + v) * Math.SQRT1_2;
    return new Raycaster(new Vector3(x, 300, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y;
  };
  // NAVD88 from 3DEP (2019) less the 297.1 m Peachtree sidewalk the flat test ground stands for.
  expect(top(0, 0)).toBeCloseTo(428.6 - 297.1, 0);
  expect(top(21, 0)).toBeCloseTo(409.8 - 297.1, 0);
  expect(top(-50, 0)).toBeCloseTo(308.6 - 297.1, 0);
  const [, lamps] = model.group.children as Mesh[];
  model.setNight(1);
  expect((lamps.material as MeshLambertMaterial).emissiveIntensity).toBeGreaterThan(0);
  // A landmark-class skin stays inside the 2,400-triangle body budget at low tier.
  const body = (model.group.children[0] as Mesh).geometry;
  expect(body.getAttribute('position').count / 3).toBeLessThanOrEqual(2400);
  model.group.traverse(o => {
    if (!(o instanceof Mesh)) return;
    o.geometry.computeVertexNormals();
    expect(Array.from(o.geometry.getAttribute('normal').array).some(Number.isNaN), o.name).toBe(false);
  });
});

it('steps the Four Seasons back to a pyramid and keeps its crown floors dark', () => {
  const building: VBuilding = row.buildings.find((b: VBuilding) => b.id === 'osm:way:269843469');
  const model = createSkylineLandmark([building], building, 0, () => 0)!;
  model.group.updateMatrixWorld(true);
  const heightAt = (x: number, z: number) => new Raycaster(new Vector3(x, 400, z), new Vector3(0, -1, 0))
    .intersectObject(model.group)[0]?.point.y ?? 0;
  expect(heightAt(577.4, -3601.9)).toBeCloseTo(190, 0); // pyramid apex, inside the 193 m lidar maximum
  expect(heightAt(577.4 + 20, -3601.9)).toBeLessThan(151); // outside the crown tiers
  expect(heightAt(577.4 + 22.5, -3601.9)).toBeLessThan(69); // the hotel base below the first setback
  expect(heightAt(577.4, -3560)).toBeCloseTo(16.8, 1); // south podium
  // Lit panes and floodlights share the lamp mesh: above the 150 m crown only gold, granite and
  // the attic windows' floodlit lattice may glow, never office or residence windows.
  const lamps = (model.group.children[1] as Mesh).geometry;
  const y = lamps.getAttribute('position'), colour = lamps.getAttribute('color');
  for (let i = 0; i < y.count; i++) if (y.getY(i) > 150) expect(colour.getX(i)).toBeGreaterThan(.5);
  const body = (model.group.children[0] as Mesh).geometry;
  // A landmark-class skin stays inside the 2,400-triangle body budget at low tier.
  expect(body.getAttribute('position').count / 3).toBeLessThanOrEqual(2400);
});

it('draws the Campanile as its present-day stripped frame at the lidar roof, unlit at night', () => {
  const site: VBuilding = row.buildings.find((b: VBuilding) => b.id === 'osm:way:269843407');
  const model = createSkylineLandmark([site, tower], site, -2, () => 0)!;
  expect(model.group.name).toBe('The Campanile');
  expect(model.buildings).toEqual([tower]);
  model.group.updateMatrixWorld(true);
  const box = new Box3().setFromObject(model.group);
  // 3DEP (April 2019): top slab 95.4 m over the site's ring grade; the hoist mast rises 4 m above it.
  expect(box.max.y).toBeCloseTo(95.4 + 4, 0);
  const top = new Raycaster(new Vector3(833, 300, -3571), new Vector3(0, -1, 0)).intersectObject(model.group)[0].point.y;
  expect(top).toBeCloseTo(95.4, 0);
  // A stalled construction site: no photographed lighting, so nothing glows (and no lamps mesh is
  // built at all: an empty one would still cost a draw).
  model.setNight(1);
  const glowing: string[] = [];
  model.group.traverse(o => {
    const m = (o as Mesh).material as MeshLambertMaterial | undefined;
    if ((o as Mesh).isMesh && m?.emissiveIntensity && m.emissive?.getHex()) glowing.push(o.name || o.type);
  });
  expect(glowing).toEqual([]);
  expect(model.group.children.filter(c => (c as Mesh).isMesh && !(c as Mesh).geometry.getAttribute('position')?.count)).toEqual([]);
  expect((model.group.children[0] as Mesh).geometry.getAttribute('position').count / 3).toBeLessThanOrEqual(2400);
});

it('stacks 1072 West Peachtree as podium, office block and glass tower, with a dark crown', () => {
  const building: VBuilding = row.buildings.find((b: VBuilding) => b.id === 'osm:way:1464967906');
  const model = createSkylineLandmark([building], building, 0, () => 0)!;
  expect(model.group.name).toBe('1072 West Peachtree');
  model.group.updateMatrixWorld(true);
  const heightAt = (u: number, v: number) => {
    const a = Math.atan2(.0153, 1), x = 308.3 + u * Math.cos(a) - v * Math.sin(a), z = -3351.2 + u * Math.sin(a) + v * Math.cos(a);
    return new Raycaster(new Vector3(x, 400, z), new Vector3(0, -1, 0)).intersectObject(model.group)[0]?.point.y ?? 0;
  };
  expect(heightAt(12, -18)).toBeCloseTo(228, 0); // the crown's raised middle, at the reported 749 ft
  expect(heightAt(12, -32)).toBeCloseTo(223.4, 0); // parapet shoulder
  expect(heightAt(-4, 10)).toBeCloseTo(72, 0); // office block, floors 11–18
  expect(heightAt(-20, 30)).toBeCloseTo(36, 0); // parking podium and Commons
  const [body, lamps] = (model.group.children as Mesh[]).map(m => m.geometry);
  // A landmark-class skin stays inside the 2,400-triangle body budget at low tier.
  expect(body.getAttribute('position').count / 3).toBeLessThanOrEqual(2400);
  // Nothing above the residential roof lights at night (the crown was unlit in August 2026).
  const y = lamps.getAttribute('position');
  for (let i = 0; i < y.count; i++) expect(y.getY(i)).toBeLessThan(219);
});

it('replaces Square on 5th at its lidar roof, with fins carrying the roof frame', () => {
  const south = JSON.parse(readFileSync(new URL('../../../pipeline/prototypes/square-board/midtown-central/context.json', import.meta.url), 'utf8'));
  const building: VBuilding = south.buildings.find((b: VBuilding) => b.id === 'osm:way:536884432');
  const model = createSkylineLandmark([building], building, 0, () => 0)!;
  expect(model.group.name).toBe('Square on 5th');
  model.group.updateMatrixWorld(true);
  const heightAt = (x: number, z: number) => new Raycaster(new Vector3(x, 300, z), new Vector3(0, -1, 0))
    .intersectObject(model.group)[0]?.point.y ?? 0;
  expect(heightAt(219.5, -2681.5)).toBeCloseTo(89.5, 0); // roof frame, the lidar maximum
  expect(heightAt(245, -2681.5)).toBeGreaterThan(87.5); // east penthouse above the 88 m roof
  expect(heightAt(195, -2681.5)).toBeCloseTo(88, 0); // the lidar 95th-percentile roof
  const [body, lamps] = (model.group.children as Mesh[]).map(m => m.geometry);
  expect(body.getAttribute('position').count / 3).toBeLessThanOrEqual(2400);
  const y = lamps.getAttribute('position');
  for (let i = 0; i < y.count; i++) expect(y.getY(i)).toBeLessThan(86);
});

it('gives Two Midtown Plaza its lidar roofs, a lit lobby drum and dark offices above', () => {
  const brookwood = JSON.parse(readFileSync(new URL('../../../pipeline/prototypes/square-board/brookwood-south/context.json', import.meta.url), 'utf8'));
  const building: VBuilding = brookwood.buildings.find((b: VBuilding) => b.id === 'osm:way:269636880');
  const model = createSkylineLandmark([building], building, 0, () => 0)!;
  expect(model.group.name).toBe('Two Midtown Plaza');
  model.group.updateMatrixWorld(true);
  const heightAt = (x: number, z: number) => new Raycaster(new Vector3(x, 300, z), new Vector3(0, -1, 0))
    .intersectObject(model.group)[0]?.point.y ?? 0;
  expect(heightAt(405, -4195)).toBeCloseTo(78, 0); // the straight slab, lidar 95th percentile
  expect(heightAt(375, -4190)).toBeCloseTo(73, 0); // the half-round end
  const [body, lamps] = (model.group.children as Mesh[]).map(m => m.geometry);
  expect(body.getAttribute('position').count / 3).toBeLessThanOrEqual(2400);
  const y = lamps.getAttribute('position');
  for (let i = 0; i < y.count; i++) expect(y.getY(i)).toBeLessThan(78);
});

it('crowns Mayfair Tower with four lit-lantern cones at the lidar heights', () => {
  const building: VBuilding = row.buildings.find((b: VBuilding) => b.id === 'osm:way:536728181');
  const model = createSkylineLandmark([building], building, 0, () => 0)!;
  expect(model.group.name).toBe('Mayfair Tower Condominiums');
  model.group.updateMatrixWorld(true);
  const heightAt = (x: number, z: number) => new Raycaster(new Vector3(x, 300, z), new Vector3(0, -1, 0))
    .intersectObject(model.group)[0]?.point.y ?? 0;
  expect(heightAt(1005.9 - 12, -3588.6)).toBeCloseTo(92, 0); // main roof, near the lidar median
  const cone = heightAt(988.1 + 5.7, -3606.6 + 5.7);
  expect(cone).toBeGreaterThan(100); // lantern finial, at the 102 m lidar maximum
  expect(cone).toBeLessThan(102.5);
  const meshes = model.group.children as Mesh[];
  expect(meshes[0].geometry.getAttribute('position').count / 3).toBeLessThanOrEqual(2400);
});

it('replaces Alexan on 8th at its lidar roof', () => {
  const central = JSON.parse(readFileSync(new URL('../../../pipeline/prototypes/square-board/midtown-central/context.json', import.meta.url), 'utf8'));
  const building: VBuilding = central.buildings.find((b: VBuilding) => b.id === 'osm:way:789975430');
  const model = createSkylineLandmark([building], building, 0, () => 0)!;
  expect(model.group.name).toBe('Alexan on 8th');
  model.group.updateMatrixWorld(true);
  const heightAt = (x: number, z: number) => new Raycaster(new Vector3(x, 300, z), new Vector3(0, -1, 0))
    .intersectObject(model.group)[0]?.point.y ?? 0;
  expect(heightAt(372, -2800)).toBeCloseTo(74.5, 0); // the slab, lidar 95th percentile
  expect(heightAt(350, -2830)).toBeCloseTo(74.5, 0); // the south-west leg is full height too
  const meshes = model.group.children as Mesh[];
  expect(meshes[0].geometry.getAttribute('position').count / 3).toBeLessThanOrEqual(2400);
  const y = meshes[1].geometry.getAttribute('position');
  for (let i = 0; i < y.count; i++) expect(y.getY(i)).toBeLessThan(71);
});

it('puts The M by Radius at its lidar roof with the arched crown on the south face', () => {
  const building: VBuilding = row.buildings.find((b: VBuilding) => b.id === 'osm:way:536899754');
  const model = createSkylineLandmark([building], building, 0, () => 0)!;
  expect(model.group.name).toBe('The M by Radius');
  model.group.updateMatrixWorld(true);
  const heightAt = (x: number, z: number) => new Raycaster(new Vector3(x, 300, z), new Vector3(0, -1, 0))
    .intersectObject(model.group)[0]?.point.y ?? 0;
  expect(heightAt(285, -3415)).toBeCloseTo(76.5, 0); // roof edge, lidar
  // The arch's crest stands on the south wall (south is +z), up to the lidar crown: a ray from the
  // south hits it at 78 m but passes clear over it at 78.8 m.
  const fromSouth = (y: number) => new Raycaster(new Vector3(302.4, y, -3300), new Vector3(0, 0, -1)).intersectObject(model.group)[0]?.point.z;
  expect(fromSouth(78)).toBeCloseTo(-3420 + 12.1, 0);
  expect(fromSouth(78.8)).toBeUndefined();
  expect(heightAt(-28.4 + 302.4, -3420)).toBeCloseTo(8, 0); // one-storey west wing
  const [body, lamps] = (model.group.children as Mesh[]).map(m => m.geometry);
  expect(body.getAttribute('position').count / 3).toBeLessThanOrEqual(2400);
  // No lit pane stands above the 76.5 m roof.
  const y = lamps.getAttribute('position');
  for (let i = 0; i < y.count; i++) expect(y.getY(i)).toBeLessThan(76.5);
});

it('keeps every part of Alexan on 8th on its footprint, within the 1.75 m balcony depth', () => {
  const central = JSON.parse(readFileSync(new URL('../../../pipeline/prototypes/square-board/midtown-central/context.json', import.meta.url), 'utf8'));
  const building: VBuilding = central.buildings.find((b: VBuilding) => b.id === 'osm:way:789975430');
  const model = createSkylineLandmark([building], building, 0, () => 0)!;
  model.group.updateMatrixWorld(true);
  const ring = building.rings[0] as [number, number][];
  const outside = (x: number, z: number) => pointInRing(x, z, ring) ? 0 : Math.min(...ring.map(([ax, az], k) => {
    const [bx, bz] = ring[(k + 1) % ring.length], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - ax - t * dx, z - az - t * dz);
  }));
  let worst = 0, inNotch = 0;
  const v = new Vector3();
  model.group.traverse(o => {
    if (!(o instanceof Mesh)) return;
    const p = o.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      const d = outside(v.x, v.z);
      worst = Math.max(worst, d);
      // The L's inside corner (west of the slab, north of the south-west leg) gets no balconies.
      if (d > .2 && v.x > 345 && v.x < 360 && v.z > -2818 && v.z < -2812) inNotch++;
    }
  });
  expect(worst).toBeLessThanOrEqual(1.75);
  expect(inNotch).toBe(0);
});

it('attaches every Mayfair balcony rail to the wall by its floor slab', () => {
  const building: VBuilding = row.buildings.find((b: VBuilding) => b.id === 'osm:way:536728181');
  const model = createSkylineLandmark([building], building, 0, () => 0)!;
  model.group.updateMatrixWorld(true);
  const body = (model.group.children[0] as Mesh).geometry.getAttribute('position');
  const v = new Vector3(), ring = building.rings[0] as [number, number][];
  const out = (x: number, z: number) => pointInRing(x, z, ring) ? 0 : Math.min(...ring.map(([ax, az], k) => {
    const [bx, bz] = ring[(k + 1) % ring.length], dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(x - ax - t * dx, z - az - t * dz);
  }));
  // Every triangle standing out from the wall must connect, through shared vertices, to one that
  // touches it (rails reach the wall through their slab); none may float.
  const n = body.count / 3, key = (i: number) => { v.fromBufferAttribute(body, i).applyMatrix4(model.group.matrixWorld); return `${v.x.toFixed(2)},${v.y.toFixed(2)},${v.z.toFixed(2)}`; };
  const keys = Array.from({ length: n }, (_, t) => [0, 1, 2].map(k => key(3 * t + k)));
  const off = Array.from({ length: n }, (_, t) => Math.min(...[0, 1, 2].map(k => {
    v.fromBufferAttribute(body, 3 * t + k).applyMatrix4(model.group.matrixWorld);
    return v.y < 92 ? out(v.x, v.z) : 0;
  })) > .1);
  const reached = new Set<string>();
  keys.forEach((ks, t) => { if (!off[t]) ks.forEach(k => reached.add(k)); });
  for (let grew = true; grew;) {
    grew = false;
    keys.forEach((ks, t) => { if (off[t] && ks.some(k => reached.has(k)) && !ks.every(k => reached.has(k))) { ks.forEach(k => reached.add(k)); grew = true; } });
  }
  const floating = keys.filter((ks, t) => off[t] && !ks.some(k => reached.has(k))).length;
  expect(floating).toBe(0);
  expect(body.count / 3).toBeLessThanOrEqual(2400);
});
