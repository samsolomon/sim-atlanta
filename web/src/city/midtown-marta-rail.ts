import * as THREE from 'three';
import { sceneToLonLat } from '../core/places';
import type { RoutesFile, TrainState } from '../model/types';
import { nearestOnPath } from '../sched/engine';
import type { TransportRun } from '../terrain/transport-data';
import { CAR_GAP, CAR_LENGTH, cq400Geometry, cq400Material } from '../vignette/cq400';
import { Builder, Line, type P2 } from '../vignette/geom';
import railRows from './fixtures/midtown-rail.json';
import { northLineGuideway, northLinePiers, northLineProfile, northLineStructure } from './midtown-marta-guideway';
import { inConnectorLanes } from '../terrain/connector-paint';

const service = new Set(['marta:route:RED', 'marta:route:GOLD']);
type Origin = { lon: number; lat: number };
type Height = (x: number, z: number) => number | null;

// Both mapped mains reach the north board boundary. Chain from that known edge
// back to the end of the open track. Only the two contiguous North Line chains
// can carry passenger trains, irrespective of neighboring freight geometry.
export function northLineTracks(runs: readonly TransportRun[], northEdge: number) {
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

function portal(frame: ReturnType<typeof portalFrame>, base: number) {
  const body = new Builder(),
    concrete = '#a89e8f';
  // Illustrative concrete headwall with a centre wall between the two tracks.
  const half = frame.spacing / 2 + 2.72,
    width = 2 * half + 0.38;
  body.box(width, 0.6, 8, 0, 4.95, -3.95, concrete);
  body.box(0.4, 4.65, 8, 0, 2.32, -3.95, '#aa9e8c');
  for (const sign of [-1, 1]) {
    const side = sign * half;
    body.box(0.38, 5.1, 8, side, 2.45, -3.95, '#aa9e8c');
    body.quad(
      [side - 0.18, 0, 0.05],
      [side + 0.18, 0, 0.05],
      [side + 0.18, 1.1, 7.7],
      [side - 0.18, 1.1, 7.7],
      concrete,
    );
    body.quad([side, 0, 0.05], [side, 4.55, 0.05], [side, 1.1, 7.7], [side, 0, 7.7], '#998d7e');
  }
  body.box(width - 0.4, 4.65, 0.16, 0, 2.32, -6.7, '#333436');
  body.box(1.6, 0.44, 0.1, 0, 4.97, 0.1, '#534f49');
  for (let i = 0; i < 4; i++) body.box(1.56, 0.038, 0.14, 0, 4.8 + i * 0.1, 0.15, '#aa9e8c');
  const mesh = new THREE.Mesh(
    body.geometry(),
    new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }),
  );
  mesh.position.set(frame.x, base, frame.z);
  mesh.rotation.y = Math.atan2(frame.dx, frame.dz);
  mesh.name = 'North Line portal';
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

export function createNorthLine(
  area: {
    group: THREE.Group;
    groundAt: (x: number, z: number) => number | null;
    connectorBoard?: { city: { roads: { cls: string; sub?: string | null; pts: [number, number][] }[] } };
  },
  rf: RoutesFile,
  origin: Origin,
  cars: THREE.Group,
) {
  const rows = railRows['brookwood-station'] as TransportRun[];
  const lines = northLineTracks(rows, -5700);
  if (lines.length !== 2) return;
  const paths = northLinePaths(rf, origin, lines);
  const profile = northLineProfile(lines, rows, area.groundAt, area.connectorBoard?.city.roads ?? []);
  if (!profile.height.every(Number.isFinite)) return;
  area.group.add(northLineGuideway(lines, profile, area.groundAt));
  const roads = area.connectorBoard?.city.roads ?? [];
  const spans = northLineStructure(profile, northLinePiers(profile, roads, (x, z) => inConnectorLanes(x, z, 1)), area.groundAt);
  area.group.add(spans.mesh, spans.lamps);
  const height = (line: Line, along: number) => profile.at(line, along);
  const darkness = { value: 0 };
  const planes = new Map<Line, THREE.Plane[]>();
  {
    const frame = portalFrame(lines),
      base = Math.min(...lines.map((l) => height(l, 0.05)));
    area.group.add(portal(frame, base));
    const clip = [
      new THREE.Plane(new THREE.Vector3(frame.dx, 0, frame.dz), -frame.dx * frame.x - frame.dz * frame.z),
      new THREE.Plane(new THREE.Vector3(0, 0, 1), 5700),
    ];
    for (const line of lines) planes.set(line, clip);
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
          key = [t.routeId, run.dir, role].join('/');
        let pool = pools.get(key);
        if (!pool) {
          pool = {
            geometry: cq400Geometry({ cab: role !== 0, u0: 0, u1: 1 }, color),
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
        car.userData.trainId = t.id;
        car.visible = true;
        total++;
      }
    }
    for (const pool of pools.values())
      for (let i = pool.count; i < pool.meshes.length; i++) pool.meshes[i].visible = false;
    return total;
  };
  const shown = () => [...pools.values()].flatMap((pool) => pool.meshes.slice(0, pool.count));
  return Object.assign(update, { bounds: planes.size ? bounds : null, cars: shown });
}
