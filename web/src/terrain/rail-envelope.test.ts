import { existsSync, readFileSync } from 'node:fs';
import * as THREE from 'three';
import { expect, it } from 'vitest';
import { northConnectorGround, northConnectorTransport } from '../square-board/connector-ground';
import { southConnectorTransport } from '../square-board/south-connector-decks';
import { Line, type P2 } from '../vignette/geom';
import { GroundGrid } from './grid';
import { GroundSurface } from './surface';
import { createSurfaceTransport, RAIL_ENVELOPE_M } from './transport';
import type { TerrainCity } from './transport-data';
import { triangleHeight } from './tread-height';

/**
 * Nothing drawn may stand in a train's running envelope: above any surface track, within its
 * swept half width, from just over the rail to the top of a car. A deck over a track must clear
 * it; a path or deck lying on the track bed between those heights is what Sam saw trains drive
 * through at the Gulch (2026-11-24). Level crossings (a road surface at the rail) sit below the
 * envelope's floor. Known sites are listed and counted so the count can only go down.
 */
const ENVELOPE_FLOOR_M = 0.3;
/** A double-stack car is 6.1 m; the downtown freight runs boxcars and locomotives under 4.7 m. */
const ENVELOPE_TOP_M = 5.3;
/** Clearance an inferred deck keeps over a track (RAIL_CLEARANCE_M), less the deck's depth. */
const DECK_CLEARANCE_M = 7;
/** Mapped ground paths that cross a drawn surface track at grade (painted across it). */
const AT_GRADE_DOWNTOWN = 1; // the pedestrian way under the Gulch deck at (-247,-162)
const WALKS = new Set(['footway', 'pedestrian', 'steps', 'path', 'cycleway']);

const src = new URL('../../../pipeline/prototypes/square-board/', import.meta.url);
const vignette = new URL('../../public/data/scene/downtown/vignette.json', import.meta.url);
const json = (u: URL) => JSON.parse(readFileSync(u, 'utf8'));
function board(name: 'downtown' | 'north-band' | 'south-band') {
  if (name === 'downtown') {
    const g = new URL('../../../pipeline/prototypes/downtown-ground/', import.meta.url);
    return { grid: new GroundGrid(json(new URL('ground.json', g)), Uint8Array.from(readFileSync(new URL('ground.i16', g))).buffer), city: json(vignette) as TerrainCity };
  }
  const d = new URL(name + '/', src);
  const manifest = json(new URL('ground.json', d)), bytes = Uint8Array.from(readFileSync(new URL('ground.i16', d))).buffer;
  const context = json(new URL('context.json', d));
  return { grid: name === 'north-band' ? northConnectorGround(manifest, bytes) : new GroundGrid(manifest, bytes),
    city: name === 'north-band' ? northConnectorTransport(context) : southConnectorTransport(context) };
}

/** Triangles of a mesh bucketed on a plan grid, for height queries at many points. */
function heights(mesh: THREE.Mesh, cell = 8) {
  const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
  const buckets = new Map<string, number[]>();
  for (let t = 0; t < pos.count / 3; t++) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (let k = 0; k < 3; k++) {
      const x = pos.getX(3 * t + k), z = pos.getZ(3 * t + k);
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
    }
    for (let i = Math.floor(x0 / cell); i <= Math.floor(x1 / cell); i++)
      for (let j = Math.floor(z0 / cell); j <= Math.floor(z1 / cell); j++) {
        const key = i + ',' + j;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push(3 * t);
      }
  }
  return (x: number, z: number) => {
    const out: number[] = [];
    for (const i of buckets.get(Math.floor(x / cell) + ',' + Math.floor(z / cell)) ?? []) {
      const y = triangleHeight(pos, i, x, z);
      if (y !== null) out.push(y);
    }
    return out;
  };
}

function cross(a: P2, b: P2, c: P2, d: P2): P2 | null {
  const rx = b[0] - a[0], rz = b[1] - a[1], qx = d[0] - c[0], qz = d[1] - c[1], den = rx * qz - rz * qx;
  if (Math.abs(den) < 1e-12) return null;
  const t = ((c[0] - a[0]) * qz - (c[1] - a[1]) * qx) / den, u = ((c[0] - a[0]) * rz - (c[1] - a[1]) * rx) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + t * rx, a[1] + t * rz] : null;
}

export interface EnvelopeSite { x: number; z: number; low: number; high: number }

/** Every 5 m cell over a surface track where a drawn structure enters the running envelope,
 * and the least clearance over a track at each cell a structure spans. */
export function railEnvelope(city: TerrainCity, grid: GroundGrid) {
  const surface = new GroundSurface(grid, 'high');
  const transport = createSurfaceTransport(city, grid, surface.sampleScene.bind(surface));
  const tread = transport.group.getObjectByName('Freight track') as THREE.Mesh | undefined;
  const decks = ['Decks and embedded rails', '17th Street Bridge']
    .map(name => transport.group.getObjectByName(name) as THREE.Mesh | undefined).filter((m): m is THREE.Mesh => !!m);
  const sites = new Map<string, EnvelopeSite>(), clearance = new Map<string, EnvelopeSite>();
  if (tread) {
    const treadAt = heights(tread), deckAt = decks.map(m => heights(m));
    for (const rail of city.terrainTransport!.rail) {
      if (rail.kind !== 'ground' || rail.cls === 'tram' || rail.pts.length < 2) continue;
      const line = new Line(rail.pts as P2[]);
      for (let s = 0; s <= line.length; s += 1) {
        const p = line.at(s);
        for (const off of [-RAIL_ENVELOPE_M + .2, 0, RAIL_ENVELOPE_M - .2]) {
          const x = p.x + off * p.nx, z = p.z + off * p.nz;
          const top = treadAt(x, z);
          if (!top.length) continue; // under a cover or off the drawn track
          const rail = Math.max(...top);
          const key = Math.round(x / 5) * 5 + ',' + Math.round(z / 5) * 5;
          for (const y of deckAt.flatMap(f => f(x, z))) {
            const dy = y - rail;
            if (dy <= ENVELOPE_FLOOR_M) continue;
            const c = clearance.get(key) ?? { x: Math.round(x), z: Math.round(z), low: Infinity, high: -Infinity };
            c.low = Math.min(c.low, dy); c.high = Math.max(c.high, dy);
            clearance.set(key, c);
            if (dy >= ENVELOPE_TOP_M) continue;
            const e = sites.get(key) ?? { x: Math.round(x), z: Math.round(z), low: Infinity, high: -Infinity };
            e.low = Math.min(e.low, dy); e.high = Math.max(e.high, dy);
            sites.set(key, e);
          }
        }
      }
    }
  }
  // Ground paths painted across a drawn track: real level crossings need a tag check by hand.
  const atGrade: [number, number][] = [];
  if (tread) {
    const treadAt = heights(tread);
    for (const path of city.roads) {
      if (path.bridge || path.tunnel || !WALKS.has(path.cls)) continue;
      for (const rail of city.terrainTransport!.rail) {
        if (rail.kind !== 'ground' || rail.cls === 'tram') continue;
        for (let i = 1; i < path.pts.length; i++) for (let j = 1; j < rail.pts.length; j++) {
          const x = cross(path.pts[i - 1], path.pts[i], rail.pts[j - 1] as P2, rail.pts[j] as P2);
          if (x && treadAt(x[0], x[1]).length) atGrade.push([Math.round(x[0]), Math.round(x[1])]);
        }
      }
    }
  }
  transport.dispose(); surface.geometry.dispose();
  return { sites: [...sites.values()], clearance: [...clearance.values()], atGrade };
}

/** Sites per board on this branch (2026-11-24). Lower these as fixes land; never raise them. */
// Downtown, before the deck levels (main at c01ca94d): 47 cells in the envelope, 166 under 7 m.
// Left: the Mitchell St service ramp mapped along freight rail 10 (-272,-345 to -265,-327) and
// the short Gulch service deck over the Circle Connection (-234,-162 to -227,-158).
const KNOWN: Record<string, { inEnvelope: number; underClearance: number; atGrade: number }> = {
  downtown: { inEnvelope: 8, underClearance: 45, atGrade: AT_GRADE_DOWNTOWN },
  'north-band': { inEnvelope: 0, underClearance: 0, atGrade: 0 },
  'south-band': { inEnvelope: 0, underClearance: 0, atGrade: 0 },
};

for (const name of ['downtown', 'north-band', 'south-band'] as const)
  it.skipIf(name === 'downtown' && !existsSync(vignette))(`keeps drawn structures out of the rail running envelope on ${name}`, () => {
    const { city, grid } = board(name);
    if (!city.terrainTransport) return;
    const { sites, clearance, atGrade } = railEnvelope(city, grid);
    const low = clearance.filter(c => c.low < DECK_CLEARANCE_M);
    console.info(`rail envelope ${name}: ${sites.length} cells in the envelope, ${low.length} cells under ${DECK_CLEARANCE_M} m`,
      JSON.stringify(sites.sort((a, b) => a.x - b.x || a.z - b.z).map(s => [s.x, s.z, +s.low.toFixed(2), +s.high.toFixed(2)])));
    expect(sites.length).toBeLessThanOrEqual(KNOWN[name].inEnvelope);
    expect(low.length).toBeLessThanOrEqual(KNOWN[name].underClearance);
    console.info(`paths at grade across a track on ${name}: ${atGrade.length}`, JSON.stringify(atGrade));
    expect(atGrade.length).toBeLessThanOrEqual(KNOWN[name].atGrade);
  }, 300_000);
