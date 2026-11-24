import { existsSync, readFileSync } from 'node:fs';
import { BufferAttribute } from 'three';
import { it } from 'vitest';
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
  const approach = bridgeApproaches([...streetPortals(city), ...junctionPortals(city), ...seventeenthPortals(city)], zero, bare, city.bounds, city.roads);
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
      const inside = drawn(...j.point(u, 0.05)), outside = bare(...j.point(u, -0.05));
      if (inside === null || outside === null) continue;
      step = Math.max(step, Math.abs(inside - outside));
      const a = drawn(...j.point(u, 2)), b = bare(...j.point(u, -2));
      if (a !== null && b !== null) fold = Math.max(fold, Math.abs((a - inside) / 1.95 + (b - outside) / 1.95));
      for (let d = 0.25; d < j.length; d += 0.5) {
        const y = drawn(...j.point(u, d)), g = bare(...j.point(u, d));
        if (y !== null && g !== null) pen = Math.max(pen, g - y);
      }
    }
    if (process.env.JOINT && j.name.includes(process.env.JOINT)) {
      for (const u of [0.1, 0.3, 0.5, 0.7, 0.9]) console.log('u', u, [-6, -4, -2, -0.05, 0.05, 2, 4, 6, 8, 12].map(d => d + ':' + (d < 0 ? 'b' + bare(...j.point(u, d))?.toFixed(2) : 'a' + drawn(...j.point(u, d))?.toFixed(2) + '/b' + bare(...j.point(u, d))?.toFixed(2))).join(' '), 'len', j.length);
    }
    const [tx, tz] = j.point(0.5, -4), [ix, iz] = j.point(0.5, 4);
    const bearing = Math.round((-Math.atan2(tx - ix, tz - iz) * 180) / Math.PI);
    const cam = [Math.round(tx), Math.round(tz), bearing, 60, 160];
    return { id, name: j.name, step, pen, fold, cam };
  });
  const tris = pos.count / 3;
  approach.geometry.dispose(); approach.walls.dispose(); surface.geometry.dispose();
  return { rows, tris };
}

it('probes approach joints', () => {
  for (const q of ['high'] as const) for (const id of BOARDS) {
    const { rows, tris } = measure(id, q);
    console.log(q, id, 'joints', rows.length, 'tris', tris);
    for (const r of rows) console.log('  ', r.name, 'step', r.step.toFixed(2), 'pen', r.pen.toFixed(2), 'fold', r.fold.toFixed(2), 'cam', r.cam.join(','));
  }
}, 300000);
