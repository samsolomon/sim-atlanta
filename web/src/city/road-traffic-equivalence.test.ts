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
const paths = (layer: RoadTraffic) => layer as unknown as Paths;

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

  it('matches frame by frame through moving-queue rollovers, with in-place trip reuse', () => {
    // A streetcar-like blocker sweeping each queued course every 100 s queues cars behind it.
    // Separate layers run each path over the same continuous frames. (Warm rollovers that keep
    // surviving trips are rare here; traffic-queues.test.ts covers in-place trip reuse directly.)
    const movingBlocks = () => (t: number) => { const front = (t * 9) % 900; return [{ rear: front - 24, front }]; };
    const make = () => new ArterialTraffic({ city: vd, arterials: loadArterials(J('arterials.json'), vd).corridors, hourly, roadHeight, quality: 'high', movingBlocks });
    const legacy = make(), next = make();
    const start = Date.parse('2026-11-20T17:00:00-05:00');
    let compared = 0;
    for (let f = 0; f < 3000; f++) {
      const ms = start + f * 1000 / 30;
      paths(legacy).stepLegacy(ms, 0);
      paths(next).step(ms, 0);
      const want = cars(legacy);
      expectSame(cars(next), want);
      compared += want.length;
    }
    expect(compared).toBeGreaterThan(200);
  });

  it('culls only cars outside the view, posing the rest exactly as without culling', () => {
    const layer = layers.connector!;
    const camera = new THREE.PerspectiveCamera(40, 411 / 891, 1, 6000);
    camera.position.set(700, 260, 760);
    camera.lookAt(650, 0, 450);
    camera.updateMatrixWorld();
    const view = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const ms = Date.parse('2026-11-20T17:05:00-05:00');
    paths(layer).step(ms, 0);
    const all = cars(layer);
    paths(layer).step(ms, 0, view);
    const culled = cars(layer);
    const seen = all.filter(c => view.containsPoint(new THREE.Vector3(c[12], c[13], c[14])));
    expect(seen.length).toBeGreaterThan(5);
    expect(culled.length).toBeLessThan(all.length);
    // Every car the camera can see is still drawn, identically; nothing far outside is.
    const key = (c: number[]) => `${c[12].toFixed(3)},${c[14].toFixed(3)}`;
    const drawn = new Map(culled.map(c => [key(c), c]));
    for (const c of seen) expect(drawn.get(key(c))).toEqual(c);
    const margin = new THREE.Box3();
    for (const c of culled) {
      margin.min.set(c[12] - 31, -80, c[14] - 31); margin.max.set(c[12] + 31, 150, c[14] + 31);
      expect(view.intersectsBox(margin)).toBe(true);
    }
  });
});

it('interpolates the shortened last profile step to the lane end', async () => {
  const { RoadTraffic } = await import('./road-traffic');
  const { Line } = await import('../vignette/geom');
  const road = { cls: 'primary', name: '', bridge: false, tunnel: false, pts: [[0, 0], [0, 101]] } as never;
  const line = new Line([[0, 0], [0, 101]]);
  const course = { line, roads: [road], speedMps: 10, dailyFlow: 1000, truckShare: 0 };
  const layer = new RoadTraffic({ city: { bounds: { minX: -50, maxX: 50, minZ: -50, maxZ: 200 }, roads: [], buildings: [], rail: [] } as never,
    quality: 'low', hourly: { weekday: Array(24).fill(1), weekend: Array(24).fill(1) }, roadHeight: (_x, z) => .1 * z }, [course], 4, 1, 'test');
  const lane = (layer as unknown as { lanes: unknown[] }).lanes[0];
  const heightAt = (layer as unknown as { heightAt(l: unknown, s: number, x: number, z: number): number | null }).heightAt.bind(layer);
  for (const s of [0, 3.3, 99.9, 100.5, 101]) expect(heightAt(lane, s, 0, s)).toBeCloseTo(.1 * s, 9);
});
