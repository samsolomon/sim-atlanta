/** Five Points east cut. OSM supplies horizontal tracks, cover and service direction.
 * The common bed is an illustrative display elevation, in NAVD88 metres. */
import * as THREE from 'three';
import model from '../../../pipeline/prototypes/five-points-east-cut/model.json';
import { makeProjector, type SceneManifest } from '../core/scene-data';
import type { Path, RoutesFile } from '../model/types';
import type { GroundGrid } from '../terrain/grid';
import type { TransportRun } from '../terrain/transport-data';
import { CAR_LENGTH } from '../vignette/cq400';
import { Line, type P2 } from '../vignette/geom';

const { along, across, origin } = model;
const corridor = 'five-points-east-cut';
const services = new Set(['marta:route:BLUE', 'marta:route:GREEN']);
const precision = 15; // reported longitudinal precision of the City cut fixture

export const cutPoint = (s: number, u: number): P2 =>
  [origin[0] + s * along[0] + u * across[0], origin[1] + s * along[1] + u * across[1]];

function section([x, z]: P2): P2 {
  return [(x - origin[0]) * along[0] + (z - origin[1]) * along[1],
    (x - origin[0]) * across[0] + (z - origin[1]) * across[1]];
}

function track(name: keyof typeof model.tracks) {
  return new Line(model.tracks[name].map(([s, u]) => cutPoint(s, u)));
}

const tracks = { ER: track('ER'), EL: track('EL'), CSX: track('CSX'), X: track('X') };
type Project = ReturnType<typeof makeProjector>;

function mouthPlane(line: Line, west: boolean) {
  const p = line.at(west ? 0 : line.length);
  const sign = west ? 1 : -1;
  return new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(sign * p.dx, 0, sign * p.dz),
    new THREE.Vector3(p.x, 0, p.z));
}

export class ServiceTrack {
  readonly line: Line;
  readonly clips: Record<'west' | 'east', THREE.Plane>;
  constructor(readonly routeId: string, readonly name: 'ER' | 'EL', readonly entry: number, readonly exit: number) {
    this.line = tracks[name];
    this.clips = { west: mouthPlane(this.line, true), east: mouthPlane(this.line, false) };
  }

  /** Car offsets stay in physical metres. Short tangent extension lets a car leave either mouth. */
  car(pathM: number, offsetM: number) {
    const dir = this.name === 'ER' ? 1 : -1;
    const distance = (pathM - this.entry) * this.line.length / (this.exit - this.entry) + offsetM;
    const station = dir === 1 ? distance : this.line.length - distance;
    const half = CAR_LENGTH / 2;
    if (!(station > -half && station < this.line.length + half)) return;
    const clipped = station < half ? 'west' : station > this.line.length - half ? 'east' : undefined;
    const p = this.line.at(station);
    const extra = station - Math.max(0, Math.min(this.line.length, station));
    return { x: p.x + extra * p.dx, z: p.z + extra * p.dz, dx: dir * p.dx, dz: dir * p.dz,
      name: this.name, clipped, plane: clipped ? this.clips[clipped] : undefined };
  }
}

/** Intersect the two mapped end stations with the *ordered* GTFS polyline. The common
 * GTFS line can be closer to EL in both directions. Lateral distance never selects the way. */
function serviceTrack(path: Path, sectionPts: P2[], s0: number, s1: number) {
  if (!services.has(path.routeId) || !Number.isFinite(s0) || !Number.isFinite(s1) || s0 >= s1) return;
  const sample = (s: number) => {
    const i = path.cum.findIndex((d, j) => j > 0 && path.cum[j - 1] <= s && s <= d);
    if (i < 1) return NaN;
    const f = (s - path.cum[i - 1]) / (path.cum[i] - path.cum[i - 1]);
    return sectionPts[i - 1][0] + f * (sectionPts[i][0] - sectionPts[i - 1][0]);
  };
  const travel = sample(s1) - sample(s0);
  if (!(Math.abs(travel) > 75)) return;
  const name = travel > 0 ? 'ER' : 'EL';
  const survey = model.tracks[name];
  const west = survey[0][0], east = survey[survey.length - 1][0];
  const hits: number[][] = [[], []];
  for (let i = 1; i < path.cum.length; i++) {
    const [a, u] = sectionPts[i - 1], [b, v] = sectionPts[i];
    const p = path.cum[i - 1], q = path.cum[i];
    if (q < s0 - precision || p > s1 + precision) continue;
    if (!(q > p && (b - a) * travel > 0)) return;
    for (const [j, station] of [west, east].entries()) {
      const f = (station - a) / (b - a);
      if (!(f >= 0 && f < 1)) continue;
      const mappedU = j === 0 ? survey[0][1] : survey[survey.length - 1][1];
      if (Math.abs(u + f * (v - u) - mappedU) > precision) return;
      hits[j].push(p + f * (q - p));
    }
  }
  if (hits.some(list => list.length !== 1)) return;
  const [entry, exit] = hits.map(list => list[0]).sort((a, b) => a - b);
  if (Math.abs(entry - s0) > precision || Math.abs(exit - s1) > precision || exit <= entry) return;
  return new ServiceTrack(path.routeId, name, entry, exit);
}

function localPath(path: Path, project: Project) {
  return path.cum.map((_s, i) => section(project(path.coords[2*i], path.coords[2*i+1])));
}

/** Detect even a previously unknown service crossing the block with a long two-point segment. */
function crossesBlock(points: P2[]) {
  return points.some(([b, v], i) => {
    if (!i) return false;
    const [a, u] = points[i - 1];
    const f = (55 - a) / (b - a);
    return f >= 0 && f <= 1 && Math.abs(u + f * (v - u) + 8) < 20;
  });
}

/** Match the same westbound freight run used to draw and animate CSX; older bakes lack its metres. */
function matchesFreight(run: TransportRun) {
  if (run.cls !== 'standard_gauge' || run.kind !== 'ground' || !run.freightS?.every(Number.isFinite) ||
      run.pts.length < 2) return false;
  const line = new Line(run.pts);
  const westFirst = run.freightS[0] > run.freightS[1];
  const target = tracks.CSX;
  if (Math.abs(Math.abs(run.freightS[1] - run.freightS[0]) - target.length) > 1 ||
      Math.abs(line.length - target.length) > 1) return false;
  for (let j = 0; j <= 12; j++) {
    const p = line.at(line.length * j / 12), q = target.at(target.length * (westFirst ? j : 12-j) / 12);
    if (Math.hypot(p.x - q.x, p.z - q.z) > .5) return false;
  }
  return true;
}

export function prepareEastCut(rf: RoutesFile, manifest: SceneManifest, grid?: GroundGrid, rail?: TransportRun[]) {
  if (!grid || manifest.rail?.version !== 1 || !rail) return;
  const sources = manifest.rail.evidence[corridor]?.sources;
  if (!['702258817', '702258818', '1453238814'].every(id => sources?.includes('osm:way/' + id))) return;
  const freight = rail.filter(matchesFreight);
  if (freight.length !== 1) return;
  // All four corridors and both flanks must be covered by the staged ground raster.
  for (const line of Object.values(tracks)) {
    for (let j = 0; j <= Math.ceil(line.length); j++) {
      const p = line.at(j);
      for (const u of [-2.5, 0, 2.5]) if (!Number.isFinite(grid.sample(p.x + u*p.nx, p.z + u*p.nz))) return;
    }
  }
  const paths = new Map<string, ServiceTrack>();
  const expected = new Set(Object.entries(manifest.rail.paths)
    .filter(([, spans]) => spans.some(s => s.ev === corridor)).map(([id]) => id));
  const project = makeProjector(manifest.origin);
  const heavy = new Set(rf.routes.filter(r => r.mode === 'heavy_rail').map(r => r.id));
  for (const path of rf.paths) {
    if (!heavy.has(path.routeId) && !expected.has(path.id)) continue;
    const pts = localPath(path, project);
    if (!expected.has(path.id) && !crossesBlock(pts)) continue;
    const spans = manifest.rail.paths[path.id]?.filter(s => s.ev === corridor);
    if (!manifest.profiles[path.id] || spans?.length !== 1 || spans[0].cover !== 'open' || spans[0].form !== 'cut' ||
        path.cum.length * 2 !== path.coords.length || !heavy.has(path.routeId)) return;
    const match = serviceTrack(path, pts, spans[0].s0, spans[0].s1);
    if (!match || paths.has(path.id)) return;
    paths.set(path.id, match);
    expected.delete(path.id);
  }
  if (expected.size || new Set([...paths.values()].map(p => p.name)).size !== 2) return;
  return { paths, freight: freight[0], treadY: model.illustrativeBedNavd88M - grid.manifest.vertical.sceneZeroNavd88M + .13 };
}
