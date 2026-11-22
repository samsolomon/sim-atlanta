import { afterEach, expect, it, vi } from 'vitest';
import type { P2 } from '../vignette/geom';
import { PAL } from '../vignette/world';
import { pathConcrete, pathWidth, westsideName } from './westside-path';
import { groundMap } from './ground-map';
import type { TerrainCity } from './transport-data';

afterEach(() => vi.unstubAllGlobals());

it('paints lot markings inside their polygon and crossing ways only once over ground streets', () => {
  const draws: { color: string; width: number; points: P2[]; dash: number[] }[] = [];
  let points: P2[] = [], dash: number[] = [];
  const ctx = { strokeStyle: '', lineWidth: 0, scale() {}, translate() {}, rotate() {}, fillRect() {}, closePath() {},
    fill: vi.fn(), clip: vi.fn(), restore() {}, save() {},
    beginPath() { points = []; }, moveTo(x: number, z: number) { points.push([x, z]); },
    lineTo(x: number, z: number) { points.push([x, z]); }, setLineDash(pattern: number[]) { dash = pattern; },
    stroke() { draws.push({ color: this.strokeStyle, width: this.lineWidth, points, dash }); } };
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  const road = { cls: 'secondary', name: null, bridge: false, tunnel: false, pts: [[0,15], [99,15]] as P2[] };
  const city: TerrainCity = { bounds: { minX: 0, maxX: 100, minZ: 0, maxZ: 100 }, rail: [], buildings: [],
    ground: [{ kind: 'parking', name: null, sub: null,
      rings: [[[0,30],[80,30],[80,90],[0,90]], [[20,40],[30,40],[30,50],[20,50]]] }],
    roads: [road, { ...road, name: westsideName, cls: 'footway', pts: [[2, 0], [2, 30]] }, { ...road, cls: 'footway', sub: 'crosswalk', pts: [[10,10],[10,20]] },
      { ...road, bridge: true, pts: [[0,25],[99,25]] }],
    points: { crossing: [[10,15],[60,15],[70,25]] } };
  const map = groundMap(city, 'low');
  expect(ctx.fill).toHaveBeenCalledWith('evenodd');
  expect(ctx.clip).toHaveBeenCalledWith('evenodd');
  const zebra = draws.filter(d => d.color === PAL.lineWhite && d.dash.length);
  expect(zebra).toHaveLength(2); // one mapped way, one point, none on the bridge
  expect(zebra[0].points).toEqual([[10,10],[10,20]]);
  expect(zebra[1].points[0][0]).toBe(60);
  const path = draws.findIndex(d => d.color === pathConcrete && d.width === pathWidth);
  const asphalt = draws.findIndex(d => d.color === PAL.asphalt);
  expect(path).toBeGreaterThanOrEqual(0);
  expect(asphalt).toBeGreaterThan(path);
  expect(draws.indexOf(zebra[0])).toBeGreaterThan(asphalt);
  map.dispose();
});
