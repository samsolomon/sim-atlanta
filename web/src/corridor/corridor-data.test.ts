/**
 * Checks the committed King Memorial corridor prototype (pipeline/prototypes/king-memorial) against
 * the committed downtown ground bake. See docs/king-memorial-corridor.md.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GroundGrid, type GroundManifest } from '../terrain/grid';

const proto = resolve(__dirname, '../../../pipeline/prototypes');
const read = (p: string) => readFileSync(resolve(proto, p));
const grid = (dir: string) => {
  const m: GroundManifest = JSON.parse(read(`${dir}/ground.json`).toString());
  const bin = read(`${dir}/ground.i16`);
  return { m, bin, grid: new GroundGrid(m, bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength)) };
};

describe('King Memorial corridor ground strip', () => {
  const strip = grid('king-memorial/ground');
  const down = grid('downtown-ground');

  it('is the pinned box, matches its checksum and shares downtown\'s scene zero and lattice', () => {
    expect(createHash('sha256').update(strip.bin).digest('hex')).toBe(strip.m.sha256);
    expect(strip.m.bounds).toEqual({ minX: 1000, maxX: 1800, minZ: 280, maxZ: 640 });
    expect(strip.m.stepM).toBe(down.m.stepM);
    expect(strip.m.vertical.sceneZeroNavd88M).toBe(down.m.vertical.sceneZeroNavd88M);
    expect((strip.m.bounds.minZ - down.m.bounds.minZ) % strip.m.stepM).toBe(0);
    expect((strip.m as GroundManifest & { noDataCount: number }).noDataCount).toBe(0);
  });

  it('reproduces downtown node for node on the shared x = 1000 column', () => {
    for (let z = strip.m.bounds.minZ; z <= strip.m.bounds.maxZ; z += strip.m.stepM) {
      expect(strip.grid.sample(1000, z), `z ${z}`).toBe(down.grid.sample(1000, z));
    }
  });
});

interface Bin { s: number; ground: number | null; top: number | null; roof: number | null; status: string }
const corridor = JSON.parse(read('king-memorial/corridor.json').toString()) as {
  guideway: Bin[]; bins: number; summary: { measuredM: number; underRoofM: number; unknownM: number };
  crossings: { s: number; name: string | null; guidewayTopNavd88M: number | null; groundNavd88M: number | null }[];
  coverage: { path: string; boardEdgeS: number; nearestToStationS: number; nearestToStationM: number }[];
  cityProfileEndS: number;
};

describe('King Memorial guideway profile', () => {
  it('only carries a guideway height where it was measured', () => {
    for (const b of corridor.guideway) {
      expect(b.top !== null, `s ${b.s}`).toBe(b.status === 'measured');
      if (b.status === 'under roof') expect(b.roof).not.toBeNull();
    }
    const total = (status: string[]) => corridor.guideway.filter(b => status.includes(b.status)).length * corridor.bins;
    expect(total(['measured'])).toBe(corridor.summary.measuredM);
    expect(total(['under roof'])).toBe(corridor.summary.underRoofM);
    expect(total(['gap', 'unresolved'])).toBe(corridor.summary.unknownM);
  });

  it('is continuous where measured (no step over 0.6 m between adjacent bins) and above the ground', () => {
    const bins = corridor.guideway;
    for (let i = 1; i < bins.length; i++) {
      const a = bins[i - 1], b = bins[i];
      if (a.top !== null && b.top !== null) expect(Math.abs(b.top - a.top), `s ${b.s}`).toBeLessThanOrEqual(0.6);
      if (b.top !== null && b.ground !== null) expect(b.top).toBeGreaterThan(b.ground + 2.5);
    }
  });

  it('reaches past King Memorial, which City\'s current profile stops short of', () => {
    const blue = corridor.coverage.find(c => c.path === '155177')!;
    expect(blue.nearestToStationM).toBeLessThan(5);
    expect(corridor.cityProfileEndS).toBeLessThan(blue.nearestToStationS);
    expect(corridor.guideway.at(-1)!.s).toBeGreaterThan(blue.nearestToStationS + 150); // through the crossover
  });

  it('puts the measured guideway above every road and track it crosses', () => {
    for (const c of corridor.crossings) {
      if (c.guidewayTopNavd88M !== null && c.groundNavd88M !== null) expect(c.guidewayTopNavd88M, c.name ?? String(c.s)).toBeGreaterThan(c.groundNavd88M + 4);
    }
    expect(corridor.crossings.some(c => c.name === 'Downtown Connector')).toBe(true);
  });
});
