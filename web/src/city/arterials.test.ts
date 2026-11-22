import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { VData } from '../vignette/world';
import { loadArterials, type ArterialRun, type ArterialsFile } from './arterials';

const road = (pts: [number, number][]) => ({ cls: 'secondary', name: 'X', bridge: false, tunnel: false, pts }) as VData['roads'][number];
const run = (i: number, a: [number, number], b: [number, number]): ArterialRun => ({
  run: i, overture: null, a, b, from: 'n0', to: 'n1', lenM: 10, bridge: false, allow: 'forward',
  lanes: { forward: 2 }, aadt: { forward: 5000 }, aadtBasis: 'one-way', truckShare: 0, speedMph: null,
  match: { hpmsDistM: 1, name: true, by: 'route-name', coverage: 1, hpmsYear: 2024, aadtDate: null, hpmsRoute: null },
});
const file = (runs: ArterialRun[]): ArterialsFile => ({ version: 1, tier: 'inferred', note: '', sources: {}, board: { roads: 2 }, nodes: {},
  corridors: [{ id: 'x', name: 'X', fSystem: 4, class: 'secondary', runs }], coverage: { candidates: 1, matched: runs.length, rejected: [] } });

describe('loadArterials', () => {
  const vd = { roads: [road([[0, 0], [10, 0]]), road([[0, 5], [10, 5]])] };
  it('resolves runs to the original drawn road objects', () => {
    const { corridors, skipped } = loadArterials(file([run(1, [0, 5], [10, 5])]), vd);
    expect(skipped).toBe(0);
    expect(corridors[0].runs[0].road).toBe(vd.roads[1]);
  });
  it('drops runs from a skewed or older bake, and handles absent files', () => {
    expect(loadArterials(file([run(1, [0, 0], [10, 0]), run(9, [0, 0], [1, 1])]), vd)).toEqual({ corridors: [], skipped: 2 });
    expect(loadArterials(undefined, vd)).toEqual({ corridors: [], skipped: 0 });
    expect(loadArterials({ version: 2, corridors: [] }, vd)).toEqual({ corridors: [], skipped: 0 });
  });
  it('survives malformed optional data without throwing', () => {
    const bad = { ...file([]), corridors: [null, { id: 'y', runs: null }, { id: 'z', runs: [null, { run: 1 }, { ...run(1, [0, 5], [10, 5]), a: undefined }, { ...run(1, [0, 5], [10, 5]), allow: 'sideways' }, { ...run('1' as unknown as number, [0, 5], [10, 5]) }] }] };
    expect(() => loadArterials(bad, vd)).not.toThrow();
    expect(loadArterials(bad, vd)).toEqual({ corridors: [], skipped: 7 });
    expect(loadArterials({ version: 1, corridors: 'x' }, vd)).toEqual({ corridors: [], skipped: 0 });
    expect(loadArterials(file([run(1, [0, 5], [10, 5])]), { roads: undefined as unknown as VData['roads'] }).corridors).toEqual([]);
  });
});

const dir = resolve(__dirname, '../../public/data/scene/downtown');
const has = existsSync(resolve(dir, 'arterials.json')) && existsSync(resolve(dir, 'vignette.json'));
describe.skipIf(!has)('arterials.json against the drawn downtown roads', () => {
  const json: ArterialsFile = has ? JSON.parse(readFileSync(resolve(dir, 'arterials.json'), 'utf8')) : null!;
  const vd: VData = has ? JSON.parse(readFileSync(resolve(dir, 'vignette.json'), 'utf8')) : null!;
  const { corridors, skipped } = has ? loadArterials(json, vd) : { corridors: [], skipped: 0 };
  const runs = corridors.flatMap((c) => c.runs.map((r) => ({ c, r })));

  it('resolves every baked run with exact endpoints and consistent nodes', () => {
    expect(skipped).toBe(0);
    expect(json.board.roads).toBe(vd.roads.length);
    expect(runs.length).toBe(json.coverage.matched);
    for (const { r } of runs) {
      expect(json.nodes[r.from]).toBeDefined();
      expect(Math.hypot(json.nodes[r.from][0] - r.a[0], json.nodes[r.from][1] - r.a[1])).toBeLessThanOrEqual(0.5);
      expect(Math.hypot(json.nodes[r.to][0] - r.b[0], json.nodes[r.to][1] - r.b[1])).toBeLessThanOrEqual(0.5);
      expect(r.road.tunnel).toBeFalsy();
      expect(['primary', 'secondary', 'trunk']).toContain(r.road.cls);
    }
  });

  it('carries volume and lanes only in permitted directions, counted once', () => {
    for (const { c, r } of runs) {
      const dirs = r.allow === 'both' ? ['forward', 'reverse'] : [r.allow];
      expect(Object.keys(r.aadt).sort(), `${c.id} run ${r.run}`).toEqual([...dirs].sort());
      expect(Object.keys(r.lanes).sort()).toEqual([...dirs].sort());
      expect(Object.values(r.aadt).every((v) => v! > 0)).toBe(true);
      if (r.aadtBasis === 'one-way') expect(r.allow).not.toBe('both');
      if (r.aadtBasis === 'two-way-split') expect(r.allow).toBe('both');
      expect([3, 4]).toContain(c.fSystem);
      expect(r.match.coverage).toBeGreaterThanOrEqual(0.6);
      expect(r.match.hpmsDistM ?? 0).toBeLessThanOrEqual(15);
    }
  });

  it('points the known downtown one-way streets the right way', () => {
    // Courtland St and Pryor St run southbound (+z), Piedmont Ave and Central Ave northbound (−z).
    const heading = (r: ArterialRun) => {
      const s = r.allow === 'reverse' ? -1 : 1;
      return [(r.b[0] - r.a[0]) * s, (r.b[1] - r.a[1]) * s];
    };
    for (const [id, south] of [['courtland-st', true], ['pryor-st', true], ['piedmont-ave', false], ['central-ave', false]] as const) {
      const one = runs.filter(({ c, r }) => c.id === id && r.allow !== 'both');
      expect(one.length, id).toBeGreaterThan(0);
      const southward = one.filter(({ r }) => heading(r)[1] > 0).length;
      expect(south ? southward : one.length - southward, id).toBeGreaterThanOrEqual(Math.ceil(one.length * 0.8));
    }
  });

  it('never counts a divided road twice: carriageways come in opposite pairs', () => {
    const halves = runs.filter(({ r }) => r.aadtBasis === 'carriageway');
    for (const { c, r } of halves) {
      expect(halves.some(({ c: c2, r: r2 }) => c2.id === c.id && r2 !== r && r2.match.hpmsRoute === r.match.hpmsRoute), `${c.id} run ${r.run}`).toBe(true);
    }
  });

  it('accounts for every candidate as matched or rejected with a reason', () => {
    expect(json.coverage.matched + json.coverage.rejected.length).toBe(json.coverage.candidates);
    expect(json.coverage.rejected.every((r) => typeof r.reason === 'string' && r.reason.length > 0)).toBe(true);
    expect(json.sources.hpms).toMatch(/DATA_YEAR 2024/);
  });
});
