import { readFileSync } from 'node:fs';
import { Mesh, Raycaster, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { addSection, midtownRows, type Area, type Board } from '../square-board/sections';
import { GroundGrid, type GroundManifest } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import { brookwoodGrid } from './brookwood';

const root = new URL('../../../pipeline/prototypes/square-board/', import.meta.url);
const bytes = (file: string) => Uint8Array.from(readFileSync(new URL(file, root))).buffer;
afterEach(() => vi.unstubAllGlobals());

it.each(['low', 'high'] as const)('keeps every rendered generic Midtown roof above its ground at %s', async quality => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  vi.stubGlobal('fetch', (url: string) => new Response(bytes(url.split('/square-board/')[1])));
  const manifest: GroundManifest = JSON.parse(new TextDecoder().decode(bytes('../downtown-ground/ground.json')));
  const grid = new GroundGrid(manifest, bytes('../downtown-ground/ground.i16'));
  const previous = createDowntownTerrain(grid, { bounds: manifest.bounds, buildings: [], roads: [], rail: [] }, [], { quality });
  const mounted = new Map<Board, Area>([['downtown', previous]]);
  try {
    await addSection('north', mounted, quality, new AbortController().signal);
    for (const row of midtownRows) {
      await addSection(row, mounted, quality, new AbortController().signal, { brookwood: async (manifest, bytes) => brookwoodGrid(manifest, bytes) });
      const area = mounted.get(row)!;
      // Read the actual batch, so bypassing the row registration or ignoring
      // the finished floor in World both reproduce the original failure.
      const mesh = area.scenery.children.find(o => o instanceof Mesh && o.geometry.hasAttribute('aBase')) as Mesh;
      const p = mesh.geometry.getAttribute('position'), style = mesh.geometry.getAttribute('aStyle');
      let triangles = 0, minClearance = Infinity, worst = '';
      function check(x: number, z: number, roof: number) {
        const ground = area.groundAt(x, z);
        if (ground !== null && roof - ground < minClearance) {
          minClearance = roof - ground;
          worst = `${row} at ${x.toFixed(2)}, ${z.toFixed(2)}`;
        }
      }
      for (let i = 0; i < p.count; i += 3) {
        const roof = p.getY(i);
        if (style.getX(i) >= 0 || roof !== p.getY(i+1) || roof !== p.getY(i+2)) continue;
        triangles++;
        const xs = [p.getX(i), p.getX(i+1), p.getX(i+2)];
        const zs = [p.getZ(i), p.getZ(i+1), p.getZ(i+2)];
        for (let a = 0; a < 3; a++) {
          const b = (a+1)%3, dx = xs[b]-xs[a], dz = zs[b]-zs[a];
          const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 2.5));
          for (let k = 0; k < count; k++) check(xs[a]+dx*k/count, zs[a]+dz*k/count, roof);
        }
        // An interior ground summit can penetrate an otherwise clear roof.
        for (let x = Math.ceil(Math.min(...xs)/5)*5; x <= Math.max(...xs); x += 5) {
          for (let z = Math.ceil(Math.min(...zs)/5)*5; z <= Math.max(...zs); z += 5) {
            const sides = xs.map((ax, a) => (xs[(a+1)%3]-ax)*(z-zs[a]) - (zs[(a+1)%3]-zs[a])*(x-ax));
            if (Math.min(...sides) >= 0 || Math.max(...sides) <= 0) check(x, z, roof);
          }
        }
      }
      expect(triangles).toBeGreaterThan(1000);
      expect(minClearance, worst).toBeGreaterThanOrEqual(-.01);
    }
    // Civic building 269871432 straddles the old square edge. Cast on the
    // two clipped pieces themselves to catch a missing north-band registration.
    function roofAt(row: Board, z: number) {
      const shell = mounted.get(row)!.scenery.children.find(o => o instanceof Mesh && o.geometry.hasAttribute('aBase'))!;
      const ray = new Raycaster(new Vector3(1580, 100, z), new Vector3(0,-1,0));
      return ray.intersectObject(shell)[0].point.y;
    }
    expect(roofAt('north-band', -1699.9)).toBeCloseTo(roofAt('midtown-south', -1700.1), 4);
  } finally {
    for (const area of new Set(mounted.values())) area.dispose();
  }
}, 30000);
