import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Line, type P2 } from '../vignette/geom';
import type { Ribbon, Section } from './connector-corridor';
import { PARAPET_COLOR, roadLint, TREAD_COLORS, type LintBoard } from './road-lint';

/** A flat quad x0..x1, z0..z1 at height y in one vertex colour, wound to face up. */
function quad(x0: number, x1: number, z0: number, z1: number, y: number, hex: string, y1 = y) {
  const p = [[x0, y, z0], [x0, y, z1], [x1, y1, z1], [x0, y, z0], [x1, y1, z1], [x1, y1, z0]].flat();
  const c = new THREE.Color(hex);
  return { p, c: Array.from({ length: 6 }, () => [c.r, c.g, c.b]).flat() };
}
function mesh(name: string, parts: { p: number[]; c: number[] }[]) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(parts.flatMap(q => q.p), 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(parts.flatMap(q => q.c), 3));
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial());
  m.name = name;
  return m;
}
const board: LintBoard = { id: 'test', bounds: { minX: -100, maxX: 100, minZ: -100, maxZ: 100 }, terrainAt: () => 0, terrain: [] };
const ROAD = TREAD_COLORS.road[0], WALK = TREAD_COLORS.walk[0];

describe('road lint', () => {
  it('counts two road treads within 0.30 m as stacked, and not a crossing above it', () => {
    const scene = new THREE.Group();
    scene.add(mesh('Decks and embedded rails', [
      quad(0, 20, 0, 10, 5, ROAD), quad(10, 30, 0, 10, 5.1, ROAD), // 10 m × 10 m stacked 0.1 m apart
      quad(40, 50, 0, 10, 5, ROAD), quad(40, 50, 0, 10, 8, ROAD), // a crossing 3 m above
      quad(60, 70, 0, 10, 5, ROAD), quad(60, 70, 0, 10, 5.2, WALK), // a walk on a road
    ]));
    const r = roadLint(scene, [board]).boards.test;
    expect(r.stackedRoadM2).toBeGreaterThanOrEqual(100);
    expect(r.stackedRoadM2).toBeLessThanOrEqual(121);
    expect(r.stackedRoadSites).toBe(1);
    expect(r.stackedWalkM2).toBeGreaterThanOrEqual(100);
    expect(r.stackedWalkSites).toBe(1);
  });

  it('ignores meshes that are not road structures, and allows surveyed overlays', () => {
    const scene = new THREE.Group();
    scene.add(mesh('Some landmark', [quad(0, 10, 0, 10, 5, ROAD), quad(0, 10, 0, 10, 5.1, ROAD)]));
    expect(roadLint(scene, [board]).boards.test.treadM2).toBe(0);
    const decks = new THREE.Group();
    decks.add(mesh('Decks and embedded rails', [quad(0, 10, 0, 10, 5, ROAD), quad(0, 10, 0, 10, 5.1, ROAD)]));
    expect(roadLint(decks, [board], { allowStacked: () => true }).boards.test.stackedRoadM2).toBe(0);
  });

  it('splits elevated edges into walled, step and open', () => {
    const scene = new THREE.Group();
    // A 20 m × 8 m deck 6 m up with a parapet along its north edge only.
    const parapet = quad(0, 20, -0.3, 0.3, 6.85, PARAPET_COLOR);
    scene.add(mesh('Decks and embedded rails', [quad(0, 20, 0, 8, 6, ROAD), parapet]));
    const r = roadLint(scene, [board]).boards.test;
    expect(r.elevatedM2).toBeGreaterThan(140);
    expect(r.walledM).toBeGreaterThanOrEqual(20);
    expect(r.openM).toBeGreaterThan(20);
    expect(r.openSites).toBeGreaterThanOrEqual(1);
    // The same deck with a second tread 1 m below its south edge: that edge is a step, not open.
    const stepped = new THREE.Group();
    stepped.add(mesh('Decks and embedded rails', [quad(0, 20, 0, 8, 6, ROAD), parapet, quad(0, 20, 9, 14, 5, ROAD)]));
    const s = roadLint(stepped, [board]).boards.test;
    expect(s.stepM).toBeGreaterThanOrEqual(20);
    expect(s.stepSites).toBe(1);
  });

  it('counts paint overlap between ribbons only away from their shared node', () => {
    const ribbon = (key: string, pts: P2[], half: number) => {
      const rows: Section[] = pts.map((p, i) => ({ s: i, inner: [p[0], p[1] - half] as P2, outer: [p[0], p[1] + half] as P2 }));
      return { r: { key, pts, line: new Line(pts) } as unknown as Ribbon, rows };
    };
    // Two ribbons that meet at (0, 0) and then run side by side 4 m apart, each 7 m wide:
    // they overlap 3 m × 40 m beyond the joint.
    const a = ribbon('a', [[0, 0], [40, 0]], 3.5), b = ribbon('b', [[0, 0], [40, 4]], 3.5);
    const r = roadLint(new THREE.Group(), [board], { painted: new Map([['test', [a, b]]]) }).boards.test;
    expect(r.paintOverlapPairs).toBe(1);
    expect(r.paintOverlapM2).toBeGreaterThan(60);
    // Ribbons that only touch at their joint do not count.
    const c = ribbon('c', [[0, 0], [-40, 0]], 3.5);
    expect(roadLint(new THREE.Group(), [board], { painted: new Map([['test', [a, c]]]) }).boards.test.paintOverlapM2).toBe(0);
  });
});
