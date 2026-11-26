import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { auburnTransport } from '../city/sweet-auburn-transport';
import { GroundGrid } from './grid';
import { applyRampDecks } from './ramp-decks';
import { GroundSurface } from './surface';
import { createSurfaceTransport } from './transport';
import type { TerrainCity, TransportRun } from './transport-data';

const rows = new URL('../../../pipeline/prototypes/square-board/', import.meta.url);
const read = (dir: URL, name: string) => readFileSync(new URL(name, dir));

it('meets the joining deck at an unsurveyed joint whose other end is a board edge (release 18 ellis-high)', () => {
  // Andrew Young International Blvd and Ellis Street each cross north-corner on two
  // unsurveyed pieces: one from a board seam to a joint over the Connector cut, one on.
  // The seam piece took the cut floor at the joint, 5.9 m and 9.4 m under the deck it joins.
  const board = new URL('north-corner/', rows);
  const grid = new GroundGrid(JSON.parse(read(board, 'ground.json').toString()), Uint8Array.from(read(board, 'ground.i16')).buffer);
  const ground = new GroundSurface(grid, 'high');
  const city = auburnTransport(JSON.parse(read(board, 'context.json').toString()) as TerrainCity);
  const decks = createSurfaceTransport(city, grid, ground.sampleScene.bind(ground));
  try {
    for (const joint of [[1147.46, -701.47], [1098.35, -542]]) {
      const at = city.terrainTransport!.roads.filter(r => r.kind === 'bridge' && !r.deckNavd88M &&
        [r.pts[0], r.pts.at(-1)!].some(p => Math.hypot(p[0] - joint[0], p[1] - joint[1]) < .01));
      expect(at.length, `${joint}`).toBeGreaterThan(1);
      // Each piece's tread 0.6 m in from the joint.
      const tops = at.map(r => {
        const end = Math.hypot(r.pts[0][0] - joint[0], r.pts[0][1] - joint[1]) < .01 ? 0 : r.pts.length - 1;
        const next = r.pts[end ? end - 1 : 1], d = Math.hypot(next[0] - joint[0], next[1] - joint[1]);
        return decks.deckAt(joint[0] + (next[0] - joint[0]) / d * .6, joint[1] + (next[1] - joint[1]) / d * .6, r)!;
      });
      // The piece from the seam meets the deck it joins; before, it sat on the cut floor.
      const seam = at.findIndex(r => [r.pts[0], r.pts.at(-1)!].some(p => p[0] === 1000 || p[1] === -520));
      expect(seam, `${joint}`).toBeGreaterThanOrEqual(0);
      const others = tops.filter((_, i) => i !== seam);
      expect(Math.min(...others.map(t => Math.abs(t - tops[seam]))), `${joint}`).toBeLessThan(.3);
    }
  } finally { decks.dispose(); ground.geometry.dispose(); }
});

it('leaves no ramp floating: slicing a board ramp adds no motorway ground run, on any row', () => {
  const ids = readdirSync(rows).filter(id => existsSync(new URL(`${id}/context.json`, rows)));
  expect(ids.length).toBeGreaterThan(8);
  const groundRuns = (runs: readonly TransportRun[]) => runs.filter(r => r.kind === 'ground' && r.cls === 'motorway').length;
  for (const id of ids) {
    const context = JSON.parse(read(new URL(`${id}/`, rows), 'context.json').toString()) as TerrainCity;
    const before = groundRuns(context.terrainTransport?.roads ?? []);
    const after = groundRuns(auburnTransport(structuredClone(context)).terrainTransport?.roads ?? []);
    expect(after, id).toBeLessThanOrEqual(before);
  }
  // Downtown's baked runs go through applyRampDecks (the MLK ramps).
  const downtown = new URL('../../public/data/scene/downtown/vignette.json', import.meta.url);
  if (existsSync(downtown)) {
    const city = JSON.parse(readFileSync(downtown, 'utf8')) as TerrainCity;
    const before = groundRuns(city.terrainTransport!.roads);
    expect(groundRuns(applyRampDecks(city).terrainTransport!.roads)).toBeLessThanOrEqual(before);
  }
});
