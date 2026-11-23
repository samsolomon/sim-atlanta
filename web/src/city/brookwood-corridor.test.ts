import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import type { TransportRun } from '../terrain/transport-data';
import { GroundSurface } from '../terrain/surface';
import { GroundGrid } from '../terrain/grid';
import { midtownConnectorGround } from '../terrain/midtown-connector-ground';
import { joins } from '../square-board/sections';
import { brookwoodBedNavd88M, brookwoodGrid } from './brookwood';
import { brookwoodCorridorRail, corridor } from './brookwood-corridor';
import survey from './fixtures/brookwood.json';
import railRows from './fixtures/midtown-rail.json';
import { Line, type P2 } from '../vignette/geom';

it('joins the surveyed mains and siding to their mapped continuations at the board edges', () => {
  for (const [track, surveyed] of [[corridor.main1, survey.main1], [corridor.main2, survey.main2]] as const) {
    expect(track.west[0][0]).toBe(-1000);
    expect(track.west.at(-1)).toEqual(surveyed[0]);
    expect(track.east[0]).toEqual(surveyed.at(-1));
    expect(track.east.at(-1)![1]).toBe(-5700);
    expect(track.pts.length).toBe(track.west.length + surveyed.length + track.east.length - 2);
  }
  expect(corridor.siding.east[0]).toEqual(survey.siding.at(-1));
  expect(corridor.siding.pts.at(-1)![1]).toBe(-5700);
  const hiddenOn = (graded: boolean) => (['brookwood-south', 'brookwood-station'] as const).flatMap(row => {
    const read = (f: string) => readFileSync(new URL(`../../../pipeline/prototypes/square-board/${row}/${f}`, import.meta.url));
    const manifest = JSON.parse(read('ground.json').toString());
    const bytes = Uint8Array.from(read('ground.i16')).buffer;
    const grid = graded ? brookwoodGrid(manifest, bytes) : new GroundGrid(manifest, bytes);
    return brookwoodCorridorRail(railRows[row] as TransportRun[], grid).filter(r => r.replaced);
  });
  // Without the Brookwood model the rows keep drawing their generic track.
  expect(hiddenOn(false)).toHaveLength(0);
  const hidden = hiddenOn(true);
  expect(hidden).toHaveLength(5);
  // The Atlanta Terminal stub in the northwest corner keeps its generic drawing.
  expect(hidden.every(r => r.name !== 'Atlanta Terminal Subdivision')).toBe(true);
});

it('leaves the staged ground under the parallel MARTA North Line untouched', () => {
  const read = (f: string) => readFileSync(new URL(`../../../pipeline/prototypes/square-board/brookwood-station/${f}`, import.meta.url));
  const manifest = JSON.parse(read('ground.json').toString());
  const bytes = midtownConnectorGround(manifest, Uint8Array.from(read('ground.i16')).buffer);
  const staged = new GroundGrid(manifest, bytes), graded = brookwoodGrid(manifest, bytes);
  let samples = 0;
  for (const run of railRows['brookwood-station'] as TransportRun[]) {
    if (run.cls !== 'subway') continue;
    const line = new Line(run.pts);
    for (let s = 0; s <= line.length; s += 2) {
      const { x, z } = line.at(s);
      if (x <= 410) continue;
      // Bilinear samples can reach one feathered node beside the NS track: at most 2.4 cm.
      expect(Math.abs(graded.sample(x, z)! - staged.sample(x, z)!), `${x},${z}`).toBeLessThan(0.03);
      samples++;
    }
  }
  expect(samples).toBeGreaterThan(100);
});

it.each(['high', 'low'] as const)('seats the extended ballast on rendered %s-detail ground', quality => {
  for (const row of ['brookwood-south', 'brookwood-station'] as const) {
    const read = (f: string) => readFileSync(new URL(`../../../pipeline/prototypes/square-board/${row}/${f}`, import.meta.url));
    const manifest = JSON.parse(read('ground.json').toString());
    const grid = brookwoodGrid(manifest, midtownConnectorGround(manifest, Uint8Array.from(read('ground.i16')).buffer));
    const surface = new GroundSurface(grid, quality, undefined, joins(row));
    const zero = manifest.vertical.sceneZeroNavd88M;
    let samples = 0, low = Infinity, high = -Infinity;
    for (const track of [corridor.main1, corridor.main2, corridor.siding]) {
      for (const part of ['west' in track ? track.west : [], track.east] as P2[][]) {
        const line = new Line(part);
        for (let s = 1; s < line.length - 1; s += 2) {
          const { x, z } = line.at(s);
          if (z < manifest.bounds.minZ || z > manifest.bounds.maxZ) continue;
          const ground = surface.sampleScene(x, z);
          if (ground === null) continue;
          const below = brookwoodBedNavd88M(x) - zero - ground;
          low = Math.min(low, below); high = Math.max(high, below);
          samples++;
        }
      }
    }
    surface.geometry.dispose();
    expect(samples, row).toBeGreaterThan(500);
    // The ballast top sits 0.12 m above bed: never buried, and never more than 0.4 m
    // above the rendered ground beneath the centreline.
    expect(low, row).toBeGreaterThan(-0.12);
    expect(high, row).toBeLessThan(0.28);
  }
});
