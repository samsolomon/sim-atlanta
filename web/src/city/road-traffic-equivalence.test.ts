import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ArterialTraffic } from './arterial-traffic';
import { ConnectorTraffic } from './connector-traffic';
import { loadArterials } from './arterials';
import type { RoadTraffic } from './road-traffic';

// These run whole staged layers over thousands of frames: about 1 s alone, but several times that
// on the shared Studio under load, so they get a generous timeout rather than vitest's 5 s.

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
  // Float32 matrix writes against Object3D's double math. Lane corners are profile breakpoints,
  // so on a plane the profile itself is exact.
  expect(worst).toBeLessThan(2e-3);
}
type Paths = { stepLegacy(ms: number, dark: number): void; step(ms: number, dark: number, view?: THREE.Frustum): void };
const paths = (layer: RoadTraffic) => layer as unknown as Paths;

describe.skipIf(!staged)('road traffic’s frame path matches the legacy path', { timeout: 60_000 }, () => {
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

  it('re-poses far lanes at 15 Hz with poses no older than one tick, and near lanes every frame', () => {
    const make = () => new ArterialTraffic({ city: vd, arterials: loadArterials(J('arterials.json'), vd).corridors, hourly, roadHeight, quality: 'high' });
    const far = make(), every = make();
    const start = Date.parse('2026-11-20T17:00:00-05:00');
    const eyeFar = new THREE.Vector3(0, 5000, 0);
    const key = (c: number[]) => c.slice(12, 15).map(v => v.toFixed(3)).join(',');
    const history: Set<string>[] = [];
    let held = 0, compared = 0;
    for (let f = 0; f < 240; f++) {
      const ms = start + f * 1000 / 60;
      (every as unknown as Paths & { step(ms: number, d: number, v?: THREE.Frustum, eye?: THREE.Vector3): void }).step(ms, 0);
      history.push(new Set(cars(every).map(key)));
      (far as unknown as { step(ms: number, d: number, v?: THREE.Frustum, eye?: THREE.Vector3): void }).step(ms, 0, undefined, eyeFar);
      const now = cars(far);
      // A held car is drawn where the every-frame layer had it on an earlier frame.
      for (const c of now) if (!history.at(-1)!.has(key(c))) held++;
      // Every far car sits where the every-frame layer had a car within the last 1/15 s.
      const recent = history.slice(-5);
      for (const c of now) { expect(recent.some(h => h.has(key(c)))).toBe(true); compared++; }
    }
    expect(compared).toBeGreaterThan(1000);
    expect(held).toBeGreaterThan(0);
  });

  it('re-poses a lane near the camera every frame, and holds it within a 15 Hz tick when far', async () => {
    const { RoadTraffic } = await import('./road-traffic');
    const { Line } = await import('../vignette/geom');
    const pts: [number, number][] = [[0, 0], [0, 300]];
    const road = { cls: 'primary', name: '', bridge: false, tunnel: false, pts } as never;
    const course = { line: new Line(pts), roads: [road], speedMps: 12, dailyFlow: 1e9, truckShare: 0 };
    const layer = new RoadTraffic({ city: { bounds: { minX: -1e5, maxX: 1e5, minZ: -1e5, maxZ: 1e5 } } as never, quality: 'low',
      hourly: { weekday: Array(24).fill(1), weekend: Array(24).fill(1) }, roadHeight: () => 0 }, [course], 16, 1, 'near');
    const step = (ms: number, eye: THREE.Vector3) => (layer as unknown as { step(ms: number, d: number, v?: THREE.Frustum, eye?: THREE.Vector3): void }).step(ms, 0, undefined, eye);
    const t0 = Math.ceil(Date.parse('2026-11-20T17:00:00-05:00') / 1000) * 1000; // a whole second: a 15 Hz tick starts here or soon after
    for (const [eye, moving] of [[new THREE.Vector3(0, 30, 150), true], [new THREE.Vector3(0, 5000, 150), false]] as const) {
      const frames: string[] = [];
      // Three frames 5 ms apart, inside one 1/15 s tick of this lane whatever its stagger.
      let start = t0;
      const stagger = (layer as unknown as { lanes: { stagger: number }[] }).lanes[0].stagger;
      while (Math.floor((start - Date.UTC(2026, 0, 1)) / 1000 * 15 + stagger) !== Math.floor((start + 10 - Date.UTC(2026, 0, 1)) / 1000 * 15 + stagger)) start += 7;
      for (let f = 0; f < 3; f++) { step(start + 5 * f, eye); frames.push(cars(layer).map(c => c.slice(12, 15).map(v => v.toFixed(4)).join(',')).join('|')); }
      expect(frames[0].length).toBeGreaterThan(0);
      if (moving) { expect(frames[1]).not.toBe(frames[0]); expect(frames[2]).not.toBe(frames[1]); }
      else { expect(frames[1]).toBe(frames[0]); expect(frames[2]).toBe(frames[0]); }
    }
  });

  it('hides a held far car when a bus moves into its footprint within the tick', async () => {
    const { RoadTraffic } = await import('./road-traffic');
    const { Line } = await import('../vignette/geom');
    const pts: [number, number][] = [[0, 0], [0, 300]];
    const road = { cls: 'primary', name: '', bridge: false, tunnel: false, pts } as never;
    let bus = false;
    const layer = new RoadTraffic({ city: { bounds: { minX: -1e5, maxX: 1e5, minZ: -1e5, maxZ: 1e5 } } as never, quality: 'low',
      hourly: { weekday: Array(24).fill(1), weekend: Array(24).fill(1) }, roadHeight: () => 0, busOccupies: () => bus },
      [{ line: new Line(pts), roads: [road], speedMps: 12, dailyFlow: 1e9, truckShare: 0 }], 16, 1, 'held');
    const step = (ms: number) => (layer as unknown as { step(ms: number, d: number, v?: THREE.Frustum, eye?: THREE.Vector3): void }).step(ms, 0, undefined, new THREE.Vector3(0, 5000, 150));
    const stagger = (layer as unknown as { lanes: { stagger: number }[] }).lanes[0].stagger;
    let start = Math.ceil(Date.parse('2026-11-20T17:00:00-05:00') / 1000) * 1000;
    while (Math.floor((start - Date.UTC(2026, 0, 1)) / 1000 * 15 + stagger) !== Math.floor((start + 10 - Date.UTC(2026, 0, 1)) / 1000 * 15 + stagger)) start += 7;
    step(start);
    expect(layer.visibleCars).toBeGreaterThan(0);
    bus = true; // a bus now covers every footprint, within the same 15 Hz tick
    step(start + 5);
    expect(layer.visibleCars).toBe(0);
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

it('keeps a lane corner inside a profile step at its own height', async () => {
  const { RoadTraffic } = await import('./road-traffic');
  const { Line } = await import('../vignette/geom');
  // Codex's case: the lane turns at chainage 10.5, between the 10 m and 12 m samples.
  const pts: [number, number][] = [[0, 0], [0, 10.5], [10.5, 10.5]];
  const road = { cls: 'primary', name: '', bridge: false, tunnel: false, pts } as never;
  const course = { line: new Line(pts), roads: [road, road], speedMps: 10, dailyFlow: 1000, truckShare: 0 };
  const layer = new RoadTraffic({ city: { bounds: { minX: -50, maxX: 50, minZ: -50, maxZ: 200 }, roads: [], buildings: [], rail: [] } as never,
    quality: 'low', hourly: { weekday: Array(24).fill(1), weekend: Array(24).fill(1) }, roadHeight: (_x, z) => .2 * z }, [course], 4, 1, 'test');
  const lane = (layer as unknown as { lanes: unknown[] }).lanes[0];
  const heightAt = (layer as unknown as { heightAt(l: unknown, s: number, x: number, z: number): number | null }).heightAt.bind(layer);
  for (const s of [10, 10.25, 10.5, 11, 11.75, 12]) {
    const [x, z] = s <= 10.5 ? [0, s] : [s - 10.5, 10.5];
    expect(heightAt(lane, s, x, z)).toBeCloseTo(.2 * z, 9);
  }
});

describe.skipIf(!staged)('road traffic’s cached height profile on a hard surface', { timeout: 60_000 }, () => {
  const vd = staged ? J('vignette.json') : null!;
  const hourly = staged ? J('traffic.json').hourly : null!;
  // A drawn-terrain stand-in: a 4 m triangulated grid of random heights (a fold on every
  // triangle edge), a deck under ground roads at 200 < x < 230 that keeps the same road owner,
  // a hole band at 100 < z < 103, and bridges 7 m up.
  const corner = (i: number, j: number) => { const h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453; return 1.5 * (h - Math.floor(h)); };
  const terrain = (x: number, z: number) => {
    const gx = x / 4, gz = z / 4, i = Math.floor(gx), j = Math.floor(gz), u = gx - i, v = gz - j;
    return u + v <= 1
      ? corner(i, j) + (corner(i + 1, j) - corner(i, j)) * u + (corner(i, j + 1) - corner(i, j)) * v
      : corner(i + 1, j + 1) + (corner(i, j + 1) - corner(i + 1, j + 1)) * (1 - u) + (corner(i + 1, j) - corner(i + 1, j + 1)) * (1 - v);
  };
  // Plus 0.3 m kerb-height steps in the drawn surface on a 37 m diagonal grid, the smallest jump
  // an exact-sampling fallback must still catch.
  const kerb = (x: number, z: number) => (Math.floor((x + z) / 37) % 2 ? .3 : 0);
  const roadHeight = (x: number, z: number, road: { bridge?: boolean; tunnel?: boolean }) =>
    road.tunnel || (z > 100 && z < 103) ? null : terrain(x, z) + kerb(x, z) + (road.bridge ? 7 : 0) + (x > 200 && x < 230 ? 5 : 0);
  type Inner = { lanes: { course: { line: { length: number; vertexAt(s: number): number; pts: number[][] }; roads: { bridge?: boolean; tunnel?: boolean }[] } }[];
    heightAt(lane: unknown, s: number, x: number, z: number): number | null };
  it('stays within 2 cm of exact sampling every 0.5 m of every lane, corners and steps included', () => {
    for (const layer of [
      new ArterialTraffic({ city: vd, arterials: loadArterials(J('arterials.json'), vd).corridors, hourly, roadHeight, quality: 'high' }),
      new ConnectorTraffic({ city: vd, hourly, roadHeight, quality: 'high' }),
    ]) {
      const inner = layer as unknown as Inner;
      let worst = 0, mismatched = 0, samples = 0;
      for (const lane of inner.lanes) {
        const { line, roads } = lane.course;
        for (let s = 0; s <= line.length; s += .5) {
          const vertex = line.vertexAt(s), i = Math.min(Math.floor(vertex), line.pts.length - 2), f = vertex - i;
          const x = line.pts[i][0] + (line.pts[i + 1][0] - line.pts[i][0]) * f, z = line.pts[i][1] + (line.pts[i + 1][1] - line.pts[i][1]) * f;
          const exact = roadHeight(x, z, roads[Math.min(roads.length - 1, Math.floor(vertex))]);
          const got = inner.heightAt(lane, s, x, z);
          samples++;
          if ((exact === null) !== (got === null)) mismatched++;
          else if (exact !== null) worst = Math.max(worst, Math.abs(got! - exact));
        }
      }
      expect(samples).toBeGreaterThan(20000);
      expect(mismatched).toBe(0);
      expect(worst).toBeLessThan(.02);
    }
  });

  it('after an idle fill, samples exactly only inside eighths that fail their own check', () => {
    let calls = 0;
    const counted = (x: number, z: number, road: { bridge?: boolean; tunnel?: boolean }) => { calls++; return roadHeight(x, z, road); };
    const layer = new ArterialTraffic({ city: vd, arterials: loadArterials(J('arterials.json'), vd).corridors, hourly, roadHeight: counted, quality: 'high' });
    const inner = layer as unknown as Inner & { fillIdle(deadline: number): boolean };
    expect(inner.fillIdle(performance.now() - 1)).toBe(false); // an expired slice does nothing
    expect(inner.fillIdle(Infinity)).toBe(true);
    calls = 0;
    let samples = 0;
    for (const lane of inner.lanes) {
      const { line } = lane.course;
      for (let s = 0.37; s <= line.length; s += .5, samples++) {
        const vertex = line.vertexAt(s), i = Math.min(Math.floor(vertex), line.pts.length - 2), f = vertex - i;
        inner.heightAt(lane, s, line.pts[i][0] + (line.pts[i + 1][0] - line.pts[i][0]) * f, line.pts[i][1] + (line.pts[i + 1][1] - line.pts[i][1]) * f);
      }
    }
    // Kerbs every 37 m, decks, holes and a fold every 4 m still need some exact reads (5.7% here).
    expect(calls / samples).toBeLessThan(.08);
  });
});

describe('road traffic bridges cracks narrower than a tyre, and nothing wider', () => {
  type Inner = { lanes: unknown[]; heightAt(lane: unknown, s: number, x: number, z: number): number | null };
  const city = { bounds: { minX: -1e5, maxX: 1e5, minZ: -1e5, maxZ: 1e5 }, roads: [], buildings: [], rail: [] } as never;
  const hourly = { weekday: Array(24).fill(1), weekend: Array(24).fill(1) };
  async function layerOn(pts: [number, number][], roadHeight: (x: number, z: number) => number | null) {
    const { RoadTraffic } = await import('./road-traffic');
    const { Line } = await import('../vignette/geom');
    const road = { cls: 'primary', name: '', bridge: false, tunnel: false, pts } as never;
    const course = { line: new Line(pts), roads: pts.slice(1).map(() => road), speedMps: 10, dailyFlow: 1e9, truckShare: 0 };
    const layer = new RoadTraffic({ city, quality: 'low', hourly, roadHeight }, [course], 64, 1, 'test') as unknown as Inner;
    return { layer, lane: layer.lanes[0] };
  }

  it('bridges the two real cracks between their rims at every knot alignment', async () => {
    const { default: sites } = await import('./fixtures/traffic-height-cracks.json');
    for (const { samples } of sites as unknown as { samples: [number, number, number, number | null][] }[]) {
      // The recorded drawn surface, every 1 cm along the real lane, around the crack.
      const ys = samples.map(r => r[3]);
      const trend = (k: number) => ys[0]! + (ys.at(-1)! - ys[0]!) * k / (ys.length - 1);
      const crack = ys.map((y, k) => y === null || Math.abs(y - trend(k)) > .03);
      const first = crack.indexOf(true), last = crack.lastIndexOf(true);
      expect(first).toBeGreaterThan(30);
      expect(last - first).toBeLessThan(25); // narrower than 25 cm
      const rims = [ys[first - 1]!, ys[last + 1]!];
      for (let o = 0; o < 25; o++) { // shift where the profile's knots fall
        const window = samples.slice(o);
        const near = (x: number, z: number) => {
          let best = 0, d = Infinity;
          for (let k = 0; k < window.length; k++) { const e = (window[k][1] - x) ** 2 + (window[k][2] - z) ** 2; if (e < d) { d = e; best = k; } }
          return window[best][3];
        };
        const { layer, lane } = await layerOn(window.map(r => [r[1], r[2]] as [number, number]), near);
        let s = 0;
        for (let k = 0; k < window.length; k++) {
          if (k) s += Math.hypot(window[k][1] - window[k - 1][1], window[k][2] - window[k - 1][2]);
          const got = layer.heightAt(lane, s, window[k][1], window[k][2]);
          expect(got).not.toBeNull();
          if (crack[k + o]) {
            expect(got!).toBeGreaterThanOrEqual(Math.min(...rims) - .01);
            expect(got!).toBeLessThanOrEqual(Math.max(...rims) + .01);
          } else expect(Math.abs(got! - ys[k + o]!)).toBeLessThan(.02);
        }
      }
    }
  });

  it('never bridges a 30 cm gap or dip, and always bridges an 18 cm one, at every alignment', async () => {
    const pts: [number, number][] = [[0, 0], [0, 20]];
    for (const width of [.3, .18]) for (const kind of ['hole', 'dip'] as const) for (let o = 0; o < 26; o++) {
      const from = 9 + o / 100, to = from + width;
      const { layer, lane } = await layerOn(pts, (_x, z) => z > from && z < to ? (kind === 'hole' ? null : -5) : .02 * z);
      for (let s = from + .005; s < to; s += .01) {
        const got = layer.heightAt(lane, s, 0, s);
        if (width >= .25) expect(got).toBe(kind === 'hole' ? null : -5);
        else expect(Math.abs(got! - .02 * s)).toBeLessThan(.01);
      }
    }
  });
});

it('never bridges a crack within a tyre’s width of a lane end', async () => {
  const { RoadTraffic } = await import('./road-traffic');
  const { Line } = await import('../vignette/geom');
  const pts: [number, number][] = [[0, 0], [0, 20]];
  const road = { cls: 'primary', name: '', bridge: false, tunnel: false, pts } as never;
  for (const [from, to] of [[19.9, 19.98], [0.02, 0.1]]) {
    const course = { line: new Line(pts), roads: [road], speedMps: 10, dailyFlow: 1e9, truckShare: 0 };
    const layer = new RoadTraffic({ city: { bounds: { minX: -1e5, maxX: 1e5, minZ: -1e5, maxZ: 1e5 } } as never, quality: 'low',
      hourly: { weekday: Array(24).fill(1), weekend: Array(24).fill(1) }, roadHeight: (_x, z) => z > from && z < to ? null : 0 }, [course], 64, 1, 't');
    const inner = layer as unknown as { lanes: unknown[]; heightAt(l: unknown, s: number, x: number, z: number): number | null };
    for (let s = from + .01; s < to; s += .01) expect(inner.heightAt(inner.lanes[0], s, 0, s)).toBeNull();
  }
});

it('bridges a crack centred on a profile step boundary', async () => {
  const { RoadTraffic } = await import('./road-traffic');
  const { Line } = await import('../vignette/geom');
  const pts: [number, number][] = [[0, 0], [0, 20]];
  const road = { cls: 'primary', name: '', bridge: false, tunnel: false, pts } as never;
  const course = { line: new Line(pts), roads: [road], speedMps: 10, dailyFlow: 1e9, truckShare: 0 };
  // Codex's case: a 10 cm dip centred on the 10 m boundary between two 2 m steps.
  const layer = new RoadTraffic({ city: { bounds: { minX: -1e5, maxX: 1e5, minZ: -1e5, maxZ: 1e5 } } as never, quality: 'low',
    hourly: { weekday: Array(24).fill(1), weekend: Array(24).fill(1) }, roadHeight: (_x, z) => z > 9.95 && z < 10.05 ? -6 : 0 }, [course], 64, 1, 't');
  const inner = layer as unknown as { lanes: unknown[]; heightAt(l: unknown, s: number, x: number, z: number): number | null };
  for (const s of [9.96, 10, 10.04]) expect(inner.heightAt(inner.lanes[0], s, 0, s)).toBeCloseTo(0, 6);
});
