import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { runSync } from '../core/slice';
import { joins } from '../square-board/sections';
import { GroundGrid } from './grid';
import { FAR_GROUND_ERROR_M } from './model';
import { GroundSurface } from './surface';

const scene = new URL('../../public/data/scene/square-board/', import.meta.url);
const ROWS = ['north-band', 'midtown-south', 'brookwood-south', 'brookwood-station', 'r16'] as const;
const staged = ROWS.every(r => existsSync(new URL(`${r}/ground.json`, scene)));

/** A page builds the far ground in steps; it must be the mesh the one-pass call makes. */
it.skipIf(!staged).each(ROWS)('builds the far ground of %s the same in steps as in one pass', row => {
  const dir = new URL(`${row}/`, scene);
  const grid = new GroundGrid(JSON.parse(readFileSync(new URL('ground.json', dir), 'utf8')), Uint8Array.from(readFileSync(new URL('ground.i16', dir))).buffer);
  const surface = new GroundSurface(grid, 'low', [], joins(row));
  for (const lower of [false, true]) {
    const whole = surface.farGeometry(FAR_GROUND_ERROR_M, 160, lower);
    const stepped = runSync(surface.farGeometrySteps(FAR_GROUND_ERROR_M, 160, lower));
    for (const name of ['position', 'uv', 'normal']) expect(stepped.getAttribute(name).array, `${row} ${name}`).toEqual(whole.getAttribute(name).array);
    expect(Array.from(stepped.index!.array)).toEqual(Array.from(whole.index!.array));
    expect(stepped.index!.array.constructor).toBe(whole.index!.array.constructor);
  }
  surface.geometry.dispose();
}, 60_000);
