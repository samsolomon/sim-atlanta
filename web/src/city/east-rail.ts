/**
 * MARTA east of the downtown board, to King Memorial. City attaches it once the King Memorial area
 * mounts (`?east=king-memorial`); until then nothing here is fetched or built. Sources and status
 * of every height are in docs/king-memorial-corridor.md.
 *
 * Heights:
 * - Measured: the guideway east of the Floyd face. It comes from scene.json's `connector-viaduct`
 *   anchors, which are lidar beds and already run to s 9372 on 155177.
 * - Estimated: the deck under the King Memorial canopy, which the lidar did not see. It is a
 *   separate `roofed` station span, marked schematic, that interpolates between the anchors on
 *   either side.
 * - Measured: the canopy roof (lidar).
 * - Inferred: platforms at car-floor level on the estimated bed.
 * - Illustrative: station columns, stair towers and piers.
 */
import * as THREE from 'three';
import type { RailSpan, SceneManifest } from '../core/scene-data';
import { makeProjector, railBedY } from '../core/scene-data';
import type { RoutesFile } from '../model/types';
import type { GroundGrid } from '../terrain/grid';
import { CAR_FLOOR, CAR_WIDTH } from '../vignette/cq400';
import { Builder } from '../vignette/geom';
import { MARTA_TRACK_OFFSET } from '../vignette/world';

type XZ = [number, number];
export interface CorridorPack {
  guideway: { s: number; x: number; z: number; top: number | null; roof: number | null; status: string }[];
  crossings: { s: number; x: number; z: number; kind: string }[];
}

/** Canopy ends: where the measured guideway disappears under the King Memorial roof, on 155177. */
export const CANOPY_ENDS: [XZ, XZ] = [[1388.33, 470.68], [1571.21, 402.34]];
/** Lateral extents, metres right of eastbound travel from the GTFS line (lidar, 155177). */
export const DECK = [-2.6, 6.9] as const;
export const ROOF = [-8.8, 13.0] as const;
/** Platform boarding lips fitted to City's drawn tracks (±MARTA_TRACK_OFFSET), with the
 * level-boarding gap used in the Model Lab. The real track axis is about 1.7 m right of the GTFS
 * line; City draws on the line, as at Georgia State. */
const LIP = MARTA_TRACK_OFFSET + CAR_WIDTH / 2 + 0.075;
/** Platform length along the line (OSM ways 319512574 and 319512585: s 8951–9129 on 155177). */
const PLATFORM_S: [number, number] = [8951, 9129];
const EAST_IDS = ['155177', '155181', '155185', '155188', '155214', '155215', '155216', '155221', '155222', '155223'];

/** Nearest s on a path to a scene point. */
function sOnPath(path: RoutesFile['paths'][number], project: (lon: number, lat: number) => XZ, [x, z]: XZ) {
  let best = { d: Infinity, s: 0 };
  for (let i = 0; i + 1 < path.cum.length; i++) {
    const [ax, az] = project(path.coords[2 * i], path.coords[2 * i + 1]);
    const [bx, bz] = project(path.coords[2 * i + 2], path.coords[2 * i + 3]);
    const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
    if (!l2) continue;
    const t = Math.min(1, Math.max(0, ((x - ax) * dx + (z - az) * dz) / l2));
    const d = Math.hypot(ax + t * dx - x, az + t * dz - z);
    if (d < best.d) best = { d, s: path.cum[i] + t * (path.cum[i + 1] - path.cum[i]) };
  }
  return best;
}

/**
 * A copy of the manifest whose East Line paths carry rail spans through the east area: the measured
 * viaduct up to the canopy, an estimated roofed station span under it, then the measured viaduct
 * again to the path's end. Downtown spans are untouched.
 */
export function extendRail(manifest: SceneManifest, rf: RoutesFile): SceneManifest {
  const rail = structuredClone(manifest.rail!);
  const project = makeProjector(manifest.origin);
  rail.evidence['king-memorial-canopy'] = {
    name: 'King Memorial station under its canopy roof',
    checked: '2026-11-22',
    sources: ['osm:way/319512574', 'osm:way/319512585', 'usgs-3dep-ept:GA_Statewide_B2_2018'],
    precisionM: 5,
    note: 'Roof measured by lidar; the deck under it was not seen. The bed is an estimate interpolated between the measured anchors either side.',
  };
  for (const id of EAST_IDS) {
    const pid = `marta:path:${id}`;
    const spans = rail.paths[pid];
    const path = rf.paths.find(p => p.id === pid);
    const i = spans?.findIndex(sp => sp.ev === 'connector-viaduct') ?? -1;
    if (!spans || !path || i < 0) continue;
    const via = spans[i];
    const [a, b] = CANOPY_ENDS.map(p => sOnPath(path, project, p));
    if (a.d > 8 || b.d > 8) continue; // a shape that doesn't pass the station
    const east = sOnPath(path, project, [1800, 340]).s > via.s0; // travelling toward King Memorial
    const [c0, c1] = [Math.min(a.s, b.s), Math.max(a.s, b.s)];
    const end = east ? path.cum[path.cum.length - 1] : 0;
    const station: RailSpan = { ...via, s0: c0, s1: c1, cover: 'roofed', form: 'station', height: 'schematic', ev: 'king-memorial-canopy' };
    const toward: RailSpan = east ? { ...via, s1: c0 } : { ...via, s0: c1 };
    const beyond: RailSpan = east ? { ...via, s0: c1, s1: end } : { ...via, s0: end, s1: c0 };
    const parts = east ? [toward, station, beyond] : [beyond, station, toward];
    spans.splice(i, 1, ...parts.filter(sp => sp.s1 - sp.s0 >= 1));
  }
  return { ...manifest, rail };
}

/** Ground over downtown and the east area, for terrainAlignment (only `sample` and the vertical zero are used). */
export function joinedGround(downtown: GroundGrid, eastGround: (x: number, z: number) => number | null): GroundGrid {
  const zero = downtown.manifest.vertical.sceneZeroNavd88M;
  return {
    manifest: downtown.manifest,
    sample: (x: number, z: number) => downtown.sample(x, z) ?? ((h) => (h == null ? null : h + zero))(eastGround(x, z)),
  } as unknown as GroundGrid;
}

/**
 * The station and the guideway east of x 1000, in scene metres along the reference eastbound
 * path. `ground` returns scene y.
 */
export function buildEastRail(manifest: SceneManifest, rf: RoutesFile, pack: CorridorPack,
  ground: (x: number, z: number) => number | null, zero: number, seamX = 1000) {
  const pid = 'marta:path:155177';
  const path = rf.paths.find(p => p.id === pid)!;
  const via = manifest.rail!.paths[pid].find(sp => sp.ev === 'connector-viaduct')!;
  const project = makeProjector(manifest.origin);
  const pts = Array.from({ length: path.cum.length }, (_, i) => project(path.coords[2 * i], path.coords[2 * i + 1]));
  const at = (s: number) => {
    let i = 0;
    while (i + 2 < path.cum.length && path.cum[i + 1] < s) i++;
    const t = (s - path.cum[i]) / Math.max(1e-9, path.cum[i + 1] - path.cum[i]);
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const len = Math.hypot(bx - ax, bz - az) || 1;
    return { x: ax + t * (bx - ax), z: az + t * (bz - az), tx: (bx - ax) / len, tz: (bz - az) / len };
  };
  // Bed (scene y) on the measured anchors; under the canopy this is the estimate.
  const bed = (s: number) => railBedY({ ...via, s0: -Infinity, s1: Infinity }, s, 0, (x, z) => ground(x, z) ?? 0, zero);
  const roofAt = (s: number) => {
    const r = pack.guideway.reduce((a, b) => (Math.abs(b.s - s) < Math.abs(a.s - s) ? b : a));
    return r.roof == null ? null : r.roof - zero;
  };
  const sSeam = sOnPath(path, project, [seamX, at(8542).z]).s;
  const sEnd = sOnPath(path, project, [1795, 350]).s;
  const b = new Builder();
  const concrete = '#b9b4aa', deckSide = '#9c978d', track = '#5b544e', roofCol = '#cfd3d6', platformCol = '#c9c3b6', edge = '#e2bd3c';
  // A local frame point: s along, v right of travel, y up.
  const P = (s: number, v: number, y: number) => {
    const p = at(s);
    return [p.x - p.tz * v, y, p.z + p.tx * v];
  };
  const strip = (s0: number, s1: number, v0: number, v1: number, y: (s: number) => number, color: string, step = 4) => {
    for (let s = s0; s < s1; s += step) {
      const e = Math.min(s + step, s1);
      b.quad(P(s, v0, y(s)), P(s, v1, y(s)), P(e, v1, y(e)), P(e, v0, y(e)), color);
    }
  };
  const wall = (s0: number, s1: number, v: number, y0: (s: number) => number, y1: (s: number) => number, color: string, step = 4) => {
    for (let s = s0; s < s1; s += step) {
      const e = Math.min(s + step, s1);
      b.quad(P(s, v, y0(s)), P(e, v, y0(e)), P(e, v, y1(e)), P(s, v, y1(s)), color);
    }
  };
  // Deck centred on City's drawn tracks (the real deck is 9.6 m wide; see DECK), 1.2 m deep (illustrative).
  const half = (DECK[1] - DECK[0]) / 2;
  const top = (s: number) => bed(s) + 0.25;
  strip(sSeam, sEnd, -half, half, top, concrete);
  for (const v of [-half, half]) wall(sSeam, sEnd, v, s => top(s) - 1.2, top, deckSide);
  for (const side of [-1, 1]) for (const r of [-0.72, 0.72]) {
    const v = side * MARTA_TRACK_OFFSET + r;
    strip(sSeam, sEnd, v - 0.05, v + 0.05, s => bed(s) + 0.56, track, 2);
  }
  // Piers every 26 m (illustrative), clear of the mapped crossings and under the station's own columns.
  const avoid = pack.crossings.map(c => c.s);
  for (let s = Math.ceil(sSeam / 26) * 26; s < sEnd; s += 26) {
    if (avoid.some(c => Math.abs(c - s) < 6) || (s > PLATFORM_S[0] - 5 && s < PLATFORM_S[1] + 5)) continue;
    const p = at(s), g = ground(p.x, p.z);
    if (g == null) continue;
    const h = top(s) - 1.2 - g;
    if (h < 1) continue;
    const pier = new THREE.BoxGeometry(1.6, h + 0.5, 1.6);
    pier.translate(p.x, g - 0.5 + (h + 0.5) / 2, p.z);
    b.addGeometry(pier, deckSide);
  }
  // Station: side platforms at car-floor level on the estimated bed, under the measured roof.
  const floor = (s: number) => bed(s) + 0.55 + CAR_FLOOR;
  // North platform (left of eastbound, beside the westbound track) and south platform: from the
  // boarding lip out to just inside the measured roof edge.
  for (const [lip, outer] of [[-LIP, ROOF[0] + 0.3], [LIP, ROOF[1] - 0.3]] as const) {
    const [a, c] = lip < outer ? [lip, outer] : [outer, lip];
    strip(PLATFORM_S[0], PLATFORM_S[1], a, c, floor, platformCol, 3);
    for (const v of [a, c]) wall(PLATFORM_S[0], PLATFORM_S[1], v, s => floor(s) - 0.8, floor, deckSide, 3);
    const inward = Math.sign(outer - lip);
    strip(PLATFORM_S[0], PLATFORM_S[1], Math.min(lip, lip + inward * 0.6), Math.max(lip, lip + inward * 0.6), s => floor(s) + 0.012, edge, 3);
  }
  // Canopy roof slab at the measured roof heights; the raised centre section where it was measured.
  const roofS: [number, number] = [8945, 9135];
  const roofY = (s: number) => roofAt(s) ?? roofAt(9000)!;
  strip(roofS[0], roofS[1], ROOF[0], ROOF[1], roofY, roofCol, 5);
  for (const v of ROOF) wall(roofS[0], roofS[1], v, s => roofY(s) - 0.9, roofY, roofCol, 5);
  // Columns carry the station deck, and slimmer posts carry the roof above the platforms
  // (illustrative: the photos show round columns under the station; spacing is not surveyed).
  for (let s = roofS[0] + 6; s < roofS[1]; s += 18) {
    for (const v of [ROOF[0] + 1.2, ROOF[1] - 1.2]) {
      const [x, , z] = P(s, v, 0), g = ground(x, z);
      if (g == null) continue;
      const under = floor(s) - 0.8;
      const col = new THREE.CylinderGeometry(0.7, 0.7, under - g, 10);
      col.translate(x, g + (under - g) / 2, z);
      b.addGeometry(col, concrete);
      const post = new THREE.CylinderGeometry(0.2, 0.2, roofY(s) - 0.9 - floor(s), 6);
      post.translate(x, (floor(s) + roofY(s) - 0.9) / 2, z);
      b.addGeometry(post, deckSide);
    }
  }
  // Stair towers at the two OSM subway entrances (11877267661, 11877267665) toward Decatur St
  // (illustrative massing: the photos show open concrete stair towers on the north side).
  for (const [x, z] of [[1468, 434], [1428, 457]] as XZ[]) {
    const g = ground(x, z);
    if (g == null) continue;
    const s = sOnPath(path, project, [x, z]).s;
    const h = floor(s) - g + 1.1;
    const tower = new THREE.BoxGeometry(6, h, 9);
    const p = at(s);
    tower.rotateY(-Math.atan2(p.tz, p.tx));
    tower.translate(x, g + h / 2, z);
    b.addGeometry(tower, concrete);
  }
  const geometry = b.geometry();
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'MARTA east: guideway and King Memorial station';
  mesh.castShadow = mesh.receiveShadow = true;
  return {
    mesh, bed, floor, sSeam, sEnd, stationS: PLATFORM_S, roofS,
    dispose() { mesh.removeFromParent(); geometry.dispose(); material.dispose(); },
  };
}
