import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { southConnectorTransport } from '../square-board/south-connector-decks';
import type { P2 } from '../vignette/geom';
import { applyLids, lidRoads, onLid } from './lids';
import type { TerrainCity } from './transport-data';

const band = new URL('../../../pipeline/prototypes/square-board/south-band/context.json', import.meta.url);
const context = (): TerrainCity => JSON.parse(readFileSync(band, 'utf8'));

it('draws the Capitol Gateway lid streets and walks on the lid, not as decks', () => {
  // OSM tags 35 streets and walks on the lid bridge=yes. Drawn as decks over the
  // concealed freeway they stood 1-6 m above the lid the board already carries.
  const before = context().roads.filter(r => r.bridge && r.pts.every(p => onLid(p)));
  expect(before.length).toBe(35);
  expect(lidRoads(context()).roads.filter(r => r.bridge && r.pts.every(p => onLid(p)))).toHaveLength(0);
  const runs = southConnectorTransport(context()).terrainTransport!.roads;
  expect(runs.filter(r => r.kind === 'bridge' && r.pts.every(p => onLid(p)))).toHaveLength(0);
  // Bridges off the lid are untouched.
  expect(lidRoads(context()).roads.filter(r => r.bridge).length).toBe(context().roads.filter(r => r.bridge).length - 35);
});

it('cuts a baked bridge run at the lid outline and keeps the part off the lid a bridge', () => {
  // Downtown's board ends at z = 700, inside the lid's northern tip: three short
  // service runs there lie on it. A run crossing the outline edge from
  // (382.72, 697.64) to (399.76, 684.84) is cut where it crosses, near z 692.
  const run = { kind: 'bridge', cls: 'service', pts: [[390, 670], [390, 700]] as P2[] };
  const city = { roads: [], terrainTransport: { version: 1, rail: [], roads: [run] } } as unknown as TerrainCity;
  const pieces = applyLids(city).terrainTransport!.roads;
  expect(pieces.map(p => p.kind)).toEqual(['bridge', 'ground']);
  expect(pieces[0].pts[0]).toEqual([390, 670]);
  expect(pieces[1].pts.at(-1)).toEqual([390, 700]);
  const cut = pieces[0].pts.at(-1)!;
  expect(pieces[1].pts[0]).toEqual(cut);
  expect(onLid(cut, .01)).toBe(true);
  expect(Math.abs(cut[1] - 692.2)).toBeLessThan(.2);
  // A run that only touches a lid corner stays a bridge.
  const corner = { roads: [], terrainTransport: { version: 1, rail: [], roads: [{ kind: 'bridge', cls: 'footway', pts: [[376.16, 671.81], [376.39, 711.18]] }] } } as unknown as TerrainCity;
  expect(applyLids(corner).terrainTransport!.roads.map(r => r.kind)).toEqual(['bridge']);
});
