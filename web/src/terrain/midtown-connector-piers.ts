import * as THREE from 'three';
import { Builder, Line } from '../vignette/geom';
import { PAL } from '../vignette/world';
import { matchRibbon, type Ribbon } from './connector-corridor';
import { inConnectorLanes } from './connector-paint';
import { pierObstacles } from './pier-clearance';
import { roadWidth, type TerrainCity, type TransportRun } from './transport-data';

type Ground = (x: number, z: number) => number | null;
type DeckAt = (x: number, z: number, run: TransportRun) => number | null;
const STRUCTURE_M = 1.4; // pavement to the underside of girders and pier cap
const walkways = new Set(['footway', 'cycleway', 'path', 'pedestrian', 'steps']);

/** Pier stations along one deck: spans of 20–45 m kept at least 10 m from either end,
 * the farthest clear station first; with no clear footprint within 45 m the span carries
 * on to the nearest clear gore. Every column of a bent must stand clear. */
export function deckPierStations(line: Line, bentClear: (s: number) => boolean) {
  const stations: number[] = [];
  let last = 0;
  while (line.length - last > 45) {
    let pick = -1;
    for (let s = last + 20; s <= Math.min(last + 45, line.length - 10); s += 2) if (bentClear(s)) pick = s;
    if (pick < 0) for (let s = last + 46; s <= line.length - 10; s += 2) if (bentClear(s)) { pick = s; break; }
    if (pick < 0) break;
    stations.push(pick);
    last = pick;
  }
  return stations;
}

/** Concrete bents under the measured Midtown street and freeway decks. Columns avoid every
 * rendered lane beneath (the deck's own ribbons excepted), every drawn ground road plus 1 m
 * and every railway, using the same footprint test as the North Line spans. */
export function midtownConnectorPiers(city: TerrainCity, groundAt: Ground, deckAt: DeckAt) {
  const data = city.terrainTransport;
  if (!data) return;
  // The freeway is tested lane by lane against its rendered ribbons; a ribbon-covered
  // motorway centreline at a generic 14 m width would bury the medians where piers belong.
  // Motorway ways with no ribbon keep their drawn width.
  const ribboned = (r: { cls: string; sub?: string | null; pts: [number, number][] }) =>
    r.cls === 'motorway' && r.pts.length > 1 && !!matchRibbon(r.pts[0], r.pts[1], r.sub === 'link');
  // Sidewalk and cycle bridges never block a bent; other bridges may pass beneath one.
  const ground = city.roads.filter(r => !r.tunnel && !ribboned(r) && !(r.bridge && walkways.has(r.cls)));
  // One index of obstacles serves every deck; each deck ignores its own ribbons and street.
  let own = new Set<Ribbon>();
  const clearOf = pierObstacles(ground, (x, z) => inConnectorLanes(x, z, 1, own), data.rail);
  const builder = new Builder();
  let columns = 0;
  const bents: { name: string | null; x: number; z: number; columns: number }[] = [];
  for (const run of data.roads) {
    if (run.kind !== 'bridge' || !run.sourceAxis || !run.deckNavd88M || run.deckWeight || walkways.has(run.cls)) continue;
    const line = new Line(run.pts);
    if (line.length < 30) continue;
    own = new Set<Ribbon>();
    if (run.cls === 'motorway') for (let i = 1; i < run.pts.length; i++) {
      const r = matchRibbon(run.pts[i - 1], run.pts[i], run.sub === 'link');
      if (r) own.add(r);
    }
    // Other bridges stay obstacles (a street deck may pass under a flyover); the deck's own
    // street, which rides on the same bents, does not.
    const self = (r: (typeof ground)[number]) => !!r.bridge && (r.name === run.name || r.pts === run.sourceAxis);
    const clear = (x: number, z: number, dx: number, dz: number) => clearOf(x, z, dx, dz, 1.2, 1.1, self);
    // The width transport.ts draws: ribbon lanes plus shoulders, the inventory, or the class.
    const lanes = Math.max(0, ...[...own].map(r => r.lanes));
    const width = run.crossSection?.width ?? (lanes ? lanes * 3.55 + (run.sub === 'link' ? 1.4 : 3.6) : roadWidth(run));
    // An odd count keeps one column on the axis.
    const count = 2 * Math.round(width / 18) + 1;
    const offsets = Array.from({ length: count }, (_, i) => count === 1 ? 0 : (i / (count - 1) - .5) * (width - 3));
    const bent = (s: number) => {
      const p = line.at(s);
      const deck = deckAt(p.x, p.z, run);
      if (deck === null) return null;
      // A hammerhead bent: the axial column must be clear; outer columns join where clear
      // and the cap spans the rest. A wide cap never hangs off a single edge column.
      const feet: { x: number; z: number; y: number }[] = [];
      for (const o of offsets) {
        const x = p.x - p.dz * o, z = p.z + p.dx * o, y = groundAt(x, z);
        const ok = y !== null && clear(x, z, p.dx, p.dz) && deck - STRUCTURE_M - y > 2.5;
        if (!ok && o === 0) return null;
        if (ok) feet.push({ x, z, y: y! });
      }
      return { p, deck, feet };
    };
    for (const s of deckPierStations(line, s => !!bent(s))) {
      const { p, deck, feet } = bent(s)!;
      const top = deck - STRUCTURE_M;
      const frame = (x: number, z: number) => new THREE.Matrix4().makeRotationY(Math.atan2(p.dx, p.dz)).setPosition(x, 0, z);
      for (const f of feet) {
        // Across the deck 1.2 m, along it 2.2 m, sunk 0.3 m into the ground.
        const h = top - f.y + .3;
        builder.box(1.2, h, 2.2, 0, f.y - .3 + h / 2, 0, PAL.concreteDark, frame(f.x, f.z));
        columns++;
      }
      bents.push({ name: run.name ?? null, x: p.x, z: p.z, columns: feet.length });
      // Pier cap across the bent, under the girders.
      builder.box(width - 1, .9, 2.6, 0, top - .45, 0, PAL.concrete, frame(p.x, p.z));
    }
  }
  if (!columns) return;
  const mesh = new THREE.Mesh(builder.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.name = 'Midtown deck piers';
  mesh.castShadow = mesh.receiveShadow = true;
  return { mesh, columns, bents };
}
