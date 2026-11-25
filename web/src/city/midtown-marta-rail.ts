import { roadsideWalls } from '../../../pipeline/prototypes/paired-span-walls/walls';
import { articulate, RailTops } from './north-running-gear';
import { extensions } from './north-profile-study';
import axes from './fixtures/north-axes-study.json';
import * as THREE from 'three';
import { sceneToLonLat } from '../core/places';
import type { RoutesFile, TrainState } from '../model/types';
import { nearestOnPath } from '../sched/engine';
import type { TransportRun } from '../terrain/transport-data';
import { CAR_GAP, CAR_LENGTH, cq400Geometry, cq400Material } from '../vignette/cq400';
import { Builder, Line, type P2 } from '../vignette/geom';
import railRows from './fixtures/midtown-rail.json';
import { northLineDepths, northLineGuideway, northLinePiers, northLineProfile, northLineStructure, undersideFaces } from './midtown-marta-guideway';
import { inConnectorLanes } from '../terrain/connector-paint';

const service = new Set(['marta:route:RED', 'marta:route:GOLD']);
type Origin = { lon: number; lat: number };
type Height = (x: number, z: number) => number | null;

// Both mapped mains reach the north board boundary. Chain from that known edge
// back to the end of the open track. Only the two contiguous North Line chains
// can carry passenger trains, irrespective of neighboring freight geometry.
export function northLineTracks(runs: readonly Pick<TransportRun, 'name' | 'pts'>[], northEdge: number) {
  const parts = runs.filter((r) => r.name === 'MARTA North Line').map((r) => r.pts);
  const tracks: Line[] = [];
  function same(a: P2, b: P2) {
    return a[0] === b[0] && a[1] === b[1];
  }
  for (const end of parts.filter((r) => r[0][1] === northEdge || r.at(-1)![1] === northEdge)) {
    const points = end[0][1] === northEdge ? [...end] : end.slice().reverse();
    const used = new Set([end]);
    for (;;) {
      const tip = points.at(-1)!;
      const next = parts.find((r) => !used.has(r) && (same(r[0], tip) || same(r.at(-1)!, tip)));
      if (!next) break;
      used.add(next);
      points.push(...(same(next[0], tip) ? next.slice(1) : next.slice(0, -1).reverse()));
    }
    tracks.push(new Line(points.reverse()));
  }
  return tracks.sort((a, b) => a.pts[0][0] - b.pts[0][0]);
}

export function northLinePaths(rf: Pick<RoutesFile, 'paths'>, origin: Origin, tracks: Line[]) {
  const paths = new Map<string, Run>();
  if (tracks.length !== 2) return paths;
  for (const path of rf.paths.filter((p) => service.has(p.routeId))) {
    const geom = { coords: Float64Array.from(path.coords), cum: Float64Array.from(path.cum) };
    const project = (p: P2) => nearestOnPath(geom, ...sceneToLonLat(origin, ...p));
    const start = project(tracks[0].pts[0]),
      end = project(tracks[0].pts.at(-1)!);
    if (start.off > 50 || end.off > 50) continue; // e.g. Red's Lindbergh short-turn path
    const dir = Math.sign(end.s - start.s);
    const line = tracks[dir > 0 ? 1 : 0]; // Inferred normal right-hand running.
    const points = line.pts.map((pt, i) => ({ ...project(pt), along: line.cum[i] }));
    if (points.some((p, i) => p.off > 50 || (i > 0 && dir * (p.s - points[i - 1].s) <= 0))) continue;
    if (dir < 0) points.reverse();
    paths.set(path.id, { route: path.routeId, line, dir, points });
  }
  return paths;
}

type Run = { route: string; line: Line; dir: number; points: { s: number; along: number }[] };

export function northCar(run: Run, s: number) {
  const points = run.points,
    first = points[0],
    last = points.at(-1)!;
  // Keep the leading/trailing car until its last end clears the face.
  if (s < first.s - CAR_LENGTH / 2 || s > last.s + CAR_LENGTH / 2) return null;
  let lo = 0,
    hi = points.length - 1;
  while (hi - lo > 1) {
    const m = (hi + lo) >>> 1;
    if (points[m].s <= s) lo = m;
    else hi = m;
  }
  const a = points[lo],
    b = points[hi];
  const along = a.along + ((b.along - a.along) * (s - a.s)) / (b.s - a.s);
  const p = run.line.at(along);
  const over = along - THREE.MathUtils.clamp(along, 0, run.line.length);
  return { x: p.x + over * p.dx, z: p.z + over * p.dz, along, dx: p.dx * run.dir, dz: p.dz * run.dir };
}

// One cut-and-cover box carries both mains (aerial imagery), so a single headwall
// spans the two mouths. Its face stands at the more advanced mapped mouth and both
// tracks clip there; the other track's last few metres sit inside the hood.
export function portalFrame(lines: Line[]) {
  const a = lines[0].at(0),
    b = lines[1].at(0);
  const dx = (a.dx + b.dx) / 2,
    dz = (a.dz + b.dz) / 2,
    n = Math.hypot(dx, dz);
  const fx = dx / n,
    fz = dz / n;
  // Distance of each mouth along the outward (open-track) heading.
  const ahead = (p: { x: number; z: number }) => p.x * fx + p.z * fz;
  const face = Math.max(ahead(a), ahead(b));
  const mx = (a.x + b.x) / 2,
    mz = (a.z + b.z) / 2,
    shift = face - ahead({ x: mx, z: mz });
  const spacing = Math.abs((b.x - a.x) * fz - (b.z - a.z) * fx);
  return { x: mx + fx * shift, z: mz + fz * shift, dx: fx, dz: fz, spacing };
}

/** Cars vanish this far inside the mouth, in the dark of the tube. */
export const NORTH_LINE_VANISH_DEPTH = 5;

/**
 * Twin concrete hoods with a centre wall (the 2026-11-23 form Sam prefers), closed
 * into a tube: the interior walls, centre wall, roof and floor run 24 m back and fade
 * to a black end cap, all double-sided, so no terrain or sky reads through the mouth.
 * The terrain inside the hood is cut away by northLinePortalSlots. Small lamps at the
 * crown and a little way in glow at night (illustrative: no photograph found).
 */
function portal(frame: ReturnType<typeof portalFrame>, base: number) {
  const body = new Builder(),
    lamps = new Builder(),
    concrete = '#a89e8f';
  const half = frame.spacing / 2 + 2.72,
    width = 2 * half + 0.38,
    height = 4.65;
  body.box(width, 0.6, 8, 0, 4.95, -3.95, concrete);
  body.box(0.4, 4.65, 8, 0, 2.32, -3.95, '#aa9e8c');
  for (const sign of [-1, 1]) {
    const side = sign * half;
    body.box(0.38, 5.1, 8, side, 2.45, -3.95, '#aa9e8c');
    body.quad([side - 0.18, 0, 0.05], [side + 0.18, 0, 0.05], [side + 0.18, 1.1, 7.7], [side - 0.18, 1.1, 7.7], concrete);
    body.quad([side, 0, 0.05], [side, 4.55, 0.05], [side, 1.1, 7.7], [side, 0, 7.7], '#998d7e');
  }
  body.box(1.6, 0.44, 0.1, 0, 4.97, 0.1, '#534f49');
  for (let i = 0; i < 4; i++) body.box(1.56, 0.038, 0.14, 0, 4.8 + i * 0.1, 0.15, '#aa9e8c');
  // Interior tube, a little inside the hood walls, fading to near-black.
  const inner = half - 0.2,
    shade = (z: number) =>
      '#' + new THREE.Color('#5d5952').lerp(new THREE.Color('#080807'), Math.pow(Math.min(1, -z / 14), 0.7)).getHexString();
  for (let z = -0.3; z > -24; z -= 1.5) {
    const z1 = Math.max(-24, z - 1.5),
      col = shade((z + z1) / 2);
    for (const x of [-inner, -0.21, 0.21, inner]) body.quad([x, -0.4, z], [x, height, z], [x, height, z1], [x, -0.4, z1], col);
    body.quad([-inner, height, z], [inner, height, z], [inner, height, z1], [-inner, height, z1], col);
    body.quad([-inner, -0.3, z], [-inner, -0.3, z1], [inner, -0.3, z1], [inner, -0.3, z], col);
  }
  body.quad([-inner, -0.4, -24], [inner, -0.4, -24], [inner, height, -24], [-inner, height, -24], '#050505');
  // Solid dark ballast slab across the whole terrain cut (beyond the outer walls and
  // from 2.2 m outside the face) and down each tube, so no
  // ground can show between the rails and the walls where a track's mapped mouth
  // sits behind the shared face.
  for (const [x0, x1] of [[-half - 0.19, half + 0.19]])
    for (let z = 2.2; z > -24; z -= 2) {
      const z1 = Math.max(-24, z - 2);
      body.quad([x0, -0.08, z], [x0, -0.08, z1], [x1, -0.08, z1], [x1, -0.08, z], z > -2 ? '#4e463d' : shade(z1));
    }
  // Outside the walls the cut's floor is grassed to match the terrain, so it reads
  // as ground, not as a dark outline around the hood.
  for (const [x0, x1] of [
    [-half - 0.75, -half - 0.19],
    [half + 0.19, half + 0.75],
  ])
    body.quad([x0, -0.08, 2.2], [x0, -0.08, -12.2], [x1, -0.08, -12.2], [x1, -0.08, 2.2], '#97a183');
  // Beyond the hood the tube runs underground: an outer shell keeps it closed where
  // the slot leaves the terrain open, without showing above the hill.
  for (const x of [-half - 0.19, half + 0.19]) body.quad([x, -0.4, -7.9], [x, 5.25, -7.9], [x, 5.25, -24], [x, -0.4, -24], concrete);
  body.quad([-half - 0.19, 5.25, -7.9], [half + 0.19, 5.25, -7.9], [half + 0.19, 5.25, -24], [-half - 0.19, 5.25, -24], concrete);
  // Crown lamps over each track and a pair a little way in (illustrative).
  for (const x of [-half / 2, half / 2]) {
    lamps.box(0.7, 0.22, 0.25, x, height - 0.22, 0.12, '#ffe9c2');
    lamps.box(0.35, 0.12, 0.5, x, height - 0.12, -6, '#ffd9a0');
  }
  const group = new THREE.Group();
  group.name = 'North Line portal';
  const mesh = new THREE.Mesh(body.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  mesh.castShadow = mesh.receiveShadow = true;
  const glow = new THREE.Mesh(lamps.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#ffdfb0', emissiveIntensity: 0 }));
  group.add(mesh, glow);
  group.position.set(frame.x, base, frame.z);
  group.rotation.y = Math.atan2(frame.dx, frame.dz);
  return { group, glow };
}

/**
 * The 3DEP grid at the mouth blends the hillside over the tunnel into the cut, so
 * terrain rises inside the hood. Cut the full mouth width (both tubes plus 0.5 m beyond
 * the outer wall faces) from 2 m outside the face to 12 m in, down to just under the rail, so the hood's interior reads dark from every angle. Beyond
 * that the hill stands above the tube's roof.
 */
export function northLinePortalSlots(grid: { sample(x: number, z: number): number | null; manifest: { vertical: { sceneZeroNavd88M: number } } }) {
  const lines = northLineTracks(railRows['brookwood-station'] as TransportRun[], -5700);
  if (lines.length !== 2) return [];
  const f = portalFrame(lines);
  const out = grid.sample(f.x + f.dx * 10, f.z + f.dz * 10);
  if (out === null) return [];
  const bed = out - grid.manifest.vertical.sceneZeroNavd88M - 0.4;
  return [
    {
      start: [f.x + f.dx * 2, bed, f.z + f.dz * 2] as const,
      end: [f.x - f.dx * 12, bed, f.z - f.dz * 12] as const,
      halfWidthM: f.spacing / 2 + 2.72 + 0.7,
    },
  ];
}

export function createNorthLine(
  area: {
    group: THREE.Group;
    groundAt: (x: number, z: number) => number | null;
    terrainAt?: (x: number, z: number) => number | null;
    connectorBoard?: { city: { roads: { cls: string; sub?: string | null; pts: [number, number][] }[] } };
  },
  rf: RoutesFile,
  origin: Origin,
  cars: THREE.Group,
) {
  const rows = railRows['brookwood-station'] as TransportRun[];
  const lines = northLineTracks(rows, -5700);
  if (lines.length !== 2) return;
  const stationPaths = northLinePaths(rf, origin, lines);
  let paths = stationPaths;
  const roads = area.connectorBoard?.city.roads ?? [];
  const lanes = (x: number, z: number) => inConnectorLanes(x, z, 1);
  // Piers depend only on where the spans run, so place them first, size each girder
  // to its span, then design the profile to keep the soffit clear over every road.
  const draft = northLineProfile(lines, rows, area.groundAt, roads);
  if (!draft.height.every(Number.isFinite)) return;
  const piers = northLinePiers(draft, roads, lanes, rows, area.groundAt);
  const depths = northLineDepths(draft, piers);
  const profile = northLineProfile(lines, rows, area.groundAt, roads, (i) => depths[i]);
  const guideway = northLineGuideway(lines, profile, area.groundAt);
  area.group.add(guideway);
  const walls = new THREE.Group();
  if (area.terrainAt) {
    const underside = undersideFaces(guideway, 425, 445, -5415, -5390);
    for (const { name, geometry } of roadsideWalls(area.terrainAt, underside)) {
      const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
      mesh.name = name;
      mesh.receiveShadow = mesh.castShadow = true;
      walls.add(mesh);
    }
    area.group.add(walls);
  }
  const spans = northLineStructure(profile, piers, area.groundAt);
  area.group.add(spans.mesh, spans.lamps);
  let height = (line: Line, along: number) => profile.at(line, along);
  let tops: RailTops | undefined;
  function extend(addedRails: THREE.Mesh) {
    const continuation = northLineTracks(axes.map(run => ({ name: run.name, pts: run.pts.map(([x, z]): P2 => [x, z]) })), -6500);
    if (continuation.length !== lines.length) return;
    const joined = lines.map((line, i) => new Line([...line.pts, ...continuation[i].pts.slice(1)]));
    const nextPaths = northLinePaths(rf, origin, joined);
    // A short-turn schedule may serve the original segment only. Its station
    // samples still apply to the common prefix of the extended track.
    for (const [id, run] of stationPaths) {
      if (!nextPaths.has(id)) nextPaths.set(id, { ...run, line: joined[lines.indexOf(run.line)] });
    }
    tops = new RailTops();
    tops.add(guideway, '#a69b8c');
    tops.add(addedRails, '#c0b7a9');
    joined.forEach((line, i) => {
      const clip = planes.get(lines[i])!;
      clip[1].constant = 6500;
      planes.set(line, clip);
    });
    for (const extension of continuation) {
      for (const [x, z] of extension.pts) {
        bounds.minX = Math.min(bounds.minX, x - 60);
        bounds.maxX = Math.max(bounds.maxX, x + 60);
        bounds.minZ = Math.min(bounds.minZ, z);
      }
    }
    paths = nextPaths;
    height = (line, s) => {
      const i = joined.indexOf(line);
      const seam = lines[i].length;
      return s <= seam ? profile.at(lines[i], s) : extensions[i].at(s - seam);
    };
  }
  const darkness = { value: 0 };
  const planes = new Map<Line, THREE.Plane[]>();
  let portalParts!: ReturnType<typeof portal>;
  let prewarm!: THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
  {
    const frame = portalFrame(lines),
      base = Math.min(...lines.map((l) => height(l, 0.05)));
    portalParts = portal(frame, base);
    area.group.add(portalParts.group);
    // Keep cars a few metres into the dark tube before clipping them.
    const clip = [
      new THREE.Plane(new THREE.Vector3(frame.dx, 0, frame.dz), -frame.dx * frame.x - frame.dz * frame.z + NORTH_LINE_VANISH_DEPTH),
      new THREE.Plane(new THREE.Vector3(0, 0, 1), 5700),
    ];
    for (const line of lines) planes.set(line, clip);
    // A hidden template so City's boot prewarm compiles this clip set's CQ400 program before a
    // North Line train first emerges after ready.
    prewarm = new THREE.Mesh(cq400Geometry({ cab: false, u0: 0, u1: 1 }, '#888888'), cq400Material('#888888', { value: 0 }, darkness, clip));
    prewarm.name = 'cq400 prewarm template';
    prewarm.visible = false;
    area.group.add(prewarm);
  }
  const colors = new Map(rf.routes.map((r) => [r.id, r.color]));
  const pools = new Map<
    string,
    { geometry: THREE.BufferGeometry; material: THREE.Material; meshes: THREE.Mesh[]; count: number }
  >();
  const xs = lines.flatMap((l) => l.pts.map((p) => p[0])),
    zs = lines.flatMap((l) => l.pts.map((p) => p[1]));
  const bounds = { minX: Math.min(...xs) - 60, maxX: Math.max(...xs) + 60, minZ: Math.min(...zs), maxZ: Math.max(...zs) + 60 };
  const update = (states: TrainState[], dark: number) => {
    darkness.value = dark;
    (spans.lamps.material as THREE.MeshLambertMaterial).emissiveIntensity = dark * 0.9;
    (portalParts.glow.material as THREE.MeshLambertMaterial).emissiveIntensity = dark * 0.8;
    for (const pool of pools.values()) pool.count = 0;
    let total = 0;
    for (const t of states) {
      const run = paths.get(t.pathId),
        color = colors.get(t.routeId);
      if (!run || !color || run.route !== t.routeId || !planes.has(run.line)) continue;
      const n = Math.max(1, Math.round(t.lengthM.value / CAR_LENGTH));
      if (
        t.s.value < run.points[0].s - (n * (CAR_LENGTH + CAR_GAP)) / 2 ||
        t.s.value > run.points.at(-1)!.s + (n * (CAR_LENGTH + CAR_GAP)) / 2
      )
        continue;
      for (let i = 0; i < n; i++) {
        const place = northCar(run, t.s.value + ((n - 1) / 2 - i) * (CAR_LENGTH + CAR_GAP));
        if (!place) continue;
        const clamp = (along: number) => THREE.MathUtils.clamp(along, 0.05, run.line.length - 2);
        const p = run.line.at(clamp(place.along)),
          ahead = run.line.at(clamp(place.along + run.dir * 2)),
          back = run.line.at(clamp(place.along - run.dir * 2));
        const y = height(run.line, clamp(place.along)),
          front = height(run.line, clamp(place.along + run.dir * 2)),
          rear = height(run.line, clamp(place.along - run.dir * 2));
        const role = i === 0 ? 1 : i === n - 1 ? -1 : 0,
          key = [t.routeId, run.dir, role, !!tops].join('/');
        let pool = pools.get(key);
        if (!pool) {
          pool = {
            geometry: cq400Geometry({ cab: role !== 0, u0: 0, u1: 1 }, color, !!tops),
            material: cq400Material(color, { value: role }, darkness, planes.get(run.line)),
            meshes: [],
            count: 0,
          };
          pools.set(key, pool);
        }
        let car = pool.meshes[pool.count++];
        if (!car) {
          car = new THREE.Mesh(pool.geometry, pool.material);
          pool.meshes.push(car);
          cars.add(car);
          car.receiveShadow = true;
        }
        car.position.set(place.x, y, place.z);
        car.rotation.order = 'YXZ';
        car.rotation.set(
          -Math.atan2(front - rear, Math.hypot(ahead.x - back.x, ahead.z - back.z)),
          Math.atan2(place.dx, place.dz),
          0,
          'YXZ',
        );
        if (i >= n / 2) car.rotateY(Math.PI);
        if (tops) articulate(car,run.line,place.along,run.dir*(i>=n/2?-1:1),tops,s=>height(run.line,s));
        car.userData.trainId = t.id;
        car.userData.inferredTrack = true;
        car.visible = true;
        total++;
      }
    }
    for (const pool of pools.values())
      for (let i = pool.count; i < pool.meshes.length; i++) pool.meshes[i].visible = false;
    return total;
  };
  const shown = () => [...pools.values()].flatMap((pool) => pool.meshes.slice(0, pool.count));
  /** Free everything this North Line added; the area's own dispose only clears its group. */
  function dispose() {
    for (const object of [guideway, walls, spans.mesh, spans.lamps, portalParts.group]) {
      object.removeFromParent();
      object.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.geometry.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      });
    }
    prewarm.removeFromParent();
    prewarm.geometry.dispose();
    prewarm.material.dispose();
    for (const pool of pools.values()) {
      for (const car of pool.meshes) car.removeFromParent();
      pool.geometry.dispose();
      pool.material.dispose();
    }
    pools.clear();
  }
  return Object.assign(update, { extend, bounds: planes.size ? bounds : null, cars: shown, dispose });
}
