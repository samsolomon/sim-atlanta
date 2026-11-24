import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { inConnectorLanes } from './connector-paint';
import { FIFTH_PARK, fifthStreetPark, gradeFifthStreetBanks, onFifthStreetPark, parkDeckNavd88, parkEastEnd, parkOutline, parkPoint } from './fifth-street-park';
import { midtownConnectorDecks, withoutLandBridgeTrees } from './midtown-connector-decks';
import type { TerrainCity } from './transport-data';
import floors from '../../../pipeline/prototypes/midtown-connector/landbridge-floors.json';
import { GroundGrid } from './grid';

const row = resolve(__dirname, '../../../pipeline/prototypes/square-board/midtown-central');
const staged = existsSync(resolve(row, 'context.json'));
const LENGTH = Math.hypot(...[0, 1].map(i => parkOutline().at(-1)![i] - parkPoint(0, FIFTH_PARK.south)[i]) as [number, number]);

describe('the Fifth Street park deck', () => {
  it('is 68 m wide, north to south, as published (ASPIRE: 223 ft 3 in)', () => {
    expect(FIFTH_PARK.north - FIFTH_PARK.south).toBeCloseTo(68.05, 0);
    expect(2 * FIFTH_PARK.roadHalf).toBeCloseTo(48 * 0.3048, 1);
    expect(FIFTH_PARK.walkOuter - FIFTH_PARK.roadHalf).toBeCloseTo(24 * 0.3048, 1);
  });

  it('narrows the deck road to the 48 ft roadway between two 24 ft sidewalks', () => {
    const city = { bounds: { minX: -1000, maxX: 1800, minZ: -3300, maxZ: -2500 }, buildings: [], rail: [],
      roads: [{ cls: 'tertiary', name: 'Fifth Street Northwest', bridge: false, tunnel: false, pts: [[111.31, -2554.26], [-46.34, -2557.58]] }],
      terrainTransport: { version: 1, roads: [], rail: [] } } as unknown as TerrainCity;
    const runs = midtownConnectorDecks(city).terrainTransport!.roads;
    const road = runs.find(r => r.name === 'Fifth Street Northwest')!;
    expect(road.crossSection?.width).toBeCloseTo(14.6, 1);
    expect(runs.every(r => r.crossSection?.fixedWidth)).toBe(true);
    const walks = runs.filter(r => r.cls === 'footway');
    expect(walks.map(w => w.crossSection?.width)).toEqual([7.3, 7.3]);
    // Each walk's centreline sits 10.95 m off the road's, so curb meets curb.
    for (const walk of walks) {
      const [x, z] = walk.pts[10], [rx, rz] = road.pts[10];
      expect(Math.hypot(x - rx, z - rz)).toBeCloseTo(10.95, 1);
    }
  });

  it('ends its north deck at Williams Street, not across it', () => {
    for (const t of [16, 25, FIFTH_PARK.north]) {
      const [x] = parkPoint(parkEastEnd(t), t);
      expect(x).toBeLessThan(104);
    }
    expect(onFifthStreetPark(105, -2590)).toBe(false);
    expect(onFifthStreetPark(60, -2590)).toBe(true);
  });
});

describe.skipIf(!staged)('the Fifth Street park deck over the real freeway', () => {
  const manifest = JSON.parse(readFileSync(resolve(row, 'ground.json'), 'utf8'));
  const bytes = Uint8Array.from(readFileSync(resolve(row, 'ground.i16'))).buffer;
  gradeFifthStreetBanks(manifest, bytes);
  const grid = new GroundGrid(manifest, bytes);
  const ground = (x: number, z: number) => grid.sample(x, z)!;
  it('carries the roadway and both curbs onto the graded banks', () => {
    for (const s of [0, LENGTH]) for (const t of [-7.3, 0, 7.3]) {
      const [x, z] = parkPoint(s, t);
      expect(Math.abs(ground(x, z) - parkDeckNavd88(s))).toBeLessThan(0.15);
    }
  });
  const sceneZero = manifest.vertical.sceneZeroNavd88M;
  const park = fifthStreetPark(manifest.bounds, sceneZero, (x, z) => ground(x, z) - sceneZero)!;

  it('draws the freeway floor under the deck from its portals, not the DEM’s hump', () => {
    expect((floors as Record<string, number[][]>)[manifest.sha256].length).toBeGreaterThan(100);
    // Outer northbound lanes, mid-deck: the DEM puts them at 288-290 m; the portals at 284-285 m.
    for (const [s, t] of [[14, 0], [16, 20], [14, -20]]) {
      const [x, z] = parkPoint(s, t);
      expect(inConnectorLanes(x, z)).toBe(true);
      expect(ground(x, z)).toBeLessThan(286.5);
    }
  });

  it('clears every freeway lane beneath it by at least 5 m (girders and outer walls included)', () => {
    let lanes = 0, least = Infinity;
    for (let s = 0; s <= LENGTH; s += 1) for (let t = FIFTH_PARK.south; t <= FIFTH_PARK.north; t += 1) {
      const [x, z] = parkPoint(s, t);
      if (!onFifthStreetPark(x, z) || !inConnectorLanes(x, z)) continue;
      lanes++;
      // The girders' underside and the outer walls' foot are 1.6 m below the deck top.
      const c = parkDeckNavd88(s) - 1.6 - ground(x, z);
      if (c < 5 && process.env.PARK_DEBUG) console.log('short', s, t, x.toFixed(1), z.toFixed(1), c.toFixed(2), ground(x, z).toFixed(2));
      least = Math.min(least, c);
    }
    expect(lanes).toBeGreaterThan(2000);
    expect(least).toBeGreaterThanOrEqual(5);
    // And nothing in the mesh hangs lower than that over a lane.
    const pos = (park.group.children[0] as import('three').Mesh).geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i) + sceneZero, z = pos.getZ(i);
      if (inConnectorLanes(x, z)) expect(y - ground(x, z)).toBeGreaterThanOrEqual(5);
    }
  });

  it('stands its abutment walls clear of every lane and ramp', () => {
    for (let t = FIFTH_PARK.south; t <= FIFTH_PARK.north; t += 0.5) {
      for (const s of [parkEastEnd(t), LENGTH]) {
        const [x, z] = parkPoint(s, t);
        expect(inConnectorLanes(x, z, 0.5), `abutment at s ${s.toFixed(1)}, t ${t}`).toBe(false);
      }
    }
  });

  it('plants its trees on the deck, never on the street or the freeway', () => {
    expect(park.plantings.length).toBeGreaterThan(15);
    for (const p of park.plantings) {
      expect(onFifthStreetPark(p.x, p.z)).toBe(true);
      // Deck top or above: at least 5 m over the bare earth (the freeway) wherever that is a lane.
      if (inConnectorLanes(p.x, p.z)) expect(p.y + sceneZero - ground(p.x, p.z)).toBeGreaterThan(5);
      const [ex, ez] = parkPoint(0, 0), [wx, wz] = parkPoint(1, 0);
      const d = Math.abs((p.x - ex) * -(wz - ez) + (p.z - ez) * (wx - ex));
      expect(d).toBeGreaterThan(FIFTH_PARK.walkOuter);
    }
  });

  it('moves the canopy crowns that stood in the freeway lanes onto the deck', () => {
    const canopy = resolve(__dirname, '../../public/data/scene/square-board/midtown-central/context.json');
    if (!existsSync(canopy)) return;
    const context = JSON.parse(readFileSync(canopy, 'utf8')) as { trees: number[][]; treeLowCount?: number };
    const onDeck = context.trees.filter(([x, z]) => onFifthStreetPark(x, z));
    expect(onDeck.length).toBeGreaterThan(4);
    expect(withoutLandBridgeTrees(context).trees.filter(([x, z]) => onFifthStreetPark(x, z))).toEqual([]);
    const replanted = fifthStreetPark(manifest.bounds, sceneZero, (x, z) => ground(x, z) - sceneZero, onDeck as never)!;
    const kept = onDeck.filter(([x, z]) => replanted.plantings.some(p => Math.hypot(p.x - x, p.z - z) < 4));
    expect(kept.length).toBe(onDeck.length);
  });
});
