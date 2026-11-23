import { bridgeApproaches } from '../terrain/bridge-approaches';
import survey from './fixtures/seventeenth-street.json';
import { Line } from '../vignette/geom';
import { seventeenthAccess, seventeenthPortals } from './seventeenth-street';
import { Raycaster, Vector3 } from 'three';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import { createSurfaceTransport } from '../terrain/transport';
import { auburnTransport } from './sweet-auburn-transport';
import { cityRoadHeight } from './road-height';

it('carries 17th Street and its walks on the lidar crest above the through motorway', () => {
  const file = (name: string) =>
    readFileSync(
      new URL('../../../pipeline/prototypes/square-board/brookwood-south/' + name, import.meta.url),
    );
  const city = auburnTransport(JSON.parse(file('context.json').toString()));
  const grid = new GroundGrid(
    JSON.parse(file('ground.json').toString()),
    Uint8Array.from(file('ground.i16')).buffer,
  );
  const zero = grid.manifest.vertical.sceneZeroNavd88M;
  const ground = (x: number, z: number) => grid.sample(x, z)! - zero;
  const model = createSurfaceTransport(city, grid, ground);
  try {
    const height = cityRoadHeight(city, ground, model.deckAt);
    const crossing = city.roads.find((r) => r.name === '17th Street Northwest' && r.pts[0][0] === -169.35)!;
    const lower = city.roads.find((r) => r.cls === 'motorway' && r.pts[0][0] === 24.06)!;
    const x = 12.3,
      z = -4157.01 + ((x + 101.68) * (-4211.78 + 4157.01)) / (82.46 + 101.68);
    expect(height(x, z, crossing)! + zero).toBeCloseTo(280.5, 0);
    expect(height(x, z, lower)).toBe(ground(x, z));
    expect(height(x, z, crossing)! - height(x, z, lower)!).toBeGreaterThan(15);
    const ray = new Raycaster(new Vector3(x, ground(x, z) + 0.1, z), new Vector3(0, 1, 0));
    const roof = ray.intersectObject(model.group.getObjectByName('17th Street Bridge')!)[0];
    expect(roof.distance).toBeGreaterThan(12);
    const portals = seventeenthPortals(city);
    expect(portals).toHaveLength(2);
    const banks = bridgeApproaches(portals, zero, ground, city.bounds, city.roads);
    for (const {
      edge: [a, b],
      direction: [dx, dz],
    } of portals) {
      for (const f of [0.12, 0.38, 0.64, 0.92]) {
        const x = a[0] + f * (b[0] - a[0]),
          z = a[1] + f * (b[1] - a[1]);
        const join = banks.groundAt(x + dx * 0.02, z + dz * 0.02)!;
        const expected = a[2] + f * (b[2] - a[2]) - zero + (f < 0.205 || f > 0.845 ? 0.27 : 0.12);
        expect(Math.abs(join - expected)).toBeLessThan(0.025);
      }
    }
    banks.geometry.dispose();
    banks.walls.dispose();
    const walk = city.terrainTransport!.roads.find((r) => r.pts[0][0] === 87.5)!;
    const [a, b] = [walk.pts[0], walk.pts[1]];
    expect(model.deckAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, walk)).not.toBeNull();
    expect(model.deckAt(x, z, walk)).toBeNull();
  } finally {
    model.dispose();
  }
});

it('joins both surveyed ramp decks to the turning pavement and stays elevated across source-way and tile seams', () => {
  const heights = new Map<string, number>();
  for (const tile of ['midtown-upper', 'brookwood-south']) {
    const file = (name: string) =>
      readFileSync(
        new URL('../../../pipeline/prototypes/square-board/' + tile + '/' + name, import.meta.url),
      );
    const city = seventeenthAccess(auburnTransport(JSON.parse(file('context.json').toString())));
    const grid = new GroundGrid(
      JSON.parse(file('ground.json').toString()),
      Uint8Array.from(file('ground.i16')).buffer,
    );
    const zero = grid.manifest.vertical.sceneZeroNavd88M;
    const ground = (x: number, z: number) => grid.sample(x, z)! - zero;
    const model = createSurfaceTransport(city, grid, ground);
    const height = cityRoadHeight(city, ground, model.deckAt);
    try {
      for (const ramp of survey.ramps) {
        for (const part of ramp.parts) {
          const road = city.roads.find(
            (r) =>
              r.cls === 'motorway' &&
              r.sub === 'link' &&
              r.pts[0].join() === part.start.join() &&
              r.pts.at(-1)!.join() === part.end.join(),
          );
          if (!road) continue;
          const line = new Line(road.pts);
          let previous: number | null = null;
          for (
            let s = part.land.length ? new Line(part.land as [number, number][]).length - 0.5 : 0;
            s <= line.length;
            s += 0.5
          ) {
            const pt = line.at(s),
              y = height(pt.x, pt.z, road);
            expect(y, `${tile} ${part.start} station ${s}`).not.toBeNull();
            if (previous !== null)
              expect(Math.abs(y! - previous), `step at ${pt.x},${pt.z}`).toBeLessThan(0.12);
            previous = y;
          }
          for (const pt of [road.pts[0], road.pts.at(-1)!]) {
            const y = height(...pt, road);
            expect(y).not.toBeNull();
            const h = y! + zero;
            if (heights.has(pt.join())) expect(h).toBeCloseTo(heights.get(pt.join())!, 2);
            heights.set(pt.join(), h);
          }
          if (part !== ramp.parts.at(-1)) continue;
          const end = road.pts.at(-1)!;
          const street = city.roads.find(
            (r) => r.name === '17th Street Northwest' && r.pts.some((p) => p.join() === end.join()),
          )!;
          expect(height(...end, road)).toBeCloseTo(height(...end, street)!, 3);
          const run = city.terrainTransport!.roads.find((r) => r.pts === road.pts)!;
          const roadRuns = city.terrainTransport!.roads.filter((r) => r.name === '17th Street Northwest');
          const [left, right] = ramp.edgeX.map((x) => survey.rows.find((row) => row[ramp.side * 3] === x)!);
          const tangent = new Vector3(right[0] - left[0], 0, right[1] - left[1]).normalize();
          for (let lane = 0; lane < 3; lane++) {
            const across = (lane + 0.5) / 3;
            const row = left.map((v, k) => v + (right[k] - v) * across);
            const at = (f: number) =>
              new Vector3(row[0] + f * (row[3] - row[0]), 0, row[1] + f * (row[4] - row[1]));
            const turnsEast = ramp.side === 1 ? lane === 2 : lane !== 0;
            const enter = at(ramp.side),
              bend = at(turnsEast ? 0.69 : 0.36);
            const exit = bend.clone().addScaledVector(tangent, turnsEast ? 13 : -13);
            for (let j = 0; j <= 20; j++) {
              const t = j / 20;
              const p = enter.clone().lerp(bend, t).lerp(bend.clone().lerp(exit, t), t);
              const y = [run, ...roadRuns].map((r) => model.deckAt(p.x, p.z, r)).find((v) => v !== null);
              expect(y, `turning lane ${lane} at ${p.x},${p.z}`).toBeDefined();
              const down = new Raycaster(new Vector3(p.x, y! + 0.35, p.z), new Vector3(0, -1, 0), 0, 0.5);
              const top = down.intersectObject(model.group, true)[0];
              expect(top.point.y - y!).toBeLessThan(0.08);
            }
          }
          // Look down at the joint from above. One pavement face carries both
          // traffic owners. Two independently drawn tops would both intercept the ray.
          const p = line.at(line.length - 1.7);
          const ray = new Raycaster(new Vector3(p.x, 100, p.z), new Vector3(0, -1, 0));
          const surfaces = ray
            .intersectObject(model.group, true)
            .filter((hit) => Math.abs(hit.point.y - height(p.x, p.z, road)!) < 0.45);
          expect(surfaces).toHaveLength(1);
        }
      }
    } finally {
      model.dispose();
    }
  }
  expect(heights.get('95.72,-4100')).toBeCloseTo(278.5, 0);
  expect(heights.get('-138.19,-4235.39')).toBeCloseTo(274.1, 0);
});
