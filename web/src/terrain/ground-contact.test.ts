import { readFileSync } from 'node:fs';
import { Group, type Mesh } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { addSection, bounds, connect, joins, midtownRows, type Area, type Board } from '../square-board/sections';
import { CITY_COLORS, cityLayer, groundAudit, type LayerResult } from './ground-audit';
import { GroundGrid } from './grid';
import { createDowntownTerrain } from './model';

// Ground contact on the committed boards, at both tiers: the drawn terrain must not
// stand more than 3 cm above a layer meant to lie on it. Built from pipeline/prototypes,
// so it runs in every `pnpm test` without staged data.
const source = new URL('../../../pipeline/prototypes/', import.meta.url);
function file(id: Board, name: string) {
  const path = id === 'downtown' ? 'downtown-ground' : id === 'king' ? 'king-memorial/ground' : id === 'auburn' ? 'sweet-auburn/ground' : 'square-board/' + id;
  return readFileSync(new URL(path + '/' + name, source));
}
const grid = (id: Board) => new GroundGrid(JSON.parse(file(id, 'ground.json').toString()), Uint8Array.from(file(id, 'ground.i16')).buffer);
afterEach(() => vi.unstubAllGlobals());

/**
 * Layers held to the 3 cm contract. Owned elsewhere and reported, not asserted:
 * surveyed street decks and bridge approaches (profile and abutment heights, the
 * Connector work) and soft planting (shrub clumps sunk into a bank on purpose).
 */
const HELD = ['rail ballast', 'ground cover', 'landscape primitives:tread', 'landscape primitives:stone'];
/**
 * Graded freight cuts, where the track sits below its bank on purpose. The ballast
 * drape lifts at most 25 cm, so these need the bank carved by the rail owner
 * (handed off in #282): south-band west of the Gulch, and midtown-south's cut.
 */
const GRADED_CUTS = [
  { minX: -1020, maxX: -870, minZ: 870, maxZ: 980 },
  { minX: -840, maxX: -760, minZ: -1935, maxZ: -1820 },
];
const exclude = (layer: string, x: number, z: number) => layer === 'rail ballast' &&
  GRADED_CUTS.some(b => x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ);

it.each(['high', 'low'] as const)('keeps the drawn terrain under ground-hugging layers on %s', async quality => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  vi.stubGlobal('fetch', async (url: string) => {
    const [, id, name] = url.match(/square-board\/([^/]+)\/(.+)$/)!;
    return new Response(Uint8Array.from(file(id as Board, name)).buffer);
  });
  const mounted = new Map<Board, Area>();
  const signal = new AbortController().signal;
  try {
    for (const id of ['downtown', 'king', 'auburn'] as const)
      connect(mounted, new Map([[id, createDowntownTerrain(grid(id), { bounds: bounds[id], buildings: [], roads: [], rail: [] }, [], { quality, bottomY: -48, join: joins(id) })]]));
    await addSection('south', mounted, quality, signal);
    await addSection('north', mounted, quality, signal);
    for (const row of midtownRows.slice(0, 3)) await addSection(row, mounted, quality, signal);
    const root = new Group();
    for (const area of mounted.values()) root.add(area.group);
    const audit = groundAudit(root, [...mounted].map(([id, area]) => ({ id, bounds: area.bounds, terrainAt: area.terrainAt, terrain: [area.board] })),
      { layer: cityLayer, colors: CITY_COLORS, step: 0.5, tolerance: 0.03, exclude });
    // The low tier carves stairs but does not drape (phone memory), so it holds the treads only.
    const tierHeld = quality === 'high' ? HELD : HELD.filter(l => l.startsWith('landscape primitives'));
    const held = (l: LayerResult) => tierHeld.includes(l.layer);
    const sampled = audit.layers.filter(held);
    // The layers under test are actually present: the High's granite steps and lawn turf
    // (midtown-upper) and the south band's ground freight ballast.
    for (const layer of quality === 'high' ? ['rail ballast', 'ground cover', 'landscape primitives:tread'] : ['landscape primitives:tread'])
      expect(sampled.some(l => l.layer === layer && l.samples > 100), layer).toBe(true);
    const failures = sampled.filter(l => l.penetrating).map(l =>
      `${l.board} ${l.layer}: ${l.penetrating} samples, worst ${(l.worst!.depth * 100).toFixed(1)} cm at ${l.worst!.x.toFixed(1)},${l.worst!.z.toFixed(1)}`);
    expect(failures).toEqual([]);
    // The High's lawn turf leaves the carved granite steps to the stone: no turf triangle
    // over a tread (the steps run 4 m wide from 633.4,-3995.6 to 619.6,-3987.8).
    const turf = mounted.get('midtown-upper')!.group.getObjectByName('ground-cover') as Mesh;
    const p = turf.geometry.getAttribute('position');
    const [ax, az, cx, cz] = [633.4, -3995.6, 619.6, -3987.8], len = Math.hypot(cx - ax, cz - az);
    let onTreads = 0;
    for (let i = 0; i < p.count; i += 3) {
      const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
      const s = ((x - ax) * (cx - ax) + (z - az) * (cz - az)) / len, n = ((z - az) * (cx - ax) - (x - ax) * (cz - az)) / len;
      if (s > 0 && s < len && Math.abs(n) < 2) onTreads++;
    }
    expect(onTreads).toBe(0);
  } finally { for (const area of mounted.values()) area.dispose(); }
}, 60_000);
