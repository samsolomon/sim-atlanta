import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { lonLatToScene } from '../core/places';
import { runEveryStep } from '../core/slice';
import { crownKey } from './rollout';
import { buildRolloutRow, rolloutRow } from './rollout-city';

// The staged rows (pnpm data), as in rollout.test.ts: the prototype fixtures carry no crowns.
const scene = new URL('../../public/data/scene/square-board/', import.meta.url);
const places = new URL('../../public/data/ga/neighborhoods.json', import.meta.url);
const staged = existsSync(new URL('brookwood-south/context.json', scene)) && existsSync(places);

function ansley() {
  const nb = JSON.parse(readFileSync(places, 'utf8'));
  const ring: number[][] = nb.features.find((f: { properties: { name: string } }) => f.properties.name === 'Ansley Park').geometry.coordinates[0]
    .map(([lon, lat]: number[]) => lonLatToScene({ lon: -84.3916, lat: 33.7539 }, lon, lat));
  return (x: number, z: number) => {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
      if ((ring[i][1] > z) !== (ring[j][1] > z) && x < (ring[j][0] - ring[i][0]) * (z - ring[i][1]) / (ring[j][1] - ring[i][1]) + ring[i][0]) c = !c;
    return c;
  };
}

it.skipIf(!staged).each([['brookwood-south', false], ['brookwood-south', true], ['midtown-upper', false]] as const)(
  'the %s rollout planned with a yield after every step equals the synchronous plan (generic %s)', async (row, generic) => {
    const c = JSON.parse(readFileSync(new URL(`${row}/context.json`, scene), 'utf8'));
    const low: [number, number, number, number][] = c.trees.slice(0, c.treeLowCount);
    const input = {
      roads: c.roads, ground: c.ground, buildings: c.buildings, bounds: c.bounds,
      roundTwo: { id: row, eligible: new Set(low.map(([x, z]) => crownKey(x, z))) },
      allCrowns: c.trees, tierCrowns: low, inAnsley: ansley(), generic,
    };
    const sync = rolloutRow(input);
    let steps = 0;
    const sliced = await runEveryStep(buildRolloutRow(input), () => { steps++; Math.random(); });
    expect(steps).toBeGreaterThan(10);
    expect(sliced.plan).toEqual(sync.plan);
    expect(sliced.crowns).toEqual(sync.crowns);
    expect(sync.plan.species.length + sync.plan.added.length + sync.plan.enlarged.size).toBeGreaterThan(0);
  }, 30_000);
