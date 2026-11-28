import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { Line } from '../vignette/geom';
import { busMaterial } from '../vignette/xcelsior';
import { CityGhosts, GHOST, trackLevel, tunnelLevel } from './ghosts';
import { carCover, CityTrains, TRACK_WINDOW } from './trains';
import { VehicleFollow } from './vehicle-follow';
import { xrayTarget } from './xray';

const M = 6371000 * Math.PI / 180;
const bounds = { minX: -600, maxX: 600, minZ: -100, maxZ: 100 };
const manifest = { name: 'mouth', origin: { lon: 0, lat: 0 }, bounds, notes: '', sources: [], profiles: { track: { s0: 0, step: 1, z: [-12] } } };
/** A straight line along x, s = x + 600; open to the sky west of x = 0, tunnel east of it. */
const line = new Line([[-600, 0], [600, 0]]);
const intoTunnel = { line, elev: (s: number) => (s < 600 ? 0 : -12), openToSky: (s: number) => s < 600 };

function train(id: string, x: number, cars = 4, heading = 90) {
  return { id, routeId: 'blue', pathId: 'track', heading, lon: x / M, lat: 0,
    s: { value: x + 600, tier: 'scheduled' as const, source: 'test', asOf: '' }, headsign: '', vehicleType: 'rail',
    lengthM: { value: cars * 23, tier: 'illustrative' as const, source: 'test', asOf: '' } };
}

function setup() {
  const edges = Array.from({ length: 4 }, () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e6));
  const trains = new CityTrains([intoTunnel], manifest, bounds, new Map([['blue', '#0075b2']]), edges);
  const ghosts = new CityGhosts();
  trains.ghosts = ghosts;
  const cab = () => ghosts.batch('cq400 cab', () => new THREE.BufferGeometry(), edges, 64);
  const mid = () => ghosts.batch('cq400 middle', () => new THREE.BufferGeometry(), edges, 192);
  const run = (states: ReturnType<typeof train>[]) => { ghosts.begin(); trains.update(states, 0); ghosts.end(); };
  /** Every ghost car this frame: world centre x, level and clip. */
  const ghostCars = () => [cab(), mid()].flatMap(b => Array.from({ length: b.n }, (_, i) => {
    const m = new THREE.Matrix4();
    b.mesh.getMatrixAt(i, m);
    const clip = new THREE.Vector4().fromArray(b.mesh.geometry.getAttribute('aGhostClip').array as Float32Array, i * 4);
    return { x: new THREE.Vector3().setFromMatrixPosition(m).x, level: Math.round((b.mesh.geometry.getAttribute('aGhost').array[i] as number) * 16), clip };
  }));
  const drawn = (id = 't') => trains.group.children.filter(c => c.visible && c.userData.trainId === id);
  return { trains, ghosts, run, ghostCars, drawn, edges };
}

describe('Ghost underground classification', () => {
  it('sorts a car into open, straddling a mouth (with the mouth found) or hidden', () => {
    expect(carCover(intoTunnel, 500)).toEqual({ kind: 'open' });
    const straddle = carCover(intoTunnel, 605);
    expect(straddle.kind).toBe('straddle');
    if (straddle.kind === 'straddle') {
      expect(straddle.mouth).toBeCloseTo(600, 3);
      expect(straddle.ahead).toBe(true);
    }
    expect(carCover(intoTunnel, 700)).toEqual({ kind: 'hidden' });
    // Coming out of the tunnel the other way: hidden behind (toward −s).
    const out = carCover({ line, elev: () => 0, openToSky: (s: number) => s > 600 }, 595);
    expect(out.kind === 'straddle' && !out.ahead && Math.abs(out.mouth - 600) < 1e-3).toBe(true);
    // Past the line's ends nothing is hidden: no ghost beyond the drawn track.
    expect(carCover({ line, elev: () => 0, openToSky: () => true }, 1199).kind).toBe('open');
  });

  it('ranks tunnel depth from the schematic profile, deeper fainter', () => {
    expect(tunnelLevel(-5)).toBe(GHOST.tunnel);
    expect(tunnelLevel(-10)).toBeLessThan(tunnelLevel(-16));
    expect(tunnelLevel(-16)).toBeLessThan(tunnelLevel(-22));
    expect(tunnelLevel(-200)).toBe(GHOST.tunnelDeepest);
    expect(trackLevel(0, 200)).toBe(GHOST.track);
    expect(trackLevel(200, 200)).toBe(GHOST.trackFaintest);
    expect(trackLevel(50, 200)).toBeLessThan(trackLevel(150, 200));
  });

  it('never loses a car at a portal: each car is drawn, ghosted, or both while it straddles', () => {
    const { run, ghostCars, drawn } = setup();
    const units = 4, pitch = 23.8;
    let straddles = 0, buried = 0;
    for (let x = -120; x <= 160; x += 2) {
      run([train('t', x, units)]);
      const ghosts = ghostCars();
      const cars = Array.from({ length: units }, (_, i) => x + ((units - 1) / 2 - i) * pitch);
      for (const c of cars) {
        const shown = drawn().some(d => Math.abs(d.position.x - c) < 0.5);
        const ghost = ghosts.find(g => Math.abs(g.x - c) < 0.5);
        expect(shown || !!ghost, `car at ${c.toFixed(1)} (train at ${x})`).toBe(true);
        if (c + 11.45 < 0) expect(ghost, `open car at ${c}`).toBeUndefined();
        if (c - 11.45 > 0) expect(shown, `buried car at ${c}`).toBe(false);
        if (ghost && !shown) buried++;
        if (ghost && shown) {
          straddles++;
          // Straddling: its ghost keeps only the tunnel side of the mouth.
          const side = (px: number) => ghost.clip.x * px + ghost.clip.w;
          expect(side(5)).toBeGreaterThan(0);
          expect(side(-5)).toBeLessThan(0);
        }
      }
    }
    expect(straddles).toBeGreaterThan(20);
    expect(buried).toBeGreaterThan(100);
  });

  it('carries a track window only where hidden, fading away from the train, fixed to the line', () => {
    const { run, ghosts, edges } = setup();
    const dashes = () => {
      const b = ghosts.track(edges);
      return Array.from({ length: b.n }, (_, i) => {
        const m = new THREE.Matrix4();
        b.mesh.getMatrixAt(i, m);
        return { x: new THREE.Vector3().setFromMatrixPosition(m).x, level: Math.round((b.mesh.geometry.getAttribute('aGhost').array[i] as number) * 16) };
      });
    };
    run([train('t', 200, 4)]);
    const a = dashes();
    expect(a.length).toBeGreaterThan(10);
    expect(a.every(d => d.x > 0)).toBe(true);
    const half = 2 * 23.8;
    const w = Math.max(TRACK_WINDOW.min, TRACK_WINDOW.share * (4 * 23.8));
    expect(Math.min(...a.map(d => d.x))).toBeGreaterThan(200 - half - w - TRACK_WINDOW.pitch);
    expect(Math.max(...a.map(d => d.x))).toBeLessThan(200 + half + w + TRACK_WINDOW.pitch);
    expect(a.filter(d => Math.abs(d.x - 200) < 30).every(d => d.level === GHOST.track)).toBe(true);
    const far = a.reduce((p, d) => (Math.abs(d.x - 200) > Math.abs(p.x - 200) ? d : p));
    expect(far.level).toBeGreaterThan(GHOST.track);
    // A metre later the dashes that remain are where they were.
    run([train('t', 201, 4)]);
    const b = dashes().map(d => d.x);
    expect(a.filter(d => Math.abs(d.x - 201) < 100).every(d => b.some(x => Math.abs(x - d.x) < 1e-6))).toBe(true);
  });

  it('fades the track window in ahead of a train nearing a portal, never all at once', () => {
    const { run, ghosts, edges } = setup();
    const near = (x: number) => {
      run([train('t', x, 4)]);
      const b = ghosts.track(edges);
      return Array.from({ length: b.n }, (_, i) => Math.round((b.mesh.geometry.getAttribute('aGhost').array[i] as number) * 16));
    };
    // Far from the mouth: nothing. Approaching: only faint dashes. At the mouth: full strength.
    expect(near(-500)).toHaveLength(0);
    const approach = near(-48 - 100);
    expect(approach.length).toBeGreaterThan(0);
    expect(Math.min(...approach)).toBeGreaterThan(GHOST.track + 1);
    let prev = GHOST.trackFaintest + 1;
    for (let x = -260; x <= -40; x += 4) {
      const levels = near(x);
      const strongest = levels.length ? Math.min(...levels) : GHOST.trackFaintest + 1;
      // Each step brings it at most one level nearer.
      expect(prev - strongest, `at ${x}`).toBeLessThanOrEqual(1);
      prev = strongest;
    }
  });

  it('x-rays every car of the selected train, open or buried, unclipped', () => {
    const { trains, run, ghostCars } = setup();
    trains.xrayId = 'sel';
    run([train('sel', -40, 4), train('other', 300, 4)]);
    const g = ghostCars();
    const x = g.filter(c => c.level === GHOST.xrayTrain);
    expect(x).toHaveLength(4);
    expect(x.every(c => c.clip.x === 0 && c.clip.w === 1)).toBe(true);
    // Its centreline for ink's self test: both ends of each car, one polyline from lead to tail.
    expect(trains.xrayPoints).toHaveLength(8);
    const xs = trains.xrayPoints.map(p => p.x);
    expect(xs).toEqual([...xs].sort((a, b) => b - a));
    // The other train is in tunnel: an ordinary ghost.
    expect(g.filter(c => c.level >= GHOST.tunnel && c.level <= GHOST.tunnelDeepest)).toHaveLength(4);
  });

  it('adds nothing without a ghost layer (?perf&ghost=off)', () => {
    const edges = [new THREE.Plane()];
    const trains = new CityTrains([intoTunnel], manifest, bounds, new Map([['blue', '#0075b2']]), edges);
    trains.update([train('t', 200, 4)], 0);
    expect(trains.ghostCars).toBe(0);
    expect(trains.surfaceCars).toBe(0);
  });
});

describe('X-ray target hand-off', () => {
  it('follows the followed vehicle, through a tier handoff, then falls back to the selection', () => {
    const follow = new VehicleFollow();
    const card = { kind: 'train' as const, id: 'timetable-trip' };
    expect(xrayTarget(follow.vehicle, card)).toEqual({ kind: 'train', id: 'timetable-trip' });
    follow.start({ kind: 'train', id: 'timetable-trip', pathId: 'p', tier: 'scheduled' });
    follow.frame({ id: 'timetable-trip', pathId: 'p', tier: 'scheduled', routeId: 'r', heading: 90, x: 0, z: 0, cars: [{ x: 0, z: 0 }], hidden: null },
      { minX: -1e4, maxX: 1e4, minZ: -1e4, maxZ: 1e4 }, 0, false);
    // Live rail replaces the timetable trip: follow hands the camera to the matched live train.
    follow.handoff([{ id: 'live-7', pathId: 'p', tier: 'live', routeId: 'r', heading: 92, x: 40, z: 0, cars: [], hidden: 'underground' }]);
    expect(xrayTarget(follow.vehicle, card)).toEqual({ kind: 'train', id: 'live-7' });
    follow.stop();
    expect(xrayTarget(follow.vehicle, card)).toEqual({ kind: 'train', id: 'timetable-trip' });
    expect(xrayTarget(follow.vehicle, null)).toBeNull();
  });

  it('covers buses, and never freight', () => {
    expect(xrayTarget(undefined, { kind: 'bus', id: 'marta:bus:1' })).toEqual({ kind: 'bus', id: 'marta:bus:1' });
    expect(xrayTarget({ kind: 'bus', id: 'marta:bus:2', tier: 'live' }, null)).toEqual({ kind: 'bus', id: 'marta:bus:2' });
    expect(xrayTarget({ kind: 'freight', id: 'f', tier: 'illustrative' }, { kind: 'bus', id: 'b' })).toBeNull();
    expect(xrayTarget(undefined, { kind: 'freight', id: 'f', line: '', railroad: '', consist: '', lead: 0 } as never)).toBeNull();
  });
});

describe('Ghost draw', () => {
  it('shares the bus program: same custom key and defines, depth test off, opaque', () => {
    const ghosts = new CityGhosts();
    const edges = Array.from({ length: 4 }, () => new THREE.Plane());
    const m = ghosts.batch('k', () => new THREE.BoxGeometry(), edges, 2).mesh.material as THREE.MeshLambertMaterial;
    const bus = busMaterial({ value: 0 });
    expect(m.customProgramCacheKey()).toBe(bus.customProgramCacheKey());
    expect([m.type, m.vertexColors, m.side, m.transparent, m.blending, m.flatShading]).toEqual([bus.type, bus.vertexColors, bus.side, bus.transparent, bus.blending, bus.flatShading]);
    expect(m.clippingPlanes).toBe(edges);
    expect([m.depthTest, m.depthWrite]).toEqual([false, false]);
  });

  it('draws only when armed and restores every GL state it changes by hand', () => {
    const ghosts = new CityGhosts();
    const geometry = new THREE.BoxGeometry();
    ghosts.begin();
    ghosts.batch('k', () => geometry, [], 4).add(new THREE.Matrix4(), GHOST.tunnel);
    ghosts.end();
    const calls: string[] = [];
    const gl = new Proxy({ BLEND_EQUATION_RGB: 1, BLEND_EQUATION_ALPHA: 2, COLOR_CLEAR_VALUE: 3, FUNC_ADD: 10, MIN: 11, BLEND: 12, COLOR_BUFFER_BIT: 13 } as Record<string, unknown>, {
      get: (t, k: string) => k in t ? t[k] : (...a: unknown[]) => {
        calls.push(`${k}(${a.join(',')})`);
        if (k === 'getParameter') return a[0] === 3 ? new Float32Array([0.1, 0.2, 0.3, 1]) : 32774;
      },
    });
    const renderer = { getContext: () => gl, state: { setBlending: vi.fn(), buffers: { color: { setMask: vi.fn(), setClear: vi.fn() } } }, renderBufferDirect: vi.fn(() => { calls.push('draw'); }) } as unknown as THREE.WebGLRenderer;
    const camera = new THREE.PerspectiveCamera();
    ghosts.draw(renderer, new THREE.Scene(), camera);
    expect(renderer.renderBufferDirect).not.toHaveBeenCalled();
    ghosts.armed = true;
    ghosts.draw(renderer, new THREE.Scene(), camera);
    expect(renderer.renderBufferDirect).toHaveBeenCalledTimes(1);
    expect(ghosts.armed).toBe(false);
    expect(calls).toContain('colorMask(false,false,false,true)');
    // Overlaps keep the lowest code: blending on with MIN on alpha before the batch draws.
    const at = (c: string) => calls.indexOf(c);
    expect(at('enable(12)')).toBeGreaterThan(-1);
    expect(at('blendEquationSeparate(10,11)')).toBeGreaterThan(at('enable(12)'));
    expect(at('draw')).toBeGreaterThan(at('blendEquationSeparate(10,11)'));
    expect(at('disable(12)')).toBeGreaterThan(at('draw'));
    expect(calls.filter(c => c !== 'draw').slice(-3)).toEqual(['disable(12)', 'blendEquation(10)', 'colorMask(true,true,true,true)']);
    expect(calls.some(c => c.startsWith('getParameter'))).toBe(false);
  });
});
