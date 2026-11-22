import { describe, expect, it } from 'vitest';
import type { VRoad } from '../vignette/world';
import { Line } from '../vignette/geom';
import { cityTravellers, travellerAt, type Traveller } from './walkways';

const bounds = { minX: -100, minZ: -100, maxX: 300, maxZ: 100 };
const sidewalk: VRoad = { cls: 'footway', sub: 'sidewalk', bridge: false, tunnel: false, name: null, pts: [[0, 0], [160, 0]] };
const trail: VRoad = { ...sidewalk, sub: null, name: 'Westside Beltline Connector', pts: [[0, 60], [160, 60]] };
const city = { roads: [sidewalk, trail], bounds, buildings: [], rail: [] };

describe('mapped outdoor footways', () => {
  it('gives the ground trail both modes and more people per metre than an ordinary sidewalk', () => {
    const people = cityTravellers(city, () => 10, true);
    const walkers = people.filter(p => !p.way.trail), users = people.filter(p => p.way.trail);
    expect(walkers.length).toBeGreaterThan(0);
    expect(walkers.every(p => !p.rider)).toBe(true);
    expect(users.length).toBeGreaterThan(walkers.length);
    expect(users.some(p => p.rider)).toBe(true);
    expect(users.some(p => !p.rider)).toBe(true);
    expect(cityTravellers(city, () => 10, true)).toEqual(people);
  });
  it('skips a named bridge, tunnel, crosswalk and trail piece extending off the board', () => {
    const roads: VRoad[] = [{ ...trail, bridge: true }, { ...trail, tunnel: true }, { ...sidewalk, sub: 'crosswalk' },
      { ...trail, pts: [[-101, 60], [70, 60]] }];
    expect(cityTravellers({ ...city, roads }, () => 0, false)).toEqual([]);
  });
  it('splits at missing terrain and avoids the building and the painted vehicle lane', () => {
    const people = cityTravellers({ ...city, roads: [trail, { ...sidewalk, cls: 'primary', pts: [[120, 0], [120, 95]] }],
      buildings: [{ id: 'hall', h: 22, floors: 5, rings: [[[0, 50], [34, 50], [34, 70], [0, 70]]] }] },
      (x) => x > 74 && x < 82 ? null : 0, true);
    expect(people.length).toBeGreaterThan(0);
    for (const p of people) {
      expect(p.way.from).toBeGreaterThan(34);
      expect(p.way.to < 75 || p.way.from > 81).toBe(true);
      expect(p.way.to < 114 || p.way.from > 126).toBe(true);
    }
  });
  it('turns back before a bare-earth height step in a mapped sidewalk', () => {
    const people = cityTravellers({ ...city, roads: [sidewalk] }, x => x < 83 ? 0 : 4, true);
    expect(people.length).toBeGreaterThan(0);
    expect(people.every(p => p.way.to < 83 || p.way.from > 83)).toBe(true);
  });
  it('replays both directions from scene time and turns inside the supported interval', () => {
    const p: Traveller = { way: { line: new Line([[10, 0], [110, 0]]), from: 2, to: 98, trail: false },
      rider: false, size: 1, look: 0, phase: 0, speed: 1 };
    const first = travellerAt(p, 3);
    const returning = travellerAt(p, 192 - 3);
    expect(first.x).toBe(returning.x);
    expect(first.z).toBe(-returning.z);
    expect(first.angle).toBeCloseTo(Math.PI / 2);
    expect(returning.angle).toBeCloseTo(-Math.PI / 2);
    expect(travellerAt(p, -3)).toEqual({ ...returning, stride: Math.sin(-3 * 4.1) });
    expect(travellerAt(p, 96).x).toBe(108);
    expect(travellerAt(p, 3)).toEqual(first);
  });
});

it('keeps distant figures cheap and reveals articulated figures when a paused camera moves closer', async () => {
  const { PerspectiveCamera, InstancedMesh, Matrix4, Vector3 } = await import('three');
  const { StreetFigures } = await import('./street-figures');
  const people = cityTravellers(city, () => 2, true);
  const figures = new StreetFigures(people, () => 2, true);
  const camera = new PerspectiveCamera(40, 1.4, 1, 10000);
  const aim = (distance: number) => {
    camera.position.set(80, distance * .5, 30 + distance);
    camera.lookAt(80, 2, 30);
    figures.update(0, camera, 800);
  };
  const active = () => figures.group.children.filter(m => m instanceof InstancedMesh && m.count > 0);
  aim(3000);
  expect(active()).toHaveLength(2);
  aim(170);
  expect(active()).toHaveLength(6);
  const body = active()[0] as InstanceType<typeof InstancedMesh>;
  const atStart = new Matrix4();
  body.getMatrixAt(0, atStart);
  expect(new Vector3().setFromMatrixPosition(atStart).y).toBeCloseTo(2);
  figures.update(4000, camera, 800);
  const moved = new Matrix4();
  body.getMatrixAt(0, moved);
  expect(moved.equals(atStart)).toBe(false);
  figures.update(0, camera, 800);
  body.getMatrixAt(0, moved);
  expect(moved.equals(atStart)).toBe(true);
  figures.dispose();
});
