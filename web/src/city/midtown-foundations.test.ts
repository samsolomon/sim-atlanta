import { existsSync, readFileSync } from 'node:fs';
import { Mesh, Raycaster, Vector3 } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import grades from '../../../pipeline/prototypes/midtown-foundations/grades.json';
import { addSection, joins, midtownRows, type Area, type Board } from '../square-board/sections';
import { GroundGrid, type GroundManifest } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import type { TerrainCity } from '../terrain/transport-data';
import { brookwoodGrid } from './brookwood';
import { loadEast } from './king-memorial-board';
import { summitDowntown, summitNorth } from './square-mosaic';
import { loadNorth } from './sweet-auburn-board';

const proto = new URL('../../../pipeline/prototypes/', import.meta.url);
const scene = new URL('../../public/data/scene/', import.meta.url);
const bytes = (url: URL) => Uint8Array.from(readFileSync(url)).buffer;
const json = (url: URL) => JSON.parse(readFileSync(url, 'utf8'));
// Downtown, King and Auburn buildings are staged by `pnpm data`.
const staged = ['downtown/vignette.json', 'king-memorial/context.json', 'sweet-auburn/context.json']
  .every(file => existsSync(new URL(file, scene)));
afterEach(() => vi.unstubAllGlobals());

type Building = TerrainCity['buildings'][number];
function inside(x: number, z: number, ring: number[][]) {
  let c = false;
  for (let i = 0, j = ring.length-1; i < ring.length; j = i++) {
    const [xi, zi] = ring[i], [xj, zj] = ring[j];
    if ((zi > z) !== (zj > z) && x < (xj-xi)*(z-zi)/(zj-zi) + xi) c = !c;
  }
  return c;
}

/**
 * The drawn top roof of each footprint, read from the actual building batches.
 * Lower flat surfaces (parking slabs, porches, courtyards) belong to finishes.
 */
function roofClearances(area: Area, buildings: Building[]) {
  const index = new Map<string, Building[]>();
  for (const b of buildings) {
    const r = b.rings[0];
    if (!r) continue;
    const xs = r.map(p => p[0]), zs = r.map(p => p[1]);
    for (let x = Math.floor(Math.min(...xs)/50); x <= Math.floor(Math.max(...xs)/50); x++)
      for (let z = Math.floor(Math.min(...zs)/50); z <= Math.floor(Math.max(...zs)/50); z++)
        index.set(`${x},${z}`, [...index.get(`${x},${z}`) ?? [], b]);
  }
  const owner = (x: number, z: number) => index.get(`${Math.floor(x/50)},${Math.floor(z/50)}`)
    ?.find(b => inside(x, z, b.rings[0]) && !b.rings.slice(1).some(hole => inside(x, z, hole)));
  const tops = new Map<string, { y: number; tris: number[][] }>();
  for (const mesh of area.scenery.children.filter(o => o instanceof Mesh && o.geometry.hasAttribute('aBase')) as Mesh[]) {
    const p = mesh.geometry.getAttribute('position'), style = mesh.geometry.getAttribute('aStyle');
    for (let i = 0; i < p.count; i += 3) {
      const y = p.getY(i);
      if (style.getX(i) >= 0 || y !== p.getY(i+1) || y !== p.getY(i+2)) continue;
      const t = [p.getX(i), p.getZ(i), p.getX(i+1), p.getZ(i+1), p.getX(i+2), p.getZ(i+2)];
      const b = owner((t[0]+t[2]+t[4])/3, (t[1]+t[3]+t[5])/3);
      if (!b) continue;
      const top = tops.get(b.id);
      if (!top || y > top.y + 1e-6) tops.set(b.id, { y, tris: [t] });
      else if (Math.abs(y - top.y) < 1e-6) top.tris.push(t);
    }
  }
  const clearance = new Map<string, number>();
  for (const [id, { y, tris }] of tops) {
    let worst = Infinity;
    const check = (x: number, z: number) => {
      const ground = area.groundAt(x, z);
      if (ground !== null) worst = Math.min(worst, y - ground);
    };
    for (const t of tris) {
      const xs = [t[0], t[2], t[4]], zs = [t[1], t[3], t[5]];
      for (let a = 0; a < 3; a++) {
        const b = (a+1)%3, dx = xs[b]-xs[a], dz = zs[b]-zs[a];
        const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 2.5));
        for (let k = 0; k < count; k++) check(xs[a]+dx*k/count, zs[a]+dz*k/count);
      }
      // An interior ground summit can penetrate an otherwise clear roof.
      for (let x = Math.ceil(Math.min(...xs)/5)*5; x <= Math.max(...xs); x += 5) {
        for (let z = Math.ceil(Math.min(...zs)/5)*5; z <= Math.max(...zs); z += 5) {
          const sides = xs.map((ax, a) => (xs[(a+1)%3]-ax)*(z-zs[a]) - (zs[(a+1)%3]-zs[a])*(x-ax));
          if (Math.min(...sides) >= 0 || Math.max(...sides) <= 0) check(x, z);
        }
      }
    }
    clearance.set(id, worst);
  }
  return clearance;
}

// Without `pnpm data`, the rectangle check below covers only the ten checked-in
// boards. Report that as a skip rather than a pass.
it.skipIf(staged)('checks downtown, King and Auburn roofs once `pnpm data` stages them', () => {});

it.skipIf(!staged)('keys every downtown grade to a staged footprint', () => {
  const ids = new Set((json(new URL('downtown/vignette.json', scene)) as TerrainCity).buildings.map(b => b.id));
  const downtown = Object.keys(grades).filter(id => !id.startsWith('osm:'));
  expect(downtown.length).toBeGreaterThanOrEqual(11);
  // A new Overture release would silently drop the floor fit.
  expect(downtown.filter(id => !ids.has(id))).toEqual([]);
});

it.each(['low', 'high'] as const)('keeps every rendered generic roof in the rectangle above its ground at %s', async quality => {
  const ctx: object = new Proxy(function () {}, { get: () => ctx, apply: () => ctx });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  vi.stubGlobal('fetch', (url: string) => new Response(url.includes('/square-board/')
    ? bytes(new URL('square-board/' + url.split('/square-board/')[1], proto))
    : bytes(new URL(url.split('/scene/')[1], scene))));
  const manifest: GroundManifest = json(new URL('downtown-ground/ground.json', proto));
  const grid = new GroundGrid(manifest, bytes(new URL('downtown-ground/ground.i16', proto)));
  const signal = new AbortController().signal;
  const city: TerrainCity = staged ? json(new URL('downtown/vignette.json', scene))
    : { bounds: manifest.bounds, buildings: [], roads: [], rail: [] };
  const downtown = createDowntownTerrain(grid, city, [], { quality, join: joins('downtown'), separateBuilding: summitDowntown });
  const mounted = new Map<Board, Area>([['downtown', downtown]]);
  const footprints = new Map<Board, Building[]>([['downtown', city.buildings]]);
  try {
    if (staged) {
      const king = await loadEast('', grid, quality, downtown.bottomY, signal, joins('king').slice(1));
      mounted.set('king', king);
      mounted.set('auburn', await loadNorth('', grid, king.grid, quality, downtown.bottomY, signal, joins('auburn').slice(2)));
      footprints.set('king', json(new URL('king-memorial/context.json', scene)).buildings);
      footprints.set('auburn', json(new URL('sweet-auburn/context.json', scene)).buildings);
    }
    for (const direction of ['north', 'south'] as const)
      await addSection(direction, mounted, quality, signal, { northBuilding: summitNorth });
    for (const row of midtownRows)
      await addSection(row, mounted, quality, signal, { brookwood: async (m, b) => brookwoodGrid(m, b) });
    for (const id of ['north-band', 'north-corner', 'south-band', 'south-corner', ...midtownRows] as const)
      footprints.set(id, json(new URL(`square-board/${id}/context.json`, proto)).buildings);
    // Each mapped building:part is its own roof, so a buried podium beside a
    // tower is caught rather than masked by the tower's higher roof.
    // Raised parts (canopies and bridges, with a mapped underside) are left out:
    // like the real ones they meet a sloping street at one end.
    for (const [board, list] of footprints) footprints.set(board, list.flatMap((b: Building) => b.parts?.length
      ? b.parts.flatMap((part, i) => part.minH ? [] : [{ ...b, id: `${b.id}#${i}`, rings: part.rings }]) : [b]));
    expect(mounted.size).toBe(staged ? 12 : 10);
    const buried: string[] = [];
    let roofs = 0;
    for (const [board, area] of mounted) {
      const clearance = roofClearances(area, footprints.get(board)!);
      roofs += clearance.size;
      for (const [id, c] of clearance) if (c < -.01) buried.push(`${board} ${id} ${c.toFixed(2)} m`);
    }
    expect(roofs).toBeGreaterThan(staged ? 6000 : 5000);
    expect(buried).toEqual([]);
    // Civic building 269871432 straddles the old square edge. Cast on the
    // two clipped pieces themselves to catch a missing north-band floor.
    function roofAt(row: Board, z: number) {
      const shell = mounted.get(row)!.scenery.children.find(o => o instanceof Mesh && o.geometry.hasAttribute('aBase'))!;
      const ray = new Raycaster(new Vector3(1580, 100, z), new Vector3(0,-1,0));
      return ray.intersectObject(shell)[0].point.y;
    }
    expect(roofAt('north-band', -1699.9)).toBeCloseTo(roofAt('midtown-south', -1700.1), 4);
  } finally {
    for (const area of new Set(mounted.values())) area.dispose();
  }
}, 60000);
