import { readdirSync, readFileSync, existsSync } from 'node:fs';
import type { Object3D } from 'three';
import { afterEach, expect, it, vi } from 'vitest';
import { GroundGrid } from '../terrain/grid';
import { createDowntownTerrain } from '../terrain/model';
import { footprintReport, type FootprintLimits } from './skin-kit';

// The skin footprint audit. Every landmark the terrain builder mounts on a committed board
// (pipeline/prototypes/square-board: the Midtown rows, Brookwood and the square-board bands,
// including the skyline registry) must keep every vertex, shell and lamps alike, inside the
// footprints it replaced expanded by its declared maxProjection (2.5 m by default), and above
// the lowest grade less 8 m. A skin declares a larger projection, with the photo evidence,
// as `group.userData.footprint: FootprintLimits` where its photos show one (canopies, marquees).
// Downtown's city.ts landmarks are not covered: their building data is staged, not committed.
const source = new URL('../../../pipeline/prototypes/square-board/', import.meta.url);
const boards = readdirSync(source).filter(id => existsSync(new URL(id + '/context.json', source)));
afterEach(() => vi.unstubAllGlobals());

interface Failure { id: string; board: string; worst: number; outside: number; at: [number, number, number]; vertical: number }

/** Builds one board and audits every landmark on it. */
function auditBoard(id: string, quality: 'high' | 'low') {
  const read = (n: string) => readFileSync(new URL(id + '/' + n, source));
  const grid = new GroundGrid(JSON.parse(read('ground.json').toString()), Uint8Array.from(read('ground.i16')).buffer);
  const context = JSON.parse(read('context.json').toString());
  const area = createDowntownTerrain(grid, { ...context, rail: context.rail ?? [], roads: context.roads ?? [] }, [], { quality, batchLandmarks: false });
  const byId = new Map<string, { rings: [number, number][][] }>((context.buildings as { id: string; rings: [number, number][][] }[]).map(b => [b.id, b]));
  const results: (Failure & { checked: boolean })[] = [];
  const root: Object3D = area.scenery;
  root.traverse(o => {
    const replaced = o.userData.replaced as string[] | undefined;
    if (!replaced) return;
    const rings = replaced.flatMap(r => byId.get(r)?.rings.slice(0, 1) ?? []);
    const name = (replaced[0] ?? o.name) + (replaced.length > 1 ? ` (+${replaced.length - 1})` : '') + ' ' + JSON.stringify(o.name);
    if (!rings.length) { results.push({ id: name, board: id, worst: 0, outside: 0, at: [0, 0, 0], vertical: 0, checked: false }); return; }
    const grades = rings.flat().map(([x, z]) => grid.sample(x, z) ?? 0);
    const limits: FootprintLimits = { bottom: Math.min(...grades) - grid.manifest.vertical.sceneZeroNavd88M - 8, ...(o.userData.footprint as FootprintLimits | undefined) };
    const r = footprintReport(o, rings, limits);
    results.push({ id: name, board: id, worst: +r.worst.toFixed(2), outside: +r.outside.toFixed(2), at: r.at.map(v => +v.toFixed(1)) as [number, number, number], vertical: +r.vertical.toFixed(2), checked: true });
  });
  return results;
}

/**
 * Known failures on main when the audit landed (2026-11-24), at their worst offset past the
 * allowance in metres, across both tiers. Listed, not fixed here: each owner fixes theirs (or
 * declares a larger, photo-backed `userData.footprint.maxProjection`) and deletes the line. The
 * audit fails on any landmark not listed, and on a listed one that gets worse by more than 0.1 m.
 */
const KNOWN: Record<string, number> = {
  'osm:way:269747513': 471.17, // clara-meer, midtown-upper
  'osm:way:234939895': 191.88, // North Avenue station, midtown-south
  'osm:way:235006952': 96.49, // Midtown station east entrance, midtown-central
  'osm:way:245699027': 56.47, // Bobby Dodd Stadium, midtown-south
  'osm:way:28961738': 45.64, // High Museum of Art, midtown-upper
  'osm:way:42725820': 32.34, // Academy of Medicine, midtown-central
  'osm:way:269637886': 24.33, // Arts Center station, midtown-upper
  'osm:way:38977297': 19.7, // The Varsity, midtown-south
  'osm:way:714119667': 19.62, // Coda, midtown-south
  'osm:way:28979077': 15.09, // Federal Reserve Bank of Atlanta, midtown-central
  'osm:way:269637579': 6.47, // Rhodes Hall, brookwood-south
  'osm:way:886044296': 5.08, // Winship at Emory Midtown, midtown-south
  'osm:way:265351173': 4.66, // SCAD Atlanta, brookwood-south
  'osm:way:269843688': 4.12, // Electric Saturation, midtown-central
  'osm:way:269843469': 3.57, // Four Seasons Hotel, midtown-upper
  'osm:way:28961767': 3.28, // Woodruff Arts Center, midtown-upper
  'osm:way:234933267': 2.67, // Park Central, midtown-upper
  'osm:way:269542143': 2.55, // Emmi Midtown, brookwood-south
  'osm:way:208355446': 2.5, // Fox Theatre, midtown-south
  'osm:way:885667868': 2.29, // Amli Arts Center, midtown-upper
  'osm:way:505414294': 2.15, // Atlantic House, midtown-upper
  'osm:way:269542078': 2.1, // The Atlantic, brookwood-south
  'osm:way:886034013': 1.88, // Atlanta Biltmore, midtown-central
  'osm:way:536884432': 1.77, // Square on 5th, midtown-central
  'osm:way:789980819': 1.28, // Nine15 Midtown, midtown-central
  'osm:way:536670474': 0.74, // ViewPoint, midtown-central
  'osm:way:885325356': 0.49, // Wimbish House, midtown-upper
  'osm:way:269843407': 0.32, // The Campanile, midtown-upper
  'osm:way:42706709': 0.12, // Tech Tower, midtown-south
  'osm:way:234935283': 0.11, // Loews Atlanta Hotel, midtown-central
  'osm:way:1001565075': 0.11, // 1105 West Peachtree, midtown-upper
};

it('keeps every Midtown and square-board landmark inside its footprint plus its declared projection', () => {
  const ctx = new Proxy({}, { get: () => () => {} });
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) });
  const worst = new Map<string, Failure>();
  let checked = 0;
  for (const quality of ['high', 'low'] as const)
    for (const r of boards.flatMap(b => auditBoard(b, quality))) {
      if (!r.checked) continue;
      checked++;
      const key = r.id.split(' ')[0];
      if (!worst.has(key) || r.worst + r.vertical > worst.get(key)!.worst + worst.get(key)!.vertical) worst.set(key, r);
    }
  expect(checked).toBeGreaterThan(150); // both tiers of every board's landmarks
  const failing = [...worst.entries()].filter(([, r]) => r.worst > 0 || r.vertical > 0);
  if (process.env.FOOTPRINT_REPORT) console.log('FOOTPRINT', JSON.stringify(failing.map(([, r]) => r)));
  const unexpected = failing
    .filter(([id, r]) => !(id in KNOWN) || r.worst + r.vertical > KNOWN[id] + 0.1)
    .map(([, r]) => `${r.id} on ${r.board}: ${r.worst} m past the allowance (${r.outside} m outside the outline) at ${r.at.join(', ')}` + (r.vertical ? `, ${r.vertical} m past top/bottom` : ''));
  expect(unexpected).toEqual([]);
}, 600_000);
