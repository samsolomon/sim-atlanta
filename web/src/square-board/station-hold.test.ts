import { existsSync, readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';
import { brookwoodGrid } from '../city/brookwood';
import { mountStationFragments } from '../city/north-seam-neighborhood';
import { GroundGrid } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import { staged } from '../terrain/step-budget';
import { addSection, bounds, joins, midtownRows, type Area, type Board, type TrafficArea } from './sections';

/**
 * R16's mount carves the yards of the seam buildings into the Station, which is already on screen.
 * Today's seam buildings have no yards, so one is given to them here: the drawn Station ground must
 * not change before the buildings appear, and an abandoned mount must put it back.
 */
const yard = vi.hoisted(() => ({ on: false, failLate: false }));
const CENTRE = [406, -5297] as const;
vi.mock('../city/residential', async importOriginal => {
  const actual = await importOriginal<typeof import('../city/residential')>();
  const { Group } = await import('three');
  return { ...actual, residential: (...args: Parameters<typeof actual.residential>) => {
    const homes = actual.residential(...args);
    // Only the seam layers ask for yards in one pass; area builds step through buildYards.
    if (yard.on) homes.yards = () => ({ group: new Group(), dispose() { },
      yields: [{ ring: [[400, -5300], [412, -5300], [406, -5290]], floor: () => -200 }] }) as never;
    return homes;
  } };
});

// A step that throws after the seam cut, near the end of the mount.
vi.mock('../city/mayson-study', async importOriginal => {
  const actual = await importOriginal<typeof import('../city/mayson-study')>();
  return { ...actual, mountMayson: (...args: Parameters<typeof actual.mountMayson>) => {
    if (yard.failLate) throw Error('late mount step failed');
    return actual.mountMayson(...args);
  } };
});

const data = new URL('../../public/data/', import.meta.url);
const bytes = (u: URL) => Uint8Array.from(readFileSync(u)).buffer;
const ready = staged(['brookwood-station', 'r16']) && existsSync(new URL('scene/downtown/ground.json', data));

it.skipIf(!ready)('draws the Station uncut until R16 commits, and puts it back when the mount is abandoned', async () => {
  const ctx: object = new Proxy(function () { }, { get: () => ctx, apply: () => ctx });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  vi.stubGlobal('fetch', async (url: string) => {
    try { return new Response(bytes(new URL(url.split('/data/')[1], data))); } catch { return new Response(null, { status: 404 }); }
  });
  const grid = new GroundGrid(JSON.parse(readFileSync(new URL('scene/downtown/ground.json', data), 'utf8')), bytes(new URL('scene/downtown/ground.i16', data)));
  const downtown = createDowntownTerrain(grid, { bounds: bounds.downtown, roads: [], rail: [], buildings: [] }, [], { quality: 'low', join: joins('downtown') });
  const mounted = new Map<Board, Area>([['downtown', downtown]]);
  const options = { brookwood: async (...[m, b]: Parameters<typeof brookwoodGrid>) => brookwoodGrid(m, b) };
  try {
    vi.stubGlobal('location', { search: '?slice=0' });
    for (const row of ['north', ...midtownRows.slice(0, -1)] as const) await addSection(row, mounted, 'low', new AbortController().signal, options);
    const station = mounted.get('brookwood-station') as TrafficArea;
    mountStationFragments(station, 'low');
    const drawn = () => [station.board.geometry.getAttribute('position').array, station.board.geometry.index!.array] as const;
    const original = drawn(), height = station.terrainAt(...CENTRE)!, carves = station.carved.length;
    const uncut = () => drawn()[0] === original[0] && drawn()[1] === original[1];

    // A mount in slices, looked at between frames as a visitor would see it.
    vi.stubGlobal('location', { search: '' });
    yard.on = true;
    let frame = () => { };
    vi.stubGlobal('requestAnimationFrame', (next: FrameRequestCallback) => setImmediate(() => { frame(); next(performance.now()); }));
    const abandon = new AbortController();
    // Frames drawn with the Station carved underneath, and how many of them showed it.
    let carvedFrames = 0, shownEarly = 0;
    const look = () => {
      if (station.terrainAt(...CENTRE)! >= height - 1) return;
      carvedFrames++;
      if (!uncut()) shownEarly++;
    };
    // Leave once the Station has been carved underneath.
    frame = () => { look(); if (carvedFrames === 3) abandon.abort(); };
    await expect(addSection('r16', mounted, 'low', abandon.signal, options)).rejects.toThrow();
    expect(carvedFrames).toBeGreaterThanOrEqual(3);
    expect(shownEarly, 'Station ground changed on screen mid-mount').toBe(0);
    expect(uncut()).toBe(true);
    expect(station.terrainAt(...CENTRE)).toBe(height);
    expect(station.carved.length).toBe(carves);

    // A step that fails after the cut puts the Station back too.
    yard.failLate = true;
    frame = () => { };
    await expect(addSection('r16', mounted, 'low', new AbortController().signal, options)).rejects.toThrow('late mount step failed');
    yard.failLate = false;
    expect(uncut()).toBe(true);
    expect(station.terrainAt(...CENTRE)).toBe(height);
    expect(station.carved.length).toBe(carves);

    // Looking north again mounts it, and the cut shows with the commit, not before.
    carvedFrames = 0;
    frame = look;
    await addSection('r16', mounted, 'low', new AbortController().signal, options);
    expect(carvedFrames).toBeGreaterThanOrEqual(3);
    expect(shownEarly, 'Station ground changed on screen mid-mount').toBe(0);
    expect(uncut()).toBe(false);
    expect(station.terrainAt(...CENTRE)!).toBeLessThan(height - 1);
    expect(station.carved.length).toBeGreaterThan(carves);
  } finally {
    for (const area of mounted.values()) area.dispose();
    vi.unstubAllGlobals();
  }
}, 120_000);
