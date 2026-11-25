import { existsSync, readFileSync } from 'node:fs';
import { BufferAttribute } from 'three';
import { expect, it } from 'vitest';
import { brookwoodGrid } from '../city/brookwood';
import { seventeenthAccess, seventeenthPortals } from '../city/seventeenth-street';
import { auburnTransport } from '../city/sweet-auburn-transport';
import { northConnectorGround, northConnectorTransport } from '../square-board/connector-ground';
import { southConnectorTransport } from '../square-board/south-connector-decks';
import rowBounds from '../../../pipeline/prototypes/square-board/midtown-rows.json';
import { bridgeApproaches } from './bridge-approaches';
import { GroundGrid } from './grid';
import { junctionPortals } from './junction-decks';
import { midtownConnectorDecks } from './midtown-connector-decks';
import { midtownConnectorGround } from './midtown-connector-ground';
import { northAvenue } from './north-ave';
import { streetPortals } from './street-bridges';
import { GroundSurface } from './surface';
import { triangleHeight } from './tread-height';
import type { TerrainCity } from './transport-data';
import { underpassGround } from './underpass';
import { createSurfaceTransport, landingPortals } from './transport';
import { cityRoadHeight } from '../city/road-height';
import { Line, segDist } from '../vignette/geom';
import { roadWidth } from './transport-data';

const root = new URL('../../../pipeline/prototypes/', import.meta.url);
const staged = new URL('../../public/data/scene/downtown/vignette.json', import.meta.url);
const read = (u: URL) => readFileSync(u);
function board(id: string) {
  if (id === 'downtown') {
    const d = new URL('downtown-ground/', root);
    return { grid: new GroundGrid(JSON.parse(read(new URL('ground.json', d)).toString()), Uint8Array.from(read(new URL('ground.i16', d))).buffer), city: JSON.parse(read(staged).toString()) as TerrainCity };
  }
  const d = new URL('square-board/' + id + '/', root);
  const manifest = JSON.parse(read(new URL('ground.json', d)).toString());
  const bytes = Uint8Array.from(read(new URL('ground.i16', d))).buffer;
  const terrain = midtownConnectorGround(manifest, bytes);
  const grid = id.startsWith('brookwood') ? brookwoodGrid(manifest, terrain)
    : id === 'north-band' ? northConnectorGround(manifest, bytes)
    : new GroundGrid(manifest, id === 'midtown-south' ? underpassGround(northAvenue, manifest, terrain) : terrain);
  const context = JSON.parse(read(new URL('context.json', d)).toString());
  const decks = id === 'north-band' ? northConnectorTransport(context) : id === 'south-band' ? southConnectorTransport(context)
    : id === 'brookwood-south' || id === 'midtown-upper' ? seventeenthAccess(auburnTransport(context)) : auburnTransport(context);
  return { grid, city: (id in rowBounds ? midtownConnectorDecks(decks) : decks) as TerrainCity };
}
export const BOARDS = ['downtown', 'north-band', 'south-band', 'north-corner', 'south-corner', 'brookwood-south', 'brookwood-station', 'midtown-central', 'midtown-south', 'midtown-upper'].filter(id => id !== 'downtown' || existsSync(staged));

export function measure(id: string, quality: 'low' | 'high') {
  const { grid, city } = board(id), zero = grid.manifest.vertical.sceneZeroNavd88M;
  const surface = new GroundSurface(grid, quality), bare = surface.sampleScene.bind(surface);
  const approach = bridgeApproaches([...streetPortals(city), ...junctionPortals(city), ...seventeenthPortals(city), ...landingPortals(city, bare, zero)], zero, bare, city.bounds, city.roads);
  const pos = approach.geometry.getAttribute('position') as BufferAttribute;
  const cells = new Map<string, number[]>();
  const key = (x: number, z: number) => Math.floor(x / 8) + ',' + Math.floor(z / 8);
  for (let i = 0; i < pos.count; i += 3) {
    const xs = [0, 1, 2].map(k => pos.getX(i + k)), zs = [0, 1, 2].map(k => pos.getZ(i + k));
    for (let cx = Math.floor(Math.min(...xs) / 8); cx <= Math.floor(Math.max(...xs) / 8); cx++)
      for (let cz = Math.floor(Math.min(...zs) / 8); cz <= Math.floor(Math.max(...zs) / 8); cz++) {
        const k = cx + ',' + cz; if (!cells.has(k)) cells.set(k, []); cells.get(k)!.push(i);
      }
  }
  const drawn = (x: number, z: number) => {
    let y: number | null = null;
    for (const i of cells.get(key(x, z)) ?? []) { const h = triangleHeight(pos, i, x, z); if (h !== null) y = y === null ? h : Math.max(y, h); }
    return y;
  };
  const rows = approach.joints.map(j => {
    const width = Math.hypot(...([0, 1].map(k => j.point(1, 0)[k] - j.point(0, 0)[k]) as [number, number]));
    const n = Math.max(4, Math.ceil(width / 0.5));
    let step = 0, pen = 0, fold = 0;
    for (let k = 1; k < n; k++) {
      const u = k / n;
      // Beyond the toe: the board, or another approach that the toe lands on.
      const inside = drawn(...j.point(u, 0.05)), outside = approach.groundAt(...j.point(u, -0.05));
      if (inside === null || outside === null) continue;
      step = Math.max(step, Math.abs(inside - outside));
      const a = drawn(...j.point(u, 2)), b = bare(...j.point(u, -2));
      if (a !== null && b !== null) fold = Math.max(fold, Math.abs((a - inside) / 1.95 + (b - outside) / 1.95));
      for (let d = 0.25; d < j.length; d += 0.5) {
        const y = drawn(...j.point(u, d)), g = bare(...j.point(u, d));
        if (y !== null && g !== null) pen = Math.max(pen, g - y);
      }
    }
    const [tx, tz] = j.point(0.5, -4), [ix, iz] = j.point(0.5, 4);
    const bearing = Math.round((-Math.atan2(tx - ix, tz - iz) * 180) / Math.PI);
    const cam = [Math.round(tx), Math.round(tz), bearing, 60, 160];
    return { id, name: j.name, step, pen, fold, cam };
  });
  // Deck runs that land on the board directly (Midtown and Brookwood ramps, decks).
  const transport = createSurfaceTransport(city, grid, approach.groundAt);
  const runs = city.terrainTransport?.roads ?? [];
  const nodes = new Map<string, number>();
  for (const r of runs) for (const p of [r.pts[0], r.pts.at(-1)!]) nodes.set(p.join(','), (nodes.get(p.join(',')) ?? 0) + 1);
  const b = city.bounds;
  for (const run of runs) {
    if (run.kind !== 'bridge' || run.pts.length < 2 || run.deckNavd88M || ['footway', 'pedestrian', 'steps', 'path', 'cycleway'].includes(run.cls)) continue;
    const line = new Line(run.pts);
    for (const end of [0, 1]) {
      const p = end ? run.pts.at(-1)! : run.pts[0];
      if ((nodes.get(p.join(',')) ?? 0) > 1 || p[0] === b.minX || p[0] === b.maxX || p[1] === b.minZ || p[1] === b.maxZ) continue;
      const at = line.at(end ? line.length : 0), out = end ? 1 : -1;
      const half = roadWidth(run) / 2 - 0.3;
      let step = 0, cross = 0, n = 0;
      for (let k = 0; k <= 16; k++) {
        const off = -half + (2 * half * k) / 16;
        const x = at.x + off * at.nx, z = at.z + off * at.nz;
        const inside = transport.deckAt(x - out * at.dx * 0.1, z - out * at.dz * 0.1, run);
        const outside = approach.groundAt(x + out * at.dx * 0.1, z + out * at.dz * 0.1);
        if (inside === null || outside === null) continue;
        n++;
        // A deck keeps its 12 cm tread over the board: measure what is left beyond it.
        step = Math.max(step, Math.abs(inside - outside - 0.12));
      }
      // Grade along the deck's last 15 m: a deck that plunges to its landing shows as a dark band.
      let grade = 0;
      for (let d = 0.5; d + 1 <= Math.min(15, line.length); d += 1) {
        const a = line.at(end ? line.length - d : d), b2 = line.at(end ? line.length - d - 1 : d + 1);
        const ya = transport.deckAt(a.x, a.z, run), yb = transport.deckAt(b2.x, b2.z, run);
        if (ya !== null && yb !== null) grade = Math.max(grade, Math.abs(ya - yb));
      }
      const centre = approach.groundAt(at.x, at.z);
      for (const off of [-half, half]) { const g = approach.groundAt(at.x + off * at.nx, at.z + off * at.nz); if (g !== null && centre !== null) cross = Math.max(cross, Math.abs(g - centre)); }
      if (n) rows.push({ id, name: 'run ' + (run.name ?? run.cls) + ' ' + p.map(Math.round).join(','), step, pen: grade, fold: cross, cam: [Math.round(at.x + out * at.dx * 6), Math.round(at.z + out * at.dz * 6), Math.round((-Math.atan2(out * at.dx, out * at.dz) * 180) / Math.PI), 60, 160] });
    }
  }
  transport.dispose();
  const tris = pos.count / 3;
  approach.geometry.dispose(); approach.walls.dispose(); surface.geometry.dispose();
  return { rows, tris };
}

// Landings this change fixes: plain road decks that end on the board. Others still
// meet a DEM hump at their toe and need the board regraded (listed in the PR).
const LANDINGS = ['Ralph David Abernathy Freeway -558,965', 'Ralph David Abernathy Freeway -624,980',
  'Ralph David Abernathy Freeway -627,1000', 'Ralph David Abernathy Freeway -561,984', 'Whitehall Street Southwest -551,800',
  'Andrew Young International Boulevard Northeast 1155,-705', 'Montgomery Ferry Drive Northeast 1559,-5222',
  'Montgomery Ferry Drive Northeast 1624,-5255', 'Ellis Street Northeast 1205,-597', 'secondary 1200,-613'];
// Still climbing from their landing at 30–40%: the inferred deck height rises at its
// 15% minimum or steeper from the board. Open; see the PR.
const STEEP = ['Ralph David Abernathy Freeway -558,965', 'Ralph David Abernathy Freeway -624,980',
  'Ralph David Abernathy Freeway -627,1000', 'Ralph David Abernathy Freeway -561,984', 'Whitehall Street Southwest -551,800'];

for (const quality of ['low', 'high'] as const)
  it('meets the board flush where each approach and landing deck ends on ' + quality, () => {
    const worst = { step: 0, pen: 0, landing: 0, grade: 0 };
    const seen = new Set<string>();
    for (const id of BOARDS) {
      const { rows } = measure(id, quality);
      for (const r of rows) {
        if (r.name.startsWith('deck') || r.name.startsWith('link')) {
          worst.step = Math.max(worst.step, r.step);
          worst.pen = Math.max(worst.pen, r.pen);
        } else if (LANDINGS.some((n) => r.name.endsWith(n))) {
          seen.add(r.name);
          worst.landing = Math.max(worst.landing, r.step);
          if (!STEEP.some((n) => r.name.endsWith(n))) worst.grade = Math.max(worst.grade, r.pen);
        }
      }
    }
    console.info(quality, 'approach and landing joints', JSON.stringify(worst));
    expect(seen.size).toBe(LANDINGS.length);
    // Steps at the toe of each approach, and terrain showing through it.
    expect(worst.step).toBeLessThan(0.15);
    expect(worst.pen).toBeLessThan(0.5);
    // A landing deck sits its 12 cm tread over the board across its whole width.
    expect(worst.landing).toBeLessThan(0.15);
    // And arrives at no more than a steep street's grade.
    expect(worst.grade).toBeLessThan(0.16);
  }, 300000);

it('keeps the Ellis road top and its outgoing grade continuous across the east landing', () => {
  const { city, grid } = board('north-corner');
  const surface = new GroundSurface(grid, 'high'), bare = surface.sampleScene.bind(surface);
  const zero = grid.manifest.vertical.sceneZeroNavd88M;
  const approach = bridgeApproaches([...streetPortals(city), ...junctionPortals(city),
    ...landingPortals(city, bare, zero)], zero, bare, city.bounds, city.roads);
  const decks = createSurfaceTransport(city, grid, approach.groundAt);
  try {
    const deck = city.terrainTransport!.roads.find(r => r.kind === 'bridge' &&
      r.cls === 'secondary' && r.pts.at(-1)?.[0] === 1205.41)!;
    const axis = new Line(deck.pts), at = axis.at(axis.length);
    const street = city.roads.find(r => !r.bridge && r.name === 'Ellis Street Northeast' &&
      r.pts[0][0] === 1205.41)!;
    const land = new Line(street.pts).at(0);
    const wheelHeight = cityRoadHeight(city, approach.groundAt, decks.deckAt);
    // Eastbound Ellis crosses the Connector link 6.97 m before its abutment.
    const crossX = 1199.2884, crossZ = -593.52785;
    const lowerRoad = city.roads.find(r => r.cls === 'motorway' && !r.bridge &&
      r.pts.some((p, i) => i && segDist(crossX, crossZ, r.pts[i - 1], p) < .02))!;
    const lower = wheelHeight(crossX, crossZ, lowerRoad);
    const upper = decks.deckAt(crossX, crossZ, deck);
    expect(Number.isFinite(lower)).toBe(true);
    expect(Number.isFinite(upper)).toBe(true);
    expect(upper! - lower!).toBeGreaterThan(6.1);
    for (const wheel of [-0.8, 0, 0.8]) {
      const x = at.x + wheel * at.nx, z = at.z + wheel * at.nz;
      const top = decks.deckAt(x, z, deck)!;
      const outside = approach.groundAt(x + .05 * land.dx, z + .05 * land.dz)!;
      expect(top).not.toBeNull();
      expect(outside).not.toBeNull();
      expect(wheelHeight(x - .05 * at.dx, z - .05 * at.dz, city.roads.find(r => r.bridge &&
        r.name === street.name && r.pts.at(-1)?.[0] === 1205.41)!)).toBeCloseTo(top, 2);
      expect(wheelHeight(x + .05 * land.dx, z + .05 * land.dz, street)).toBeCloseTo(outside, 4);
      const arriving = top - decks.deckAt(x - at.dx, z - at.dz, deck)!;
      const departing = approach.groundAt(x + land.dx, z + land.dz)! - outside;
      expect(Math.abs(top - outside)).toBeLessThan(.02);
      expect(Math.abs(arriving - departing / .95)).toBeLessThan(.04);
    }
  } finally {
    decks.dispose();
    approach.geometry.dispose();
    approach.walls.dispose();
    surface.geometry.dispose();
  }
});
