import { expect, it } from 'vitest';
import type { TerrainCity, TransportRun } from '../terrain/transport-data';
import { cityRoadHeight } from './road-height';

it('rides the deck a ramp splits from where its own ribbon has no width yet', () => {
  // A gore at (0, 0): the through deck runs east, the ramp leaves north. The ramp's
  // ribbon starts at no width, so its own tread exists only from 3 m. A deck
  // crossing overhead at y 9 touches the ramp's line but shares no end vertex.
  const through: TransportRun = { kind: 'bridge', cls: 'motorway', sub: 'link', pts: [[0, 0], [20, 0]], deckNavd88M: [0, 0] };
  const ramp: TransportRun = { kind: 'bridge', cls: 'motorway', sub: 'link', pts: [[0, 0], [0, 20]], deckNavd88M: [0, 0] };
  const over: TransportRun = { kind: 'bridge', cls: 'motorway', sub: 'link', pts: [[-10, 1], [0, 1], [10, 1]], deckNavd88M: [0, 0, 0] };
  const city = { roads: [], terrainTransport: { version: 1, rail: [], roads: [through, ramp, over] } } as unknown as TerrainCity;
  const deckAt = (x: number, z: number, part: TransportRun) =>
    part === through ? (Math.abs(z) < 2.5 && x > -2.5 ? 5 : null) :
    part === ramp ? (z >= 3 && Math.abs(x) < 2 ? 5.2 : null) :
    Math.abs(z - 1) < 2 ? 9 : null;
  const height = cityRoadHeight(city, () => 0, deckAt);
  const road = { cls: 'motorway', sub: 'link', bridge: true, pts: [[0, 0], [0, 20]] } as never;
  expect(height(0, 1, road)).toBe(5);
  expect(height(0, 6, road)).toBe(5.2);
  // Beyond the nose's reach a missing tread stays missing.
  const far = { ...ramp, pts: [[0, 0], [0, 40]] } as TransportRun;
  const gap = cityRoadHeight({ ...city, terrainTransport: { version: 1, rail: [], roads: [through, far] } } as unknown as TerrainCity,
    () => 0, (x, z, part) => part === far ? (z < 30 ? 5.2 : null) : deckAt(x, z, part));
  expect(gap(0, 35, { cls: 'motorway', sub: 'link', bridge: true, pts: [[0, 0], [0, 40]] } as never)).toBeNull();
});
