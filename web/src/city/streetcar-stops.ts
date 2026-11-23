import * as THREE from 'three';
import { lonLatToScene } from '../core/places';
import type { RoutesFile } from '../model/types';
import { roadWidth } from '../terrain/transport-data';
import { Builder, type Line, segDist, type P2 } from '../vignette/geom';
import { orientedBox } from './midtown-marta-guideway';
import { STREETCAR_ROUTE } from './streetcar';

type Origin = { lon: number; lat: number };
type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };
type Height = (x: number, z: number) => number | null;
type RoadLike = { cls: string; pts: P2[]; tunnel?: boolean };

/** Stops where a navy name pylon was confirmed in Street View. */
const PYLON = new Set(['PARK PLACE', 'SWEET AUBURN MARKET']);
/**
 * Side of the street each platform stands on, from the Street View survey (compass,
 * scene x east and z south). The curb-side guess from road centrelines put Sweet
 * Auburn Market on the wrong side, so the observed side wins.
 */
const SIDE: Record<string, [number, number]> = {
  'DOBBS PLAZA': [0, -1],
  'AUBURN AVE @ PIEDMONT AVE': [0, -1],
  'WOODRUFF PARK': [0, -1],
  'PEACHTREE CENTER STATION': [1, 0],
  'CARNEGIE WAY @ TED TURNER DR': [1, 0],
  'CENTENNIAL OLYMPIC PARK': [1, 0],
  'LUCKIE ST @ CONE ST': [-0.7, 0.7],
  'PARK PLACE': [-1, 0],
  'HURT PARK': [0, 1],
  'SWEET AUBURN MARKET': [0, -1],
  'EDGEWOOD AVE @ HILLIARD ST': [0, 1],
  'KING HISTORIC DISTRICT': [0, -1],
};
/** The one free-standing island platform (railings on both sides). */
const ISLAND = 'CENTENNIAL OLYMPIC PARK';

// Street View survey, 2024-2026 (docs/streetcar-city.md). All dimensions are estimates
// scaled from the ticket machine.
const PLATFORM = { length: 22, width: 3, height: 0.33, gap: 1.45 };
const SHELTER = { length: 5.5, depth: 1.7, clear: 2.7 };

/** The streetcar's stops (those its timetable serves on any of its paths), in scene metres. */
export function streetcarStops(rf: Pick<RoutesFile, 'paths' | 'stops'>, origin: Origin, served: (pathId: string, stopId: string) => boolean) {
  const paths = rf.paths.filter((p) => p.routeId === STREETCAR_ROUTE).map((p) => p.id);
  return rf.stops.flatMap((s) => {
    if (!paths.some((p) => served(p, s.id))) return [];
    const [x, z] = lonLatToScene(origin, s.lon, s.lat);
    return [{ id: s.id, name: s.name, x, z }];
  });
}

function nearestOnLines(lines: Line[], x: number, z: number) {
  let best = { d: Infinity, x: 0, z: 0, dx: 1, dz: 0 };
  for (const l of lines)
    for (let i = 1; i < l.pts.length; i++) {
      const [ax, az] = l.pts[i - 1],
        [bx, bz] = l.pts[i];
      const dx = bx - ax,
        dz = bz - az,
        len2 = dx * dx + dz * dz || 1;
      const t = THREE.MathUtils.clamp(((x - ax) * dx + (z - az) * dz) / len2, 0, 1);
      const px = ax + t * dx,
        pz = az + t * dz,
        d = Math.hypot(x - px, z - pz),
        len = Math.sqrt(len2);
      if (d < best.d) best = { d, x: px, z: pz, dx: dx / len, dz: dz / len };
    }
  return best;
}

/**
 * Where each stop's platform goes: beside the track on its curb side (the side of the
 * street the track lane is offset toward), facing the track.
 */
export function platformSites(stops: ReturnType<typeof streetcarStops>, lines: Line[], roads: readonly RoadLike[]) {
  const streets = roads.filter((r) => !r.tunnel && !['footway', 'path', 'steps', 'pedestrian', 'cycleway', 'motorway', 'service'].includes(r.cls));
  return stops.map((stop) => {
    const t = nearestOnLines(lines, stop.x, stop.z);
    const nx = -t.dz,
      nz = t.dx;
    // The street the track runs in, and which side of its centreline the track lies on.
    let street: { d: number; side: number } | null = null;
    for (const r of streets)
      for (let i = 1; i < r.pts.length; i++) {
        const d = segDist(t.x, t.z, r.pts[i - 1], r.pts[i]);
        if (d > roadWidth(r) / 2 + 2 || (street && d >= street.d)) continue;
        const [ax, az] = r.pts[i - 1],
          [bx, bz] = r.pts[i];
        const len = Math.hypot(bx - ax, bz - az) || 1;
        const u = THREE.MathUtils.clamp(((t.x - ax) * (bx - ax) + (t.z - az) * (bz - az)) / (len * len), 0, 1);
        const cx = ax + u * (bx - ax),
          cz = az + u * (bz - az);
        street = { d, side: Math.sign((t.x - cx) * nx + (t.z - cz) * nz) || 1 };
      }
    // The surveyed side first; then away from the street's centreline; then the stop's own side.
    const seen = SIDE[stop.name];
    const side = seen
      ? Math.sign(seen[0] * nx + seen[1] * nz) || 1
      : (street?.side ?? (Math.sign((stop.x - t.x) * nx + (stop.z - t.z) * nz) || 1));
    const off = side * (PLATFORM.gap + PLATFORM.width / 2);
    return { ...stop, track: t, side, x: t.x + nx * off, z: t.z + nz * off, dx: t.dx, dz: t.dz };
  });
}

const CONCRETE = '#b9b5ab',
  TACTILE = '#a4503a',
  STEEL = '#b8bcbf',
  NAVY = '#20305c',
  CHARCOAL = '#33363a',
  MACHINE = '#9cc3d6',
  RAILING = '#9aa1a4';

/** Platforms, shelters and pylons for the stops inside one board. */
export function buildStreetcarStops(sites: ReturnType<typeof platformSites>, bounds: Bounds, height: Height) {
  const body = new Builder(),
    glass = new Builder(),
    lit = new Builder();
  const owns = (x: number, z: number) => x >= bounds.minX && x < bounds.maxX && z >= bounds.minZ && z < bounds.maxZ;
  const drawn: string[] = [];
  for (const site of sites) {
    if (!owns(site.x, site.z)) continue;
    const g = height(site.x, site.z);
    if (g === null) continue;
    drawn.push(site.name);
    const { dx, dz, side } = site;
    // Local frame: u along the track, v across (positive away from the track).
    const nx = -dz * side,
      nz = dx * side;
    const at = (u: number, v: number): [number, number] => [site.x + dx * u + nx * v, site.z + dz * u + nz * v];
    const top = g + PLATFORM.height;
    const W = PLATFORM.width / 2,
      L = PLATFORM.length / 2;
    const box = (u: number, v: number, lo: number, hi: number, alongHalf: number, acrossHalf: number, color: string, b = body) => {
      const [x, z] = at(u, v);
      orientedBox(b, x, z, dx, dz, lo, hi, alongHalf, acrossHalf, color);
    };
    box(0, 0, g - 0.2, top, L, W, CONCRETE);
    // Red tactile band along the boarding edge, and a ramp at each end.
    box(0, -W + 0.3, top, top + 0.01, L, 0.3, TACTILE);
    for (const end of [-1, 1]) {
      const [x0, z0] = at(end * L, -W),
        [x1, z1] = at(end * L, W),
        [x2, z2] = at(end * (L + 4), W),
        [x3, z3] = at(end * (L + 4), -W);
      body.quad([x0, top, z0], [x1, top, z1], [x2, g, z2], [x3, g, z3], CONCRETE);
    }
    // Pipe guardrail along the back (both long sides on the island platform).
    for (const v of site.name === ISLAND ? [-W + 0.08, W - 0.08] : [W - 0.08]) {
      box(0, v, top + 1.0, top + 1.05, L, 0.03, RAILING);
      box(0, v, top + 0.5, top + 0.54, L, 0.025, RAILING);
      for (let u = -L; u <= L; u += 2.2) box(u, v, top, top + 1.05, 0.03, 0.03, RAILING);
    }
    // Shelter: four bays on round posts, single-slope glass roof cantilevered toward the track.
    const S = SHELTER.length / 2,
      back = W - 0.35,
      front = back - SHELTER.depth;
    for (let k = 0; k <= 4; k++) box(-S + (k * SHELTER.length) / 4, back, top, top + SHELTER.clear + 0.25, 0.05, 0.05, STEEL);
    const [r0x, r0z] = at(-S, back),
      [r1x, r1z] = at(S, back),
      [r2x, r2z] = at(S, front),
      [r3x, r3z] = at(-S, front);
    const hb = top + SHELTER.clear + 0.25,
      hf = top + SHELTER.clear;
    glass.quad([r0x, hb, r0z], [r1x, hb, r1z], [r2x, hf, r2z], [r3x, hf, r3z], '#c9e2ea');
    body.quad([r3x, hf - 0.12, r3z], [r2x, hf - 0.12, r2z], [r2x, hf, r2z], [r3x, hf, r3z], STEEL); // fascia
    // Glass back wall and one end panel.
    const [b0x, b0z] = at(-S, back + 0.02),
      [b1x, b1z] = at(S, back + 0.02);
    glass.quad([b0x, top + 0.15, b0z], [b1x, top + 0.15, b1z], [b1x, top + 2.2, b1z], [b0x, top + 2.2, b0z], '#c9e2ea');
    const [e0x, e0z] = at(-S, back),
      [e1x, e1z] = at(-S, front + 0.4);
    glass.quad([e0x, top + 0.15, e0z], [e1x, top + 0.15, e1z], [e1x, top + 2.2, e1z], [e0x, top + 2.2, e0z], '#c9e2ea');
    // Charcoal name board hung under the front edge.
    box(0, front + 0.05, hf - 0.42, hf - 0.12, 1.0, 0.03, CHARCOAL);
    // Backlit map panel, ticket machine and perforated bench, left to right.
    box(-S + 0.7, back - 0.08, top + 0.3, top + 2.0, 0.55, 0.05, STEEL);
    box(-S + 0.7, back - 0.14, top + 0.45, top + 1.85, 0.45, 0.02, '#f2f4f0', lit);
    box(-0.6, back - 0.3, top, top + 1.85, 0.37, 0.22, MACHINE);
    box(1.4, back - 0.35, top + 0.42, top + 0.47, 0.9, 0.22, STEEL);
    for (const u of [0.6, 2.2]) box(u, back - 0.35, top, top + 0.42, 0.04, 0.18, STEEL);
    // Navy blade pylon at the platform end, where one stands.
    if (PYLON.has(site.name)) box(L - 1, W - 0.5, top, top + 3.5, 0.15, 0.05, NAVY);
  }
  const group = new THREE.Group();
  group.name = 'Atlanta Streetcar stops';
  const solid = new THREE.Mesh(body.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
  solid.castShadow = solid.receiveShadow = true;
  const panes = new THREE.Mesh(
    glass.geometry(),
    new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: true, opacity: 0.38, depthWrite: false }),
  );
  const panels = new THREE.Mesh(lit.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#f4f1e6', emissiveIntensity: 0 }));
  group.add(solid, panes, panels);
  return {
    group,
    drawn,
    setNight(night: number) {
      (panels.material as THREE.MeshLambertMaterial).emissiveIntensity = night * 0.8;
    },
    dispose() {
      for (const m of [solid, panes, panels]) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    },
  };
}
