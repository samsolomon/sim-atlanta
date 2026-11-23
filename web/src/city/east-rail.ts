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
/** King Memorial's street-level station building under the platforms, OSM way 270494115 (v7,
 * building=train_station, layer 1). MARTA's station profile: "The only station entrance can be
 * accessed from Decatur Street"; its photo and the 2012 Commons photo show this enclosure under
 * the elevated platforms. Footprint sourced; wall height (ground to the platform underside) inferred. */
export const STATION_BUILDING: readonly [number, number][] = [[-84.3746072, 33.7502219], [-84.374583, 33.7501668], [-84.3749974, 33.7500398], [-84.3749904, 33.7500238], [-84.3759165, 33.74974], [-84.3759214, 33.7497511], [-84.3764924, 33.7495761], [-84.3765155, 33.7496284], [-84.3765321, 33.7496662], [-84.3765508, 33.7497089], [-84.3765708, 33.7497547], [-84.3760022, 33.749929], [-84.3760227, 33.7499758], [-84.3758021, 33.7500434], [-84.3758446, 33.7501402], [-84.3760799, 33.7501021], [-84.3760909, 33.7501628], [-84.3759133, 33.7501899], [-84.3756318, 33.7502331], [-84.3756199, 33.7501779], [-84.3757425, 33.750156], [-84.3756945, 33.7500591], [-84.3750886, 33.7502448], [-84.3750778, 33.7502201], [-84.3747742, 33.7503131], [-84.3746623, 33.7503474]];
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
  const canopyLamps: { x: number; z: number; y: number; g: number }[] = [];
  const exterior: { stair?: { x: number; z: number; flights: number; rise: number }; canopy?: { x: number; z: number; underside: number; length: number; width: number } } = {};
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
  const platforms: { lip: number; outer: number; s: [number, number] }[] = [];
  for (const [lip, outer] of [[-LIP, ROOF[0] + 0.3], [LIP, ROOF[1] - 0.3]] as const) {
    platforms.push({ lip, outer, s: PLATFORM_S });
    const [a, c] = lip < outer ? [lip, outer] : [outer, lip];
    strip(PLATFORM_S[0], PLATFORM_S[1], a, c, floor, platformCol, 3);
    for (const v of [a, c]) wall(PLATFORM_S[0], PLATFORM_S[1], v, s => floor(s) - 0.8, floor, deckSide, 3);
    const inward = Math.sign(outer - lip);
    strip(PLATFORM_S[0], PLATFORM_S[1], Math.min(lip, lip + inward * 0.6), Math.max(lip, lip + inward * 0.6), s => floor(s) + 0.012, edge, 3);
  }
  // Canopy roof slab at the measured roof heights; the raised centre section where it was measured.
  const roofS: [number, number] = [8945, 9135];
  const roofY = (s: number) => roofAt(s) ?? roofAt(9000)!;
  const roofDrawn: { s: number; y: number }[] = [];
  for (let s = roofS[0]; s < roofS[1]; s += 5) roofDrawn.push({ s, y: roofY(s) });
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
  // Station exterior from Street View (Decatur St, Dec 2025) and Sam's reference photos.
  // Positions about ±8 m; dimensions estimated (illustrative).
  // 1. The open zigzag stair at the west end by Grant St, north of the deck: switchback flights
  //    with rounded landings on round columns, rising to the platform.
  {
    const sC = PLATFORM_S[0] + 12, vC = ROOF[0] - 3.0; // against the deck, north of the north platform
    const p = at(sC);
    const along = new THREE.Vector3(p.tx, 0, p.tz), up = new THREE.Vector3(0, 1, 0), right = new THREE.Vector3(-p.tz, 0, p.tx);
    const [ox, , oz] = P(sC, vC, 0);
    const g = ground(ox, oz);
    if (g != null) {
      const L = 7.2, lane = 1.3, half = 2.6, thick = 0.6, top = floor(sC);
      const n = Math.max(2, Math.round((top - g) / 4.3)), h = (top - g) / n;
      const lp = (x: number, y: number, z: number) => [ox + along.x * x + right.x * z, y, oz + along.z * x + right.z * z];
      const slab = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) => {
        // Top, underside and the two long sides of a sloped flight between (x0,y0) and (x1,y1).
        b.quad(lp(x0, y0, z0), lp(x1, y1, z0), lp(x1, y1, z1), lp(x0, y0, z1), concrete);
        b.quad(lp(x0, y0 - thick, z1), lp(x1, y1 - thick, z1), lp(x1, y1 - thick, z0), lp(x0, y0 - thick, z0), deckSide);
        for (const z of [z0, z1]) for (const t of [0, z > 0 ? 0.22 : -0.22]) b.quad(lp(x0, y0 - thick, z + t), lp(x1, y1 - thick, z + t), lp(x1, y1 + 1.1, z + t), lp(x0, y0 + 1.1, z + t), concrete); // solid parapets, 0.22 m thick
      };
      const basis = new THREE.Matrix4().makeBasis(along, up, right);
      const landing = (x: number, y: number, outward: 1 | -1) => {
        const box = new THREE.BoxGeometry(1.2, thick, 2 * half);
        box.translate(x + outward * 0.6, y - thick / 2, 0);
        const round = new THREE.CylinderGeometry(half, half, thick, 14, 1, false, outward > 0 ? 0 : Math.PI, Math.PI);
        round.translate(x + outward * 1.2, y - thick / 2, 0);
        const wall = new THREE.CylinderGeometry(half, half, 1.1, 14, 1, true, outward > 0 ? 0 : Math.PI, Math.PI);
        wall.translate(x + outward * 1.2, y + 0.55, 0);
        for (const geo of [box, round, wall]) { geo.applyMatrix4(basis); geo.translate(ox, 0, oz); b.addGeometry(geo, concrete); }
      };
      for (let k = 0; k < n; k++) {
        const y0 = g + k * h, y1 = y0 + h, east = k % 2 === 0;
        const z = east ? -lane : lane;
        slab(east ? -L / 2 : L / 2, east ? L / 2 : -L / 2, y0, y1, z - lane, z + lane);
        landing(east ? L / 2 : -L / 2, y1, east ? 1 : -1);
      }
      // Round columns under the landings, and a short bridge from the top landing to the platform.
      for (const x of [-L / 2 - 1.6, L / 2 + 1.6]) for (const z of [-1.8, 1.8]) {
        const col = new THREE.CylinderGeometry(0.6, 0.6, top - g, 12);
        const [cx, , cz] = lp(x, 0, z);
        col.translate(cx, g + (top - g) / 2, cz);
        b.addGeometry(col, concrete);
      }
      const xTop = n % 2 ? L / 2 + 1.2 : -L / 2 - 1.2;
      const reach = (ROOF[0] + 0.3) - vC - half + 0.6; // to the north platform's outer edge
      const bridge = new THREE.BoxGeometry(2.6, thick, reach);
      bridge.translate(xTop, top - thick / 2, half + reach / 2 - 0.3);
      bridge.applyMatrix4(basis); bridge.translate(ox, 0, oz);
      b.addGeometry(bridge, concrete);
      exterior.stair = { x: ox, z: oz, flights: n, rise: top - g };
    }
  }
  // 2. The long white entry and bus canopy on round columns along Decatur St (pano IyOLr4MeUbTilypkCjNWJg,
  //    heading 160): between the building's north face and the curb, rounded ends.
  {
    const a: XZ = [1407, 409], c: XZ = [1552, 381]; // Decatur St SE centreline (OSM way 629238160)
    const len = Math.hypot(c[0] - a[0], c[1] - a[1]);
    const dx = (c[0] - a[0]) / len, dz = (c[1] - a[1]) / len;
    const sx = -dz, sz = dx; // toward the station (south of the street)
    // In front of the building's recessed entrance (OSM 270494115: face ~20 m off the centreline for u 59–118,
    // the subway_entrance node 11877267661 inside it), out toward the curb. Extent estimated.
    const u0 = 60, u1 = 118, w0 = 8.5, w1 = 21;
    const pt = (u: number, w: number): XZ => [a[0] + dx * u + sx * w, a[1] + dz * u + sz * w];
    const gC = ground(...pt((u0 + u1) / 2, (w0 + w1) / 2));
    if (gC != null) {
      const under = gC + 4.6, depth = 1.6, white = '#eceae4';
      const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(dx, 0, dz), new THREE.Vector3(0, 1, 0), new THREE.Vector3(sx, 0, sz));
      const [cx, cz] = pt((u0 + u1) / 2, (w0 + w1) / 2), W = w1 - w0;
      const slabG = new THREE.BoxGeometry(u1 - u0 - W, depth, W);
      slabG.translate(0, under + depth / 2, 0);
      const ends = [-1, 1].map(e => { const cyl = new THREE.CylinderGeometry(W / 2, W / 2, depth, 16, 1, false, e > 0 ? 0 : Math.PI, Math.PI);
        cyl.translate(e * (u1 - u0 - W) / 2, under + depth / 2, 0); return cyl; });
      for (const geo of [slabG, ...ends]) { geo.applyMatrix4(basis); geo.translate(cx, 0, cz); b.addGeometry(geo, white); }
      for (let u = u0 + 6; u <= u1 - 6; u += 10.5) {
        const [x, z] = pt(u, w0 + 1.6), gg = ground(x, z) ?? gC;
        const col = new THREE.CylinderGeometry(0.32, 0.32, under - gg, 10);
        col.translate(x, gg + (under - gg) / 2, z);
        b.addGeometry(col, white);
      }
      exterior.canopy = { x: cx, z: cz, underside: under - gC, length: u1 - u0, width: W };
      // Recessed downlights under the canopy (Street View pano IyOLr4MeUbTilypkCjNWJg). Spacing illustrative.
      for (let u = u0 + 5; u <= u1 - 5; u += 6) for (const w of [w0 + 3, w1 - 4]) {
        const [x, z] = pt(u, w);
        canopyLamps.push({ x, z, y: under - 0.02, g: ground(x, z) ?? gC });
      }
    }
  }
  // The station building: walls from the ground up to just under the platform deck, flat roof.
  const ring = STATION_BUILDING.map(([lon, lat]) => project(lon, lat));
  const grades = ring.map(([x, z]) => ground(x, z)).filter((g): g is number => g != null);
  let building: { base: number; top: number; ring: XZ[] } | undefined;
  if (grades.length === ring.length) {
    const base = Math.min(...grades) - 0.5;
    const top = Math.min(...ring.map(([x, z]) => floor(sOnPath(path, project, [x, z]).s))) - 0.8 - 0.3;
    const wallCol = '#c8bda8', band = '#a99d88';
    for (let i = 0; i < ring.length; i++) {
      const [ax, az] = ring[i], [bx, bz] = ring[(i + 1) % ring.length];
      b.quad([ax, base, az], [bx, base, bz], [bx, top - 0.6, bz], [ax, top - 0.6, az], wallCol);
      b.quad([ax, top - 0.6, az], [bx, top - 0.6, bz], [bx, top, bz], [ax, top, az], band);
    }
    const tris = THREE.ShapeUtils.triangulateShape(ring.map(([x, z]) => new THREE.Vector2(x, z)), []);
    for (const [i, j, k] of tris) b.tri([ring[i][0], top, ring[i][1]], [ring[j][0], top, ring[j][1]], [ring[k][0], top, ring[k][1]], '#9e968a');
    building = { base, top, ring };
  }
  // Platform lighting. The 2015 Commons platform photo (Gman197002, CC BY-SA 4.0) shows rows of
  // round pendant downlights under the roof trusses along each platform. Their positions here are
  // illustrative: two rows per platform, every 6 m. Each light is a lamp disc under the roof and a
  // warm pool on the platform, shown only after dark.
  const glow = new Builder();
  const lampY = (s: number) => roofY(s) - 1.6;
  for (const p of platforms) {
    const [a, c] = p.lip < p.outer ? [p.lip, p.outer] : [p.outer, p.lip];
    for (const v of [a + (c - a) * 0.3, a + (c - a) * 0.7]) {
      for (let s = PLATFORM_S[0] + 3; s < PLATFORM_S[1]; s += 6) {
        const disc = new THREE.CircleGeometry(0.32, 8);
        disc.rotateX(Math.PI / 2);
        const [x, , z] = P(s, v, 0);
        disc.translate(x, lampY(s), z);
        glow.addGeometry(disc, '#ffe2a8');
        const pool = new THREE.CircleGeometry(1.7, 12);
        pool.rotateX(-Math.PI / 2);
        pool.translate(x, floor(s) + 0.03, z);
        glow.addGeometry(pool, '#3a2e1c');
      }
    }
  }
  for (const l of canopyLamps) {
    const disc = new THREE.CircleGeometry(0.28, 8);
    disc.rotateX(Math.PI / 2);
    disc.translate(l.x, l.y, l.z);
    glow.addGeometry(disc, '#ffe2a8');
    const pool = new THREE.CircleGeometry(1.6, 12);
    pool.rotateX(-Math.PI / 2);
    pool.translate(l.x, l.g + 0.05, l.z);
    glow.addGeometry(pool, '#3a2e1c');
  }
  const glowGeometry = glow.geometry();
  const glowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    transparent: true, depthWrite: false, forceSinglePass: true });
  const lights = new THREE.Mesh(glowGeometry, glowMaterial);
  lights.name = 'King Memorial platform lights';
  lights.visible = false;
  const geometry = b.geometry();
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.add(lights);
  mesh.name = 'MARTA east: guideway and King Memorial station';
  mesh.castShadow = mesh.receiveShadow = true;
  return {
    mesh, bed, floor, sSeam, sEnd, stationS: PLATFORM_S, roofS, platforms, roofDrawn, building, exterior,
    lampCount: glowGeometry.attributes.position.count,
    setNight(dark: number) {
      const d = Math.min(1, Math.max(0, dark));
      lights.visible = d > 0.01;
      glowMaterial.color.setScalar(d);
    },
    dispose() { mesh.removeFromParent(); geometry.dispose(); material.dispose(); glowGeometry.dispose(); glowMaterial.dispose(); },
  };
}
