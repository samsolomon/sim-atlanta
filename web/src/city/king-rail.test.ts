import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Raycaster, Vector3, type Mesh } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { lonLatToScene } from '../core/places';
import { GroundGrid } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import type { TerrainCity } from '../terrain/transport-data';
import { eastBounds } from './board-footprint';
import kingRail from './fixtures/king-rail.json';
import { kingFreight, loadEast } from './king-memorial-board';

// The King Memorial board once drew no freight at all: its context carries no rail, so
// the CSX line and the Hulsey Yard leads stopped at the downtown edge (x = 1000).
const pack = new URL('../../../pipeline/prototypes/king-memorial/', import.meta.url);
const ORIGIN = { lon: -84.3916, lat: 33.7539 };
afterEach(() => vi.unstubAllGlobals());

/** The drawn ground ballast of the King board, as plan triangles. */
function drawnBallast() {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  const grid = new GroundGrid(JSON.parse(readFileSync(new URL('ground/ground.json', pack), 'utf8')),
    Uint8Array.from(readFileSync(new URL('ground/ground.i16', pack))).buffer);
  const context = JSON.parse(readFileSync(new URL('context.json', pack), 'utf8')) as TerrainCity;
  const area = createDowntownTerrain(grid, { ...context, buildings: [], roads: [], rail: [] }, [], { quality: 'high', bottomY: -48 });
  const freight = kingFreight({ ...context, roads: [] }, grid, area);
  const mesh = freight.group.getObjectByName('Freight track') as Mesh;
  const p = mesh.geometry.getAttribute('position');
  const tris: number[][] = [];
  for (let i = 0; i < p.count; i += 3) tris.push([p.getX(i), p.getZ(i), p.getX(i + 1), p.getZ(i + 1), p.getX(i + 2), p.getZ(i + 2)]);
  const inside = (x: number, z: number) => tris.some(([ax, az, bx, bz, cx, cz]) => {
    const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
    if (Math.abs(d) < 1e-9) return false;
    const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d;
    return u >= -1e-6 && v >= -1e-6 && u + v <= 1 + 1e-6;
  });
  // Float32 vertices leave hairline seams between neighbouring pieces; 5 cm spans them.
  const covered = (x: number, z: number) => [[0, 0], [.05, 0], [-.05, 0], [0, .05], [0, -.05]].some(([dx, dz]) => inside(x + dx, z + dz));
  return { covered, dispose: () => { freight.dispose(); area.dispose(); } };
}

/** Points every `step` metres along a polyline, inside the board less a margin. */
function along(pts: number[][], step: number, margin: number) {
  const out: [number, number][] = [];
  for (let i = 1; i < pts.length; i++) {
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], len = Math.hypot(bx - ax, bz - az);
    for (let s = 0; s < len; s += step) {
      const x = ax + (bx - ax) * s / len, z = az + (bz - az) * s / len;
      if (x > eastBounds.minX + margin && x < eastBounds.maxX - margin && z > eastBounds.minZ + margin && z < eastBounds.maxZ - margin) out.push([x, z]);
    }
  }
  return out;
}

it('continues the six freight tracks that leave downtown at x = 1000', () => {
  // Two CSX Atlanta Terminal Subdivision mains and four Hulsey Yard leads (OSM, matching
  // downtown's terrain transport node for node at the edge).
  const atEdge = kingRail.flatMap(r => r.pts.filter(([x]) => x === eastBounds.minX).map(([, z]) => z)).sort((a, b) => a - b);
  expect(atEdge).toEqual([556.47, 561.99, 566.02, 575.72, 580.15, 584.87]);
  expect(kingRail.filter(r => r.name === 'Atlanta Terminal Subdivision').length).toBeGreaterThanOrEqual(2);
});

it('draws ballast along every King Memorial freight run', () => {
  const { covered, dispose } = drawnBallast();
  try {
    const missing = kingRail.flatMap(r => along(r.pts, 5, 3).filter(([x, z]) => !covered(x, z)).map(([x, z]) => `${r.id} ${x.toFixed(0)},${z.toFixed(0)}`));
    expect(missing).toEqual([]);
  } finally { dispose(); }
}, 60_000);

it.each(['low','high'] as const)('carries the eight CSX tracks over a clear Grant Street on %s', async quality => {
  // Through City's own loader, so dropping the freight from the mount is caught too.
  let path: number[][] = [];
  const grantStrokes: string[] = [];
  const drawing = {
    strokeStyle: '',
    beginPath() { path = []; },
    moveTo(x: number, z: number) { path = [[x, z]]; },
    lineTo(x: number, z: number) { path.push([x, z]); },
    stroke() {
      if (path[0]?.[1] === 414.2 && path.at(-1)?.[1] === 640 &&
          path.some(p => p[1] === 488.14) && path.some(p => p[1] === 527.43))
        grantStrokes.push(this.strokeStyle);
    },
  };
  const ctx = new Proxy(drawing, { get: (o, k) => Reflect.get(o, k) ?? (() => {}) });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  vi.stubGlobal('fetch', async (url: string) => {
    const name = url.split('/scene/king-memorial/')[1];
    const file = name === 'context.json' ? new URL('context.json', pack) : new URL('ground/' + name, pack);
    return new Response(Uint8Array.from(readFileSync(file)).buffer);
  });
  const down = new URL('../../../pipeline/prototypes/downtown-ground/', import.meta.url);
  const west = new GroundGrid(JSON.parse(readFileSync(new URL('ground.json', down), 'utf8')), Uint8Array.from(readFileSync(new URL('ground.i16', down))).buffer);
  const area = await loadEast('/data', west, quality, -48, new AbortController().signal);
  try {
    expect(grantStrokes).toEqual(expect.arrayContaining(['#d9d3c7', '#5d5f66', '#d8bd79']));
    const mesh = area.group.getObjectByName('Freight track') as Mesh | undefined;
    expect(mesh?.geometry.getAttribute('position').count ?? 0).toBeGreaterThan(1000);
    const ray = new Raycaster();
    const down = new Vector3(0,-1,0);
    area.group.updateMatrixWorld(true);
    const x = 1382;
    const tracks = kingRail.flatMap(run => run.pts.slice(1).flatMap(([bx,bz],i) => {
      const [ax,az] = run.pts[i];
      return (ax-x)*(bx-x)<0 ? [az+(bz-az)*(x-ax)/(bx-ax)] : [];
    }));
    expect(tracks).toHaveLength(8);
    for (const z of tracks) {
      ray.set(new Vector3(x,0,z),down);
      expect(ray.intersectObject(mesh!,false)[0]?.point.y).toBeCloseTo(313.66+.13-west.manifest.vertical.sceneZeroNavd88M,1);
    }
    const road = area.connectorBoard.city.roads.find(r => r.tunnel && r.name === 'Grant Street Southeast')!;
    for(let z=489;z<=526;z+=.5) {
      for(const dx of [-3.5,0,3.5]){
        const y=area.connectorBoard.roadHeight(x+dx,z,road)!;
        expect(y + west.manifest.vertical.sceneZeroNavd88M).toBeCloseTo(307.66 + (z-488.14)*.0046,1);
        expect(area.terrainAt(x+dx,z)).toEqual(y);
        ray.set(new Vector3(x+dx,y+4.10,z),down);
        expect(ray.intersectObject(area.board,true)[0]?.point.y).toBeCloseTo(y,1);
      }
    }
  } finally { area.dispose(); }
}, 60_000);

// With the generated data (pnpm data): downtown's freight ends meet the fixture's at the seam.
const vignetteFile = resolve(__dirname, '../../public/data/scene/downtown/vignette.json');
describe.skipIf(!existsSync(vignetteFile))('the downtown seam', () => {
  it('meets every downtown freight end at x = 1000 within 5 cm', () => {
    const downtown = JSON.parse(readFileSync(vignetteFile, 'utf8')) as { terrainTransport: { rail: { cls: string; pts: number[][] }[] } };
    const ends = downtown.terrainTransport.rail.filter(r => r.cls === 'standard_gauge')
      .flatMap(r => r.pts.filter(([x]) => x === eastBounds.minX).map(([, z]) => z)).sort((a, b) => a - b);
    const king = kingRail.flatMap(r => r.pts.filter(([x]) => x === eastBounds.minX).map(([, z]) => z)).sort((a, b) => a - b);
    expect(ends.length).toBe(king.length);
    ends.forEach((z, i) => expect(Math.abs(z - king[i])).toBeLessThan(0.05));
  });
});

// With the generated data (pnpm data): every CSX or NS NARN arc inside the board is drawn.
const freightFile = resolve(__dirname, '../../public/data/ga/freight.geojson');
describe.skipIf(!existsSync(freightFile))('NARN freight on the King Memorial board', () => {
  it('draws track within 12 m of every CSX and NS arc', () => {
    type Arc = { properties: { id: string; owner: string; net: string }; geometry: { type: string; coordinates: number[][] } };
    const arcs = (JSON.parse(readFileSync(freightFile, 'utf8')) as { features: Arc[] }).features
      .filter(f => ['CSXT', 'NS'].includes(f.properties.owner) && f.geometry.type === 'LineString');
    const { covered, dispose } = drawnBallast();
    try {
      // NARN centrelines sit a few metres off the OSM tracks; look for ballast around each point.
      const ring = [[0, 0], ...Array.from({ length: 16 }, (_, k) => [Math.cos(k * Math.PI / 8), Math.sin(k * Math.PI / 8)])];
      const near = (x: number, z: number) => [3, 6, 9, 12].some(r => ring.some(([dx, dz]) => covered(x + dx * r, z + dz * r)));
      let checked = 0;
      const missing: string[] = [];
      for (const arc of arcs) {
        const pts = arc.geometry.coordinates.map(([lon, lat]) => lonLatToScene(ORIGIN, lon, lat));
        for (const [x, z] of along(pts, 10, 15)) {
          checked++;
          if (!near(x, z)) missing.push(`${arc.properties.id} ${x.toFixed(0)},${z.toFixed(0)}`);
        }
      }
      expect(checked).toBeGreaterThan(50);
      expect(missing).toEqual([]);
    } finally { dispose(); }
  }, 60_000);
});
