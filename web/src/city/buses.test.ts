import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { LiveBus } from '../model/types';
import { GroundGrid, type GroundManifest } from '../terrain/grid';
import type { TransportRun } from '../terrain/transport-data';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { makeProjector } from '../core/scene-data';
import type { TerrainCity } from '../terrain/transport-data';
import { BUS_STREETS, CityBuses, busRuns } from './buses';

// A 5 × 5 grid, 100 m apart, flat at 300 m except a 10 m dip under the bridge's midpoint.
const gm: GroundManifest = { version: 1, rows: 5, cols: 5, stepM: 100, bounds: { minX: -200, maxX: 200, minZ: -200, maxZ: 200 }, scaleM: 0.1, offsetM: 0, noData: -32768, encoding: 'signed int16 little-endian', vertical: { crs: 'EPSG:5703', sceneZeroNavd88M: 300 }, sha256: '' };
const raw = new Int16Array(25).fill(3000);
raw[2 * 5 + 3] = 2900; // (x 100, z 0)
const grid = new GroundGrid(gm, raw.buffer);
const groundAt = (x: number, z: number) => { const h = grid.sample(x, z); return h === null ? null : h - 300; };
const bounds = gm.bounds;
const street: TransportRun = { kind: 'ground', cls: 'secondary', pts: [[-190, 0], [190, 0]] };
const cross: TransportRun = { kind: 'ground', cls: 'secondary', pts: [[-50, -190], [-50, 190]] };
const bridge: TransportRun = { kind: 'bridge', cls: 'primary', pts: [[100, -100], [100, 100]] };
const freeway: TransportRun = { kind: 'ground', cls: 'motorway', pts: [[-190, 150], [190, 150]] };
// Stand-in for transport.deckAt: the bridge's flat abutment chord at scene zero, plus the tread lift.
const deckAt = (x: number, z: number, part: TransportRun) =>
  part === bridge && Math.abs(x - 100) <= 7 && Math.abs(z) <= 100 ? 0.12 : null;
const R = 6_371_008.8, DEG = Math.PI / 180;
let t = 1_000;
const fix = (id: string, x: number, z: number, at = t, bearing?: number): LiveBus => {
  const asOf = new Date(at).toISOString();
  return { id, at, position: { value: { lon: x / (DEG * R), lat: -z / (DEG * R) }, tier: 'live', source: 'test', asOf },
    bearing: bearing === undefined ? undefined : { value: bearing, tier: 'live', source: 'test', asOf } };
};
const make = () => new CityBuses({ runs: [street, cross, bridge, freeway], groundAt, deckAt, origin: { lon: 0, lat: 0 }, bounds,
  geometry: new THREE.BoxGeometry(), material: new THREE.MeshBasicMaterial() });

describe('CityBuses', () => {
  it('snaps each report once, caches unsnappable reports, and shows none off the real present', () => {
    const b = make();
    const fixes = [fix('a', 0, 3), fix('far', 0, 80), fix('off', 500, 0)];
    b.update(fixes, 0);
    expect(b.snaps).toBe(3);
    for (let f = 1; f < 20; f++) b.update(fixes, f * 16);
    expect(b.snaps).toBe(3); // no re-snapping of the same reports, incl. the rejected two
    expect(b.summary().count).toBe(1);
    b.update(null, 400);
    expect(b.summary().count).toBe(0);
    expect(b.mesh.count).toBe(0);
  });

  it('drops a bus whose fix expired from the feed', () => {
    const b = make();
    b.update([fix('a', 0, 3)], 0);
    b.update([], 100);
    expect(b.summary().count).toBe(0);
  });

  it('keeps right of travel by the reported bearing', () => {
    const b = make();
    b.update([fix('east', 0, 0, t, 90), fix('west', 20, 0, t, 270)], 0);
    const [e, w] = b.positions;
    expect(e.z).toBeGreaterThan(0); // eastbound (+x) keeps to +z (south), the right-hand side
    expect(w.z).toBeLessThan(0);
  });

  it('stands on the bridge tread, not the DEM under it, and on painted ground elsewhere', () => {
    const b = make();
    b.update([fix('br', 101, 40), fix('st', -100, 1)], 0);
    const br = b.positions.find((p) => p.id === 'br')!;
    const st = b.positions.find((p) => p.id === 'st')!;
    expect(br.y).toBeGreaterThan(-1); // the DEM here is −10
    expect(st.y).toBeCloseTo(groundAt(st.x, st.z)!);
  });

  it('at a crossing, takes the street running the reported way (bridge over street)', () => {
    const b = make();
    b.update([fix('over', 101, 0, t, 0), fix('under', 101, 1, t, 90)], 0);
    const over = b.positions.find((p) => p.id === 'over')!;
    const under = b.positions.find((p) => p.id === 'under')!;
    expect(over.y).toBeGreaterThan(-1); // northbound: on the bridge deck
    expect(under.y).toBeLessThan(-8); // eastbound: on the street beneath
  });

  it('glides along a street but places a report that turned a corner', () => {
    const b = make();
    b.update([fix('g', -150, 0, 1)], 0);
    b.update([fix('g', -90, 0, 2)], 1000);
    b.update([fix('g', -90, 0, 2)], 5000); // mid-glide on the same street
    expect(b.positions[0].x).toBeGreaterThan(-150);
    expect(b.positions[0].x).toBeLessThan(-90);
    // Next report is round the corner on the cross street: placed there, not driven through the block.
    b.update([fix('g', -50, 120, 3)], 6000);
    expect(b.positions[0].z).toBeCloseTo(120, 0);
    expect(Math.abs(b.positions[0].x - -50)).toBeLessThan(3);
  });

  it('places, not glides, a report round a bend on the same street', () => {
    const bend: TransportRun = { kind: 'ground', cls: 'residential', pts: [[-180, -180], [-120, -180], [-120, -100]] };
    const b = new CityBuses({ runs: [bend], groundAt, deckAt, origin: { lon: 0, lat: 0 }, bounds, geometry: new THREE.BoxGeometry(), material: new THREE.MeshBasicMaterial() });
    b.update([fix('k', -170, -180, 1)], 0);
    b.update([fix('k', -120, -110, 2)], 1000);
    b.update([fix('k', -120, -110, 2)], 5000); // a straight glide would be mid-block now
    const p = b.positions[0];
    expect(Math.abs(p.x - -120)).toBeLessThan(3);
    expect(Math.abs(p.z - -110)).toBeLessThan(3);
  });

  it('never snaps to a freeway', () => {
    const b = make();
    b.update([fix('m', 0, 150)], 0);
    expect(b.summary().count).toBe(0);
  });

  it('reports occupancy for illustrative cars, level by level', () => {
    const b = make();
    b.update([fix('a', 0, 0, t, 90)], 0);
    const p = b.positions[0];
    expect(b.occupies(p.x + 4, p.y, p.z, 4.5, Math.PI / 2)).toBe(true); // same lane, overlapping
    expect(b.occupies(p.x + 30, p.y, p.z, 4.5, Math.PI / 2)).toBe(false); // well behind
    expect(b.occupies(p.x, p.y + 7, p.z, 4.5, 0)).toBe(false); // on a deck overhead
    expect(b.occupies(p.x, p.y, p.z + 6, 4.5, Math.PI / 2)).toBe(false); // next lane over
  });
});

const vjson = resolve(__dirname, '../../public/data/scene/downtown/vignette.json');
const sjson = resolve(__dirname, '../../public/data/scene/downtown/scene.json');
describe.skipIf(!existsSync(vjson) || !existsSync(sjson))('CityBuses on the shipped downtown streets', () => {
  it('indexes ordinary at-grade streets as well as the scoped intervals (live regression: Decatur St, MLK Jr Dr, Courtland St)', () => {
    const vd: TerrainCity = JSON.parse(readFileSync(vjson, 'utf8'));
    const origin = JSON.parse(readFileSync(sjson, 'utf8')).origin;
    const runs = busRuns(vd, true);
    expect(runs.length).toBeGreaterThan((vd.terrainTransport?.roads.length ?? 0) + 100);
    const b = new CityBuses({ runs, groundAt: () => 0, deckAt: () => 0, origin, bounds: vd.bounds, geometry: new THREE.BoxGeometry(), material: new THREE.MeshBasicMaterial() });
    const unproject = (x: number, z: number) => ({ lon: origin.lon + x / (DEG * R * Math.cos(origin.lat * DEG)), lat: origin.lat - z / (DEG * R) });
    expect(makeProjector(origin)(unproject(10, 20).lon, unproject(10, 20).lat)[0]).toBeCloseTo(10);
    for (const name of ['Decatur Street', 'Martin Luther King Jr', 'Courtland Street']) {
      const road = vd.roads.find((r) => r.name?.includes(name) && BUS_STREETS.has(r.cls) && !r.bridge && !r.tunnel && r.pts.every(([x, z]) => Math.abs(x) < 900 && z > -1200 && z < 600))!;
      expect(road, name).toBeDefined();
      const [x, z] = road.pts[Math.floor(road.pts.length / 2)];
      const { lon, lat } = unproject(x + 6, z);
      const bus: LiveBus = { id: name, at: 1, position: { value: { lon, lat }, tier: 'live', source: 'test', asOf: '' } };
      expect(b.snap(bus), name).not.toBeNull();
    }
  });

  it('lights the street ahead of a bus at night, on its own street, and none by day or past the drawn ground', () => {
    const b = make();
    const pools: { near: THREE.Vector3; far: THREE.Vector3 }[] = [];
    let active = true;
    b.lights = { get active() { return active; }, inRange: () => true,
      add: (nx, ny, nz, fx, fy, fz) => { pools.push({ near: new THREE.Vector3(nx, ny, nz), far: new THREE.Vector3(fx, fy, fz) }); return true; } };
    // Eastbound (bearing 90) on the flat street: the pool starts at the front bumper and runs east on the ground.
    b.update([fix('east', -100, 0, t, 90)], 0);
    expect(pools).toHaveLength(1);
    const [{ near, far }] = pools;
    expect(far.x).toBeGreaterThan(near.x);
    expect(near.y).toBeCloseTo(groundAt(near.x, near.z)!, 5);
    expect(far.y).toBeCloseTo(groundAt(far.x, far.z)!, 5);
    // Near the board edge the pool would run off the drawn ground: none, though the bus shows.
    pools.length = 0;
    b.update([fix('edge', 185, 0, t + 1, 90)], 0);
    expect(b.summary().count).toBe(1);
    expect(pools).toHaveLength(0);
    active = false;
    b.update([fix('east', -100, 0, t + 2, 90)], 0);
    expect(pools).toHaveLength(0);
  });
});

