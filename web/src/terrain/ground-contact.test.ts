import { readFileSync } from 'node:fs';
import { Group, InstancedMesh, Matrix4, Mesh, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { addSection, bounds, connect, joins, midtownRows, type Area, type Board } from '../square-board/sections';
import { CITY_COLORS, cityLayer, groundAudit, type LayerResult } from './ground-audit';
import { northAveLocal } from './north-ave';
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
/** Inside a convex ring (either winding), in plan. */
function insideConvex(ring: readonly (readonly [number, number])[], x: number, z: number) {
  let sign = 0;
  for (let i = 0; i < ring.length; i++) {
    const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length];
    const c = (bx - ax) * (z - az) - (bz - az) * (x - ax);
    if (Math.abs(c) < 1e-9) continue;
    if (sign && Math.sign(c) !== sign) return false;
    sign = Math.sign(c);
  }
  return true;
}

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
    // The building-to-sidewalk footbridge top is at -18.268 m here.
    const underBridge = mounted.get('midtown-south')!.terrainAt(370.178, -1870.121);
    expect(underBridge).not.toBeNull();
    expect(underBridge!).toBeLessThan(-18.268 - .03);
    const south = mounted.get('midtown-south')!;
    const decks = south.group.getObjectByName('Decks and embedded rails')!;
    const crossing = groundAudit(decks, [{ id: 'midtown-south', bounds: south.bounds, terrainAt: south.terrainAt, terrain: [south.board] }], {
      colors: CITY_COLORS, layer: () => 'structures',
      exclude: (_layer, x, z) => {
        const [s, t] = northAveLocal(x, z);
        return s < -12 || s > 168 || Math.abs(t) > 12;
      },
    });
    expect(crossing.layers.reduce((sum, layer) => sum + layer.samples, 0)).toBeGreaterThan(0);
    expect(crossing.worst).toEqual([]);
    const root = new Group();
    for (const area of mounted.values()) root.add(area.group);
    const audit = groundAudit(root, [...mounted].map(([id, area]) => ({ id, bounds: area.bounds, terrainAt: area.terrainAt, terrain: [area.board] })),
      { layer: cityLayer, colors: CITY_COLORS, step: 0.5, tolerance: 0.03 });
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
    // Ballast draws after its run is graded; each quad must keep its own place along the
    // sleeper texture (a shared station once stretched one texel over the whole track).
    const freight = mounted.get('south-band')!.group.getObjectByName('Freight track') as Mesh;
    const v = freight.geometry.getAttribute('uv');
    let stretched = 0;
    for (let i = 0; i < v.count; i += 3) {
      const ys = [v.getY(i), v.getY(i + 1), v.getY(i + 2)];
      // Stations are at most 2 m apart, 2.5 texture periods; corners and curves add a little.
      if (Math.max(...ys) - Math.min(...ys) > 4) stretched++;
    }
    expect(v.count).toBeGreaterThan(1000);
    expect(stretched).toBe(0);
    // Graded cuttings carve after scenery has sampled the ground. Nothing placed in a cut
    // may be left standing on the old bank: every instance (trees, shrubs, lamps) and every
    // mesh vertex low enough to be a base must sit on the carved ground.
    let inCuts = 0;
    const floating: string[] = [];
    for (const [id, area] of mounted) {
      if (!area.carved.length) continue;
      const rings = area.carved.map(y => y.ring);
      const inCut = (x: number, z: number) => rings.some(r => insideConvex(r, x, z));
      const m = new Matrix4(), pos = new Vector3();
      area.scenery.updateMatrixWorld(true);
      area.scenery.traverse(o => {
        if (!(o instanceof Mesh)) return;
        const check = (x: number, y: number, z: number) => {
          if (!inCut(x, z)) return;
          inCuts++;
          const ground = area.terrainAt(x, z);
          if (ground !== null && y - ground > .25) floating.push(`${id} ${o.name || o.parent?.name || o.type} at ${x.toFixed(1)},${z.toFixed(1)}: ${(y - ground).toFixed(2)} m up`);
        };
        if (o instanceof InstancedMesh) {
          for (let i = 0; i < o.count; i++) {
            o.getMatrixAt(i, m);
            pos.setFromMatrixPosition(m.premultiply(o.matrixWorld));
            check(pos.x, pos.y, pos.z);
          }
        } else {
          // A mesh's lowest vertex in a cut is where it meets the ground.
          const p = o.geometry.getAttribute('position');
          let low: Vector3 | null = null;
          for (let i = 0; i < p.count; i++) {
            pos.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
            if (inCut(pos.x, pos.z) && (!low || pos.y < low.y)) low = pos.clone();
          }
          if (low) check(low.x, low.y, low.z);
        }
      });
    }
    console.info(`scenery samples in graded cuts on ${quality}: ${inCuts}`);
    expect(floating).toEqual([]);
  } finally { for (const area of mounted.values()) area.dispose(); }
}, 60_000);
