import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { Line } from '../vignette/geom';
import { busMaterial } from '../vignette/xcelsior';
import { CityGhosts, CUT_HALF, cutSection, GHOST, trackLevel, tunnelLevel } from './ghosts';
import { carCover, CityTrains, TRACK_WINDOW, type HoleOptions } from './trains';
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

describe('Cutaway (Sam, 2026-11-28)', () => {
  const along = new THREE.Vector3(1, 0, 0), across = new THREE.Vector3(0, 0, -1); // a track along +x; left is −z
  const centre = new THREE.Vector3(0, -12, 0);

  it('opens the ground where it stands between the eye and the train, wall on the far side', () => {
    const lid = new THREE.Matrix4(), box = new THREE.Matrix4();
    // Eye to the south (+z), up high: the floor seen from it meets the rim south of the track.
    const eye = new THREE.Vector3(0, 300, 300);
    const { a } = cutSection({ centre, along, across, rim: 1.5, length: 6.6, eye, width: 1 }, lid, box);
    expect(a).toBeLessThan(0); // toward +z, which is −across
    // The lid spans from the far rim (north, −z) to the floor's projection (south).
    const corner = (x: number, z: number) => new THREE.Vector3(x, 0, z).applyMatrix4(lid);
    const zs = [corner(-0.5, -0.5).z, corner(0.5, 0.5).z].sort((p, q) => p - q);
    expect(zs[0]).toBeCloseTo(-CUT_HALF, 5);
    const k = 13.5 / (300 + 12);
    expect(zs[1]).toBeCloseTo(CUT_HALF + 300 * k, 4);
    expect(corner(0, 0).y).toBeCloseTo(1.5);
    // The box's one wall (at local +x) stands on the far, north side.
    expect(new THREE.Vector3(CUT_HALF, 0, 0).applyMatrix4(box).z).toBeCloseTo(-CUT_HALF);
    // Straight overhead, the opening is the rim itself.
    cutSection({ centre, along, across, rim: 1.5, length: 6.6, eye: new THREE.Vector3(0, 500, 0), width: 1 }, lid, box);
    expect(new THREE.Vector3(0.5, 0, 0.5).applyMatrix4(lid).z - new THREE.Vector3(-0.5, 0, -0.5).applyMatrix4(lid).z).toBeCloseTo(-2 * CUT_HALF, 5);
  });

  function cutSetup(holes: HoleOptions) {
    const s = setup();
    s.trains.holes = holes;
    s.trains.holeEye.set(0, 400, 300);
    const run = (states: ReturnType<typeof train>[]) => { for (let i = 0; i < 2; i++) s.run(states); }; // holes follow last frame's trains
    return { ...s, run };
  }

  it('opens the nearest trains in tunnel (cap) and drops their ghost, keeping ghosts for the rest', () => {
    const { trains, run, ghosts, edges } = cutSetup({ scope: 'all', shape: 'cut', cap: 1 });
    trains.holeFocus.x = 300;
    run([train('near', 300, 4), train('far', 500, 4)]);
    expect([...trains.holeTrains]).toEqual(['near']);
    expect(trains.holeCars).toBe(4);
    expect(trains.ghostCars).toBe(4); // only 'far'
    const { lid, box } = ghosts.cutaway(edges);
    expect(lid.n).toBeGreaterThan(5);
    expect(box.n).toBe(lid.n + 1); // one far end wall
  });

  it('opens only the selected train in the selected scope, which keeps its x-ray where shut', () => {
    const { trains, run } = cutSetup({ scope: 'selected', shape: 'lens', cap: 4 });
    trains.xrayId = 'sel';
    run([train('sel', 300, 4), train('other', 500, 4)]);
    expect([...trains.holeTrains]).toEqual(['sel']);
    expect(trains.holeCars).toBe(4);
    expect(trains.ghostCars).toBe(8); // its x-ray plus the other train's ghost
  });

  it("keeps a cutaway train's own ghost out of the openings, and opens even under a short roof", () => {
    const ghosts = new CityGhosts();
    const cut = ghosts.batch('c', () => new THREE.BoxGeometry(), [], 2, true, { pass: 'ghost-cut' }).mesh.material as THREE.Material;
    expect([cut.stencilWrite, cut.stencilFunc, cut.stencilWriteMask]).toEqual([true, THREE.NotEqualStencilFunc, 0]);
    // A 4 m roof between two 6 m section centres still opens, so the car under it isn't lost.
    const edges = Array.from({ length: 4 }, () => new THREE.Plane(new THREE.Vector3(0, 1, 0), 1e6));
    const roof = { line, elev: () => -12, openToSky: (t: number) => !(t > 601 && t < 605) };
    const trains = new CityTrains([roof], manifest, bounds, new Map([['blue', '#0075b2']]), edges);
    const g = new CityGhosts();
    trains.ghosts = g;
    trains.holes = { scope: 'all', shape: 'cut', cap: 4 };
    for (let i = 0; i < 2; i++) { g.begin(); trains.update([train('t', -8.45, 1)], 0); g.end(); }
    expect(trains.holeTrains.has('t')).toBe(true);
    expect(g.cutaway(edges).lid.n).toBeGreaterThan(0);
    expect(trains.holeCars + trains.ghostCars).toBeGreaterThan(0);
  });

  it('lays the cutaway floor where the wheels stand', () => {
    const { trains, run, ghosts, edges } = cutSetup({ scope: 'all', shape: 'cut', cap: 4 });
    run([train('t', 300, 4)]);
    const m = new THREE.Matrix4();
    ghosts.cutaway(edges).box.mesh.getMatrixAt(0, m);
    // The tunnel's alignment is at −12; a car rides 0.55 over it; flat rails sit on the floor.
    expect(new THREE.Vector3().setFromMatrixPosition(m).y).toBeCloseTo(-12 + 0.5, 3);
    expect(trains.holeCars).toBe(4);
  });

  it('costs nothing when no train is in tunnel', () => {
    const { trains, run, ghosts } = cutSetup({ scope: 'all', shape: 'cut', cap: 4 });
    run([train('open', -300, 4)]);
    expect(trains.holeTrains.size).toBe(0);
    expect(ghosts.calls).toBe(0);
  });

  it('draws the cutaway in three state before ghosts, and clears stencil only for a lid', () => {
    const ghosts = new CityGhosts();
    const geo = new THREE.BoxGeometry();
    ghosts.begin();
    ghosts.batch('g', () => geo, [], 2).add(new THREE.Matrix4(), GHOST.tunnel);
    const { lid, box } = ghosts.cutaway([]);
    lid.add(new THREE.Matrix4(), 0);
    box.add(new THREE.Matrix4(), 0);
    ghosts.end();
    const order: string[] = [];
    const gl = new Proxy({ STENCIL_BUFFER_BIT: 1024, COLOR_BUFFER_BIT: 16384 } as Record<string, unknown>, { get: (t, k: string) => k in t ? t[k] : (...a: unknown[]) => { if (k === 'clear') order.push(`clear ${a[0]}`); } });
    const renderer = { getContext: () => gl, state: { setBlending: vi.fn(), buffers: { color: { setMask: vi.fn(), setClear: vi.fn() }, stencil: { setMask: vi.fn(), setClear: vi.fn() } } },
      renderBufferDirect: vi.fn((_c, _s, _g, m: THREE.Material) => order.push(m.name)) } as unknown as THREE.WebGLRenderer;
    ghosts.armed = true;
    ghosts.draw(renderer, new THREE.Scene(), new THREE.PerspectiveCamera());
    expect(order).toEqual(['clear 1024', 'ghost lid', 'ghost box', 'clear 16384', 'ghost ghost']);
    const m = (n: string) => (ghosts.group.children.find(c => (c as THREE.Mesh).material && ((c as THREE.Mesh).material as THREE.Material).name === n) as THREE.Mesh).material as THREE.MeshLambertMaterial;
    expect([m('ghost lid').colorWrite, m('ghost lid').stencilZPass, m('ghost box').depthFunc]).toEqual([false, THREE.ReplaceStencilOp, THREE.AlwaysDepth]);
    // Another train's ghost ignores the openings (one beside it must not erase it).
    expect(m('ghost ghost').stencilWrite).toBe(false);
    expect(m('ghost box').customProgramCacheKey()).toBe(busMaterial({ value: 0 }).customProgramCacheKey());
  });
});
