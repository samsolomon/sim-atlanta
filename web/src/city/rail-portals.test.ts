import { existsSync, readFileSync } from 'node:fs';
import * as THREE from 'three';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import type { FreightTreadPoint } from '../terrain/transport';
import type { P2 } from '../vignette/geom';
import { buildRailPortals, declaredEnd, DOWNTOWN_RAIL_ENDS, extendFreightIntoMouths, looseRailEnds, railMouths, railPortalOpenings } from './rail-portals';

const d = (f: string) => new URL('../../public/data/scene/downtown/' + f, import.meta.url);
const staged = ['ground.json', 'ground.i16', 'vignette.json'].every((f) => existsSync(d(f)));
const load = () => {
  const grid = new GroundGrid(JSON.parse(readFileSync(d('ground.json')).toString()), Uint8Array.from(readFileSync(d('ground.i16'))).buffer);
  const v = JSON.parse(readFileSync(d('vignette.json')).toString());
  return { grid, v, rail: v.terrainTransport.rail as { kind: string; cls: string; pts: P2[] }[] };
};

it.skipIf(!staged)('accounts for every loose rail end on the downtown board', () => {
  // A rail end that meets neither another run nor the board edge must be a declared tunnel mouth,
  // a track passing under a drawn deck or building, or a real end of track. An unexplained one is a
  // gap like the one Sam found (track ending in grass where Overture's tunnel was hidden).
  const { v, rail } = load();
  const ends = looseRailEnds(rail, v.bounds);
  expect(ends.length).toBeGreaterThan(0);
  const unexplained = ends.filter((e) => !declaredEnd(e.at)).map((e) => `run ${e.run} at ${e.at.map((n) => n.toFixed(0)).join(',')}`);
  expect(unexplained).toEqual([]);
  // Every declaration still matches a loose end, so the list can't go stale.
  for (const decl of DOWNTOWN_RAIL_ENDS) expect(ends.some((e) => Math.hypot(e.at[0] - decl.at[0], e.at[1] - decl.at[1]) < 3), decl.why).toBe(true);
});

it.skipIf(!staged)('puts a portal and a terrain opening at each hillside mouth, aligned with its track', () => {
  const { v, rail, grid } = load();
  const mouths = railMouths(rail, v.bounds, grid);
  expect(mouths).toHaveLength(DOWNTOWN_RAIL_ENDS.filter((e) => e.kind === 'hillside').length);
  for (const m of mouths) {
    // Real cover over the rail (8-9 m of plaza and street), and an opening at least a car high.
    expect(m.coverY - m.railY).toBeGreaterThan(6);
    expect(m.half).toBeGreaterThanOrEqual(3.2);
    // The heading follows the track approaching the mouth, not a short jog in the mapped end.
    const end = looseRailEnds(rail, v.bounds).find((e) => Math.hypot(e.at[0] - m.x, e.at[1] - m.z) < m.half + 3)!;
    const r = rail[end.run].pts;
    const far = r[0] === end.at ? r[Math.min(r.length - 1, 3)] : r[Math.max(0, r.length - 4)];
    const back = Math.hypot(far[0] - end.at[0], far[1] - end.at[1]);
    expect((end.at[0] - far[0]) * m.dx + (end.at[1] - far[1]) * m.dz).toBeGreaterThan(back * 0.9);
  }
  const slots = railPortalOpenings(mouths);
  expect(slots).toHaveLength(mouths.length);
  for (const [i, s] of slots.entries()) expect(s.halfWidthM).toBeGreaterThan(mouths[i].half);
  const mesh = buildRailPortals(mouths, grid);
  expect(mesh.geometry.getAttribute('position').count).toBeGreaterThan(100);
  expect(mesh.material).toBeInstanceOf(THREE.MeshLambertMaterial);
});

it('runs a freight section on into the tube so trains clip in the dark', () => {
  const mouth = { x: 0, z: 0, dx: 0, dz: 1, half: 3.2, railY: 0, coverY: 8 };
  const pt = (z: number, s: number): FreightTreadPoint => ({ s, position: new THREE.Vector3(0, 0, z) });
  const section = [pt(-40, 0), pt(-20, 20), pt(0, 40)];
  extendFreightIntoMouths([section], [mouth]);
  expect(section).toHaveLength(4);
  expect(section[3].position.z).toBeCloseTo(8);
  expect(section[3].s).toBeCloseTo(48);
  // A section starting at a mouth extends backwards from its first point.
  const reverse = [pt(0, 0), pt(-20, 20)];
  extendFreightIntoMouths([reverse], [mouth]);
  expect(reverse[0].position.z).toBeCloseTo(8);
  expect(reverse[0].s).toBeCloseTo(-8);
});
