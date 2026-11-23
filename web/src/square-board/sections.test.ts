import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { InstancedMesh } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import { addSection, bounds, connect, joins, type Area, type Board } from './sections';

import { buildEastRail, extendRail } from '../city/east-rail';
import { connectorTrafficRoutes } from '../city/connector-traffic-routes';
import { terrainAlignment } from '../city/terrain-rail';
import { alignment } from '../vignette/alignment';

const source = new URL('../../../pipeline/prototypes/', import.meta.url);
function file(id: Board, name: string) {
  const path = id === 'downtown' ? 'downtown-ground' : id === 'king' ? 'king-memorial/ground' : id === 'auburn' ? 'sweet-auburn/ground' : 'square-board/' + id;
  return readFileSync(new URL(path + '/' + name, source));
}
function grid(id: Board) {
  return new GroundGrid(JSON.parse(file(id, 'ground.json').toString()), Uint8Array.from(file(id, 'ground.i16')).buffer);
}
afterEach(() => vi.unstubAllGlobals());

it('follows both carriageways across seven boards with open northern underpasses and a concealed Capitol cap', () => {
  const cities = Object.values(bounds).map(bounds => ({ bounds, roads: [], buildings: [], rail: [] }));
  const routes = connectorTrafficRoutes(cities[0], cities.slice(1));
  for (const direction of ['northbound', 'southbound'] as const) {
    const through = routes.filter(r => {
      if (r.direction !== direction) return false;
      const ends = [r.line.pts[0][1], r.line.pts.at(-1)![1]].sort((a, b) => a - b);
      return ends[0] < -1699 && ends[1] > 1099;
    });
    expect(through.length).toBeGreaterThanOrEqual(5);
    expect(Math.max(...through.map(route => route.line.length))).toBeGreaterThan(3700);
    for (const route of through) {
      const owners = [...new Set(route.roads)];
      const civic = owners.filter(road => road.pts.some(([x, z]) => x > 350 && x < 405 && z < -1360 && z > -1440));
      expect(civic.length).toBeGreaterThan(0);
      expect(civic.every(road => !road.tunnel)).toBe(true);
    }
    // The south HOV ramp can take its own alignment beside the capped mainlines.
    expect(through.some(route => route.roads.some(road => road.tunnel &&
      road.pts.some(([, z]) => z > 815 && z < 842)))).toBe(true);
  }
});

it.each(['high', 'low'] as const)('preserves all exterior and internal seam nodes and midpoints on %s', async quality => {
  const ctx = new Proxy({}, { get: () => () => { } });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  const badCorner = Uint8Array.from(file('south-corner', 'ground.i16'));
  // x=1400 at z=640 is on the last tested neighbor (King), after the band's edges pass.
  new DataView(badCorner.buffer).setInt16(2 * 80, -32768, true);
  const manifest = JSON.parse(file('south-corner', 'ground.json').toString());
  manifest.sha256 = createHash('sha256').update(badCorner).digest('hex');
  let fault: 'checksum' | 'seam' | null = 'checksum';
  vi.stubGlobal('fetch', async (url: string) => {
    const [, id, name] = url.match(/square-board\/([^/]+)\/(.+)$/)!;
    const data = Uint8Array.from(file(id as Board, name));
    if (id === 'north-band' && name === 'context.json') {
      const crowns = JSON.parse(readFileSync(new URL('expanded-canopy/crowns.json', source), 'utf8'));
      return Response.json({ ...JSON.parse(new TextDecoder().decode(data)),
        trees: crowns[id].trees.slice(0, 3), treeLowCount: 1 });
    }
    if (fault && id === 'south-corner') {
      if (name === 'ground.i16') return new Response(badCorner.buffer);
      if (fault === 'seam' && name === 'ground.json') return Response.json(manifest);
    }
    return new Response(data.buffer);
  });
  const mounted = new Map<Board, Area>();
  try {
    for (const id of ['downtown', 'king', 'auburn'] as const) {
      const g = grid(id), context = { bounds: bounds[id], buildings: [], roads: [], rail: [] };
      connect(mounted, new Map([[id, createDowntownTerrain(g, context, [], { quality, bottomY: -48, join: joins(id) })]]));
    }
    const signal = new AbortController().signal;
    function walls() {
      return [...mounted].flatMap(([id, area]) => joins(id).map((_, i) =>
        area.board.getObjectByName(i ? 'joining edge ' + i : 'joining edge')!.visible));
    }
    const originalWalls = walls();
    for (const error of [/checksum/, /1400,640/]) {
      await expect(addSection('south', mounted, quality, signal)).rejects.toThrow(error);
      expect([...mounted.keys()]).toEqual(['downtown', 'king', 'auburn']);
      expect(walls()).toEqual(originalWalls);
      fault = 'seam';
    }
    fault = null;
    for (const d of quality === 'high' ? ['north', 'south'] as const : ['south', 'north'] as const) {
      await addSection(d, mounted, quality, signal);
      if (mounted.size === 5) expect(mounted.has(d === 'north' ? 'south-corner' : 'north-corner')).toBe(false);
    }
    const trunks = mounted.get('north-band')!.scenery.children.find(
      mesh => mesh instanceof InstancedMesh && mesh.geometry.type === 'CylinderGeometry',
    ) as InstancedMesh;
    expect(trunks.count).toBe(quality === 'high' ? 3 : 1);
    const hasLeafMesh = (id: Board, geometry: string) => mounted.get(id)!.scenery.children.some(
      mesh => mesh instanceof InstancedMesh && mesh.geometry.type === geometry,
    );
    expect(hasLeafMesh('north-band', 'OctahedronGeometry')).toBe(true);
    expect(hasLeafMesh('downtown', 'DodecahedronGeometry')).toBe(true);
    let boardArea = 0;
    for (const [id, area] of mounted) {
      const b = bounds[id];
      boardArea += (b.maxX - b.minX) * (b.maxZ - b.minZ);
      for (const [i, edge] of joins(id).entries()) {
        expect(area.board.getObjectByName(i ? 'joining edge ' + i : 'joining edge')?.visible).toBe(false);
        const vertical = 'x' in edge;
        for (let v = vertical ? edge.minZ : edge.minX; v <= (vertical ? edge.maxZ : edge.maxX); v += 2.5) {
          const x = vertical ? edge.x : v, z = vertical ? v : edge.z;
          const h = area.grid.sample(x, z)!;
          expect(area.groundAt(x, z)! + 323.8).toBeCloseTo(h, 4);
        }
      }
    }
    expect(boardArea).toBe(2800 ** 2);
  } finally { for (const area of mounted.values()) area.dispose(); }
});

const staged = new URL('../../public/data/', import.meta.url);
const railInputs = ['ga/routes.json', 'scene/downtown/scene.json', 'scene/king-memorial/corridor.json'];
it.skipIf(!railInputs.every(path => existsSync(new URL(path, staged))))('joins the existing guideway beds at the downtown–King edge within 2 cm', () => {
  const [routes, manifest, pack] = railInputs.map(path => JSON.parse(readFileSync(new URL(path, staged), 'utf8')));
  const downtown = grid('downtown'), king = grid('king');
  const zero = downtown.manifest.vertical.sceneZeroNavd88M;
  const id = 'marta:path:155177';
  const west = terrainAlignment(alignment(routes, manifest, bounds.downtown, id), id, manifest, downtown);
  const east = buildEastRail(extendRail(manifest, routes), routes, pack, (x, z) => {
    const h = king.sample(x, z);
    return h == null ? null : h - zero;
  }, zero);
  try {
    let lo = 0, hi = west.line.length;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (west.line.at(mid).x < bounds.king.minX) lo = mid;
      else hi = mid;
    }
    expect(west.line.at(lo).x).toBeCloseTo(bounds.king.minX, 5);
    expect(Math.abs(west.elev(lo) - east.bed(east.sSeam))).toBeLessThan(0.02);
  } finally { east.dispose(); }
});
