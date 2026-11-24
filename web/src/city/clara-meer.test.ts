import { readFileSync } from 'node:fs';
import { Mesh } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import features from '../../../pipeline/prototypes/piedmont-edge/features.json';
import { GroundGrid, type GroundManifest } from '../terrain/grid';
import type { TerrainCity } from '../terrain/transport-data';
import { createDowntownTerrain } from '../terrain/model';
import { createSurfaceTransport } from '../terrain/transport';
import { auburnTransport } from './sweet-auburn-transport';
import { seventeenthAccess } from './seventeenth-street';
import { centre, gazeboId } from './clara-meer';
import { Line, type P2 } from '../vignette/geom';

afterEach(() => vi.unstubAllGlobals());

/**
 * A slimmed fixture: the midtown-upper row cropped to the lake, bridge, dock and both
 * Piedmont Avenue gates (600 × 400 m of a 2,800 × 800 m row). Only footprints and runs wholly
 * inside the window are kept. Building the full row twice timed out under concurrent suites.
 */
const WINDOW = { minX: 1150, maxX: 1750, minZ: -3700, maxZ: -3300 };
let cached: { grid: GroundGrid; context: TerrainCity & { buildings: { id: string; rings: P2[][] }[] } } | undefined;
function lakeWindow() {
  if (cached) return { grid: cached.grid, context: structuredClone(cached.context) };
  const root = new URL('../../../pipeline/prototypes/square-board/midtown-upper/', import.meta.url);
  const read = (name: string) => readFileSync(new URL(name, root));
  const manifest: GroundManifest = JSON.parse(read('ground.json').toString());
  const raw = Uint8Array.from(read('ground.i16'));
  const { bounds: b, stepM, cols } = manifest;
  const c0 = (WINDOW.minX - b.minX) / stepM, r0 = (WINDOW.minZ - b.minZ) / stepM;
  const nc = (WINDOW.maxX - WINDOW.minX) / stepM + 1, nr = (WINDOW.maxZ - WINDOW.minZ) / stepM + 1;
  const out = new Uint8Array(nr * nc * 2);
  for (let r = 0; r < nr; r++) out.set(raw.subarray(((r0 + r) * cols + c0) * 2, ((r0 + r) * cols + c0 + nc) * 2), r * nc * 2);
  const grid = new GroundGrid({ ...manifest, bounds: WINDOW, rows: nr, cols: nc }, out.buffer);
  const full = JSON.parse(read('context.json').toString());
  const within = (pts: P2[]) => pts.every(([x, z]) => x >= WINDOW.minX && x <= WINDOW.maxX && z >= WINDOW.minZ && z <= WINDOW.maxZ);
  const context = { ...full, bounds: WINDOW,
    buildings: full.buildings.filter((o: { rings: P2[][] }) => within(o.rings[0])),
    roads: full.roads.filter((o: { pts: P2[] }) => within(o.pts)),
    rail: [], ground: (full.ground ?? []).filter((o: { rings: P2[][] }) => within(o.rings[0])), trees: [] };
  cached = { grid, context };
  return { grid, context: structuredClone(context) };
}

it.each(['low', 'high'] as const)('lifts the Clara Meer bridge above the lake and replaces the gazebo box at %s', quality => {
  const ctx: object = new Proxy(function () {}, { get: () => ctx, apply: () => ctx });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  const { grid, context } = lakeWindow();
  expect(context.buildings.some((b: { id: string }) => b.id === gazeboId)).toBe(true);
  const city = seventeenthAccess(auburnTransport(context));
  const area = createDowntownTerrain(grid, city, [], { quality });
  const decks = createSurfaceTransport(city, grid, area.groundAt);
  try {
    // The generic brick box is gone, replaced by the bridge, gazebo and dock.
    expect(area.scenery.getObjectByName('clara-meer')).toBeDefined();
    const shell = area.scenery.children.find(o => o instanceof Mesh && o.geometry.hasAttribute('aBase')) as Mesh;
    const p = shell.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) expect(Math.hypot(p.getX(i) - 1659.3, p.getZ(i) + 3465.2)).toBeGreaterThan(6);
    const path = features.bridge.pts as P2[];
    const run = city.terrainTransport!.roads.find(r => Math.hypot(r.pts[0][0] - path[0][0], r.pts[0][1] - path[0][1]) < .05)!;
    const line = new Line(path), water = area.groundAt(...centre)!;
    // The hydro-flattened 3DEP lake surface, measured at 267.4 m NAVD88.
    expect(water + grid.manifest.vertical.sceneZeroNavd88M).toBeCloseTo(267.4, 1);
    expect(centre[0]).toBeCloseTo(1659.33, 1);
    expect(centre[1]).toBeCloseTo(-3465.2, 1);
    let crest = -Infinity;
    for (let s = .5; s < line.length; s += .5) {
      const q = line.at(s), deck = decks.deckAt(q.x, q.z, run)!, ground = area.groundAt(q.x, q.z)!;
      expect(deck).toBeGreaterThanOrEqual(ground + .1);
      crest = Math.max(crest, deck - water);
    }
    // Estimated 2.9 m crest above the hydro-flattened 3DEP water surface.
    expect(crest).toBeCloseTo(2.9, 1);
    // Both Piedmont Avenue gates stand on the rendered ground, sunk at most their 0.3 m footing.
    const gates = area.scenery.getObjectByName('piedmont-gates')!;
    expect(gates).toBeDefined();
    let lowest = Infinity, tallest = -Infinity;
    for (const mesh of gates.children as Mesh[]) {
      const q = mesh.geometry.getAttribute('position');
      for (let i = 0; i < q.count; i++) {
        const g = area.groundAt(q.getX(i), q.getZ(i));
        if (g === null) continue;
        lowest = Math.min(lowest, q.getY(i) - g);
        tallest = Math.max(tallest, q.getY(i) - g);
      }
    }
    expect(lowest).toBeGreaterThan(-.45);
    // The 14th Street piers rise to an estimated 5.5 m with their finials.
    expect(tallest).toBeGreaterThan(5);
  } finally { decks.dispose(); area.dispose(); }
}, 3000); // Measured about 30 ms per tier on the cropped fixture; 3 s leaves room for concurrent suites.
