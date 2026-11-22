import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { LiveBus } from '../model/types';
import { GroundGrid, type GroundManifest } from '../terrain/grid';
import type { TransportRun } from '../terrain/transport-data';
import { CityBuses, makeDeckAt } from './buses';

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
const deckAt = makeDeckAt(grid, groundAt, bounds);
const R = 6_371_008.8, DEG = Math.PI / 180;
let t = 1_000;
const fix = (id: string, x: number, z: number, at = t, bearing?: number): LiveBus => {
  const asOf = new Date(at).toISOString();
  return { id, at, position: { value: { lon: x / (DEG * R), lat: -z / (DEG * R) }, tier: 'live', source: 'test', asOf },
    bearing: bearing === undefined ? undefined : { value: bearing, tier: 'live', source: 'test', asOf } };
};
const make = () => new CityBuses({ runs: [street, cross, bridge, freeway], groundAt, deckAt, origin: { lon: 0, lat: 0 }, bounds,
  geometry: new THREE.BoxGeometry(), material: new THREE.MeshBasicMaterial() });

describe('makeDeckAt', () => {
  it('follows the abutment chord over a DEM dip, plus the tread lift', () => {
    expect(groundAt(100, 0)).toBeCloseTo(-10);
    expect(deckAt(100, 0, bridge)).toBeCloseTo(0.12);
    expect(deckAt(100, 0, street)).toBeNull(); // ground runs are painted on the terrain
    expect(deckAt(140, 0, bridge)).toBeNull(); // off the run
  });
});

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
