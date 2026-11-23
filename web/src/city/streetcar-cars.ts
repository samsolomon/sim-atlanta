import * as THREE from 'three';
import { lonLatToScene } from '../core/places';
import type { RoutesFile, TrainState } from '../model/types';
import { Line, segDist, type P2 } from '../vignette/geom';
import { S70_LAYOUT, S70_LENGTH, s70Material, s70Sections } from '../vignette/streetcar';
import { STREETCAR_ROUTE } from './streetcar';

type Origin = { lon: number; lat: number };
type Height = (x: number, z: number) => number | null;
type Path = { line: Line; cum: number[] };

const IDS = ['B', 'C', 'A'] as const;
const centreOf = (id: (typeof IDS)[number]) => (S70_LAYOUT.sections[id].from + S70_LAYOUT.sections[id].to) / 2;
const lengthOf = (id: (typeof IDS)[number]) => S70_LAYOUT.sections[id].to - S70_LAYOUT.sections[id].from;

/** Scene polylines of the GTFS streetcar paths, keyed by path id, with GTFS distances. */
export function streetcarPaths(rf: Pick<RoutesFile, 'paths'>, origin: Origin) {
  const out = new Map<string, Path>();
  for (const p of rf.paths) {
    if (p.routeId !== STREETCAR_ROUTE) continue;
    const pts: P2[] = [];
    for (let i = 0; i + 1 < p.coords.length; i += 2) pts.push(lonLatToScene(origin, p.coords[i], p.coords[i + 1]));
    out.set(p.id, { line: new Line(pts), cum: [...p.cum] });
  }
  return out;
}

/** Drawn distance along the scene polyline for a GTFS distance s (proportional per segment). */
export function alongAt(path: Path, s: number) {
  const { cum, line } = path;
  const first = cum[0],
    last = cum[cum.length - 1];
  if (s <= first) return s - first;
  if (s >= last) return line.length + (s - last);
  let lo = 0,
    hi = cum.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (cum[m] <= s) lo = m;
    else hi = m;
  }
  const f = cum[hi] > cum[lo] ? (s - cum[lo]) / (cum[hi] - cum[lo]) : 0;
  return line.cum[lo] + f * (line.cum[hi] - line.cum[lo]);
}

/** Scene point at a drawn distance along a path, extended straight past either end. */
export function pointAlong(path: Path, along: number) {
  const { line } = path;
  if (along < 0 || along > line.length) {
    // Off the end of the shape (a car dwelling at a terminal): continue along the end segment.
    const end = along < 0 ? line.at(0) : line.at(line.length);
    const over = along < 0 ? along : along - line.length;
    return { ...end, x: end.x + end.dx * over, z: end.z + end.dz * over };
  }
  return line.at(along);
}

/** Scene point at GTFS distance s along a path. */
export function pointAt(path: Path, s: number) {
  return pointAlong(path, alongAt(path, s));
}

/**
 * Atlanta Streetcar vehicles: one Siemens S70 per scheduled (or live) trip, placed
 * by its real kinematics. The centre section rides its own truck; each end section
 * hangs from the centre at its joint and rides its power truck. Cab A leads.
 */
export function createStreetcarCars(rf: RoutesFile, origin: Origin, height: Height, clippingPlanes: THREE.Plane[]) {
  const paths = streetcarPaths(rf, origin);
  const group = new THREE.Group();
  group.name = 'Atlanta Streetcar cars';
  const night = { value: 0 };
  const material = s70Material(night) as THREE.Material;
  material.clippingPlanes = clippingPlanes;
  const geometry = s70Sections({ leadingA: true });
  const pool: THREE.Mesh[][] = [];
  // Drawn section footprints, for road traffic to yield to.
  let footprints: { a: P2; b: P2 }[] = [];
  const v = new THREE.Vector3(),
    joint = new THREE.Vector3(),
    truck = new THREE.Vector3();
  // Kinematic offsets are real metres, so they apply along the drawn shape, not in GTFS
  // distance (which differs from the drawn geometry by up to 8% on some paths).
  const on = (path: Path, along: number) => {
    const p = pointAlong(path, along),
      y = height(p.x, p.z);
    return y === null ? null : new THREE.Vector3(p.x, y, p.z);
  };
  const aim = (mesh: THREE.Mesh, from: THREE.Vector3, to: THREE.Vector3) => {
    v.subVectors(to, from).normalize();
    mesh.rotation.set(-Math.asin(THREE.MathUtils.clamp(v.y, -1, 1)), Math.atan2(v.x, v.z), 0, 'YXZ');
  };

  function update(states: readonly TrainState[], dark: number) {
    night.value = dark;
    footprints = [];
    let used = 0;
    for (const t of states) {
      if (t.routeId !== STREETCAR_ROUTE) continue;
      const path = paths.get(t.pathId);
      if (!path) continue;
      // The car's centre on the drawn shape; every pivot offset below is in drawn metres.
      const s = alongAt(path, t.s.value);
      const c0 = on(path, s - 0.9),
        c1 = on(path, s + 0.9),
        tA = on(path, s + S70_LAYOUT.sections.A.pivots[1]),
        tB = on(path, s + S70_LAYOUT.sections.B.pivots[1]);
      // Draw a car only when both of its ends stand on a mounted board.
      const ends = [on(path, s - S70_LENGTH / 2), on(path, s + S70_LENGTH / 2)];
      if (!c0 || !c1 || !tA || !tB || ends.some((e) => !e)) continue;
      let car = pool[used];
      if (!car) {
        car = geometry.map((g, k) => {
          const mesh = new THREE.Mesh(g.geometry, material);
          // Like other moving vehicles: the shadow map redraws only when the camera or sun moves.
          mesh.castShadow = false;
          mesh.receiveShadow = true;
          mesh.userData.lengthM = lengthOf(IDS[k]);
          group.add(mesh);
          return mesh;
        });
        pool[used] = car;
      }
      used++;
      const [B, C, A] = car;
      // C: midway between its axles, along their chord.
      C.position.addVectors(c0, c1).multiplyScalar(0.5);
      aim(C, c0, c1);
      C.updateMatrixWorld(true);
      for (const [mesh, id, trk] of [
        [A, 'A', tA],
        [B, 'B', tB],
      ] as const) {
        const sec = S70_LAYOUT.sections[id];
        joint.set(0, 0, sec.pivots[0]).applyMatrix4(C.matrixWorld);
        truck.copy(trk);
        // The joint's local z within the section; the section aims from joint to truck.
        const zj = sec.pivots[0] - centreOf(id);
        const forward = id === 'A' ? truck.clone().sub(joint) : joint.clone().sub(truck);
        forward.normalize();
        mesh.position.copy(joint).addScaledVector(forward, -zj);
        aim(mesh, new THREE.Vector3(), forward);
      }
      for (const mesh of car) {
        mesh.userData.trainId = t.id;
        mesh.visible = true;
        const half = mesh.userData.lengthM / 2;
        const dir = new THREE.Vector3(0, 0, 1).applyEuler(mesh.rotation);
        footprints.push({
          a: [mesh.position.x - dir.x * half, mesh.position.z - dir.z * half],
          b: [mesh.position.x + dir.x * half, mesh.position.z + dir.z * half],
        });
      }
    }
    for (let i = used; i < pool.length; i++) for (const mesh of pool[i]) mesh.visible = false;
    return used;
  }

  return {
    group,
    update,
    /** Drawn section meshes, for Follow and picking. */
    cars: () => pool.flat().filter((m) => m.visible),
    /** True where a drawn streetcar section (1.4 m half-width) lies within margin. */
    occupied(x: number, z: number, margin: number) {
      for (const { a, b } of footprints) {
        if (Math.min(a[0], b[0]) - margin - 2 > x || Math.max(a[0], b[0]) + margin + 2 < x) continue;
        if (Math.min(a[1], b[1]) - margin - 2 > z || Math.max(a[1], b[1]) + margin + 2 < z) continue;
        if (segDist(x, z, a, b) < 1.4 + margin) return true;
      }
      return false;
    },
    dispose() {
      for (const g of geometry) g.geometry.dispose();
      material.dispose();
      group.clear();
    },
  };
}

/** Embedded track lanes for road traffic, with each segment's heading (one-way loop). */
export function streetcarLanes(rf: Pick<RoutesFile, 'paths'>, origin: Origin) {
  return [...streetcarPaths(rf, origin).values()].map(({ line }) => ({
    pts: line.pts,
    halfWidth: 1.6,
    headings: line.pts.slice(1).map((b, i) => Math.atan2(b[0] - line.pts[i][0], b[1] - line.pts[i][1])),
  }));
}
