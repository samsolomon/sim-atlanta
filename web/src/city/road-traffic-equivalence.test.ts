import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ArterialTraffic } from './arterial-traffic';
import { ConnectorTraffic } from './connector-traffic';
import { loadArterials } from './arterials';
import type { RoadTraffic } from './road-traffic';

const data = resolve(__dirname, '../../public/data/scene/downtown');
const staged = ['vignette.json', 'arterials.json', 'traffic.json'].every(f => existsSync(resolve(data, f)));
const J = (f: string) => JSON.parse(readFileSync(resolve(data, f), 'utf8'));

/** Every drawn car as matrix, colour and opacity numbers, ordered by position. */
function cars(layer: RoadTraffic) {
  const out: number[][] = [];
  layer.group.traverse(o => {
    if (!(o instanceof THREE.InstancedMesh) || /Signal/.test(o.name)) return;
    const m = o.instanceMatrix.array, c = o.instanceColor?.array;
    const opacity = o.geometry.getAttribute('tripOpacity')?.array;
    for (let i = 0; i < o.count; i++)
      out.push([...m.slice(i * 16, i * 16 + 16), ...(c ? c.slice(i * 3, i * 3 + 3) : []), opacity ? opacity[i] : 1]);
  });
  return out.sort((a, b) => a[12] - b[12] || a[14] - b[14]);
}
function expectSame(got: number[][], want: number[][]) {
  expect(got.length).toBe(want.length);
  let worst = 0;
  for (let i = 0; i < want.length; i++) for (let k = 0; k < want[i].length; k++) worst = Math.max(worst, Math.abs(got[i][k] - want[i][k]));
  // Float32 matrix writes against Object3D's double math, plus the 2 m height profile, which
  // is linear in distance while a lane bends between two samples: a few millimetres at most.
  expect(worst).toBeLessThan(1e-2);
}
type Paths = { stepLegacy(ms: number, dark: number): void; step(ms: number, dark: number, view?: THREE.Frustum): void };

describe.skipIf(!staged)('road traffic’s frame path matches the legacy path', () => {
  const vd = staged ? J('vignette.json') : null!;
  const hourly = staged ? J('traffic.json').hourly : null!;
  // A sloped plane: interpolating the cached 2 m height profile is exact on it, so any
  // difference is a placement change, not sampling.
  const roadHeight = (x: number, z: number) => 0.031 * x - 0.017 * z + 4;
  const layers = staged ? {
    arterials: new ArterialTraffic({ city: vd, arterials: loadArterials(J('arterials.json'), vd).corridors, hourly, roadHeight, quality: 'high' }),
    connector: new ConnectorTraffic({ city: vd, hourly, roadHeight, quality: 'high' }),
  } : {};
  for (const [name, layer] of Object.entries(layers)) it(`places the same ${name} cars, poses, colours and fades over an evening`, () => {
    const start = Date.parse('2026-11-20T16:30:00-05:00');
    let compared = 0;
    for (let k = 0; k < 40; k++) {
      const ms = start + k * 47_300;
      (layer as unknown as Paths).stepLegacy(ms, .2);
      const legacy = cars(layer);
      (layer as unknown as Paths).step(ms, .2);
      expectSame(cars(layer), legacy);
      compared += legacy.length;
    }
    expect(compared).toBeGreaterThan(400);
  });
});
