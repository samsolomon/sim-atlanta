import { deeringBranch, deeringDonor, deeringThrough, deeringSection, deeringStations } from '../../../pipeline/prototypes/highway-four/deering';
import eastWays from '../../../pipeline/prototypes/highway-four/east-ways.json';
import midtownWays from '../city/fixtures/midtown-connector/ways.json';
import downtownWays from '../../../pipeline/prototypes/connector-footprint/ways.json';
import { Line, type P2 } from '../vignette/geom';
import { PlacementIndex } from '../vignette/spatial';
import { surveyedEdges } from './connector-survey';
import { connectorLanes, type ConnectorDirection } from './connector-lanes';

type Kind = 'ground' | 'bridge' | 'tunnel';
type Way = { version: number; lanes: number; link: boolean; kind: Kind; hov: boolean; pts: P2[] };
export interface Ribbon extends Way {
  id: number;
  key: string;
  line: Line;
  /** Directed mainline metres at this ribbon's first node, relative to Georgia State. */
  station0?: number;
  rows: Section[];
  direction: ConnectorDirection;
}
export interface Section {
  s: number;
  inner: P2;
  outer: P2;
  /** Where this edge is shared with a sibling at a merge or diverge: the owner draws one dashed
   * lane line ('dash') and the other branch draws none ('none'). Unset: an ordinary edge line. */
  joined?: { inner?: 'dash' | 'none'; outer?: 'dash' | 'none'; innerWith?: Ribbon; outerWith?: Ribbon };
  /** Metres of this section, measured in from that edge, that lie under a sibling that owns
   * the surface there: a shared option lane before the gore opens. Paint and deck treads stop
   * at the owner's edge (paintedSection); traffic keeps the whole section. */
  covered?: { inner?: number; outer?: number };
}
type End = { ribbon: Ribbon; start: boolean; offset: number };
type Joint = { incoming: End[]; outgoing: End[] };
export const mix = (a: P2, b: P2, f: number): P2 => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
export const stripePoint = (row: Section, fraction: number) => mix(row.inner, row.outer, fraction);
/** The part of a section that is drawn: without what a sibling covers (one surface owner). */
export function paintedSection(row: Section): Section {
  const a = row.covered?.inner ?? 0, b = row.covered?.outer ?? 0;
  if (!a && !b) return row;
  const w = Math.hypot(row.outer[0] - row.inner[0], row.outer[1] - row.inner[1]) || 1;
  const f0 = Math.min(1, a / w), f1 = Math.max(f0, 1 - b / w);
  return { s: row.s, inner: mix(row.inner, row.outer, f0), outer: mix(row.inner, row.outer, f1), joined: row.joined };
}
const rawWays = { ...downtownWays, ...midtownWays, ...eastWays };
const joints = new Map<string, Joint>();
const sourceEnds = new Set(
  Object.values(rawWays).flatMap((w) => [w.pts[0].join(','), w.pts.at(-1)!.join(',')]),
);
export const ribbons: Ribbon[] = [];
/** Ways OSM tags as tunnels that are really open freeway under a wide street deck: the
 * Fifth Street park deck (51 m, lidar) over the Connector. Drawn and driven as ground; the deck
 * is Fifth Street's own profiled run (landbridges.json). */
const UNDER_LAND_BRIDGE = new Set(['560940890', '560940891']);
for (const [id, raw] of Object.entries(rawWays)) {
  const way = UNDER_LAND_BRIDGE.has(id) ? { ...(raw as Way), kind: 'ground' as Kind } : raw as Way;
  let first = 0;
  for (let i = 1; i < way.pts.length; i++) {
    if (i < way.pts.length - 1 && !sourceEnds.has(way.pts[i].join(','))) continue;
    const pts = way.pts.slice(first, i + 1);
    // The SB managed entrance joins an internal OSM node at Edgewood. The
    // five general lanes and its contiguous HOV lane continue to the right entrance.
    const lanes = (Number(id) === 38945231 && first > 0) || Number(id) === 1450888995 ? 6 : way.lanes;
    const ribbon: Ribbon = {
      ...way,
      id: Number(id),
      key: id + '/' + first,
      lanes,
      pts,
      line: new Line(pts),
      rows: [],
      direction: pts.at(-1)![1] < pts[0][1] ? 'northbound' : 'southbound',
    };
    ribbons.push(ribbon);
    for (const start of [true, false]) {
      const key = (start ? pts[0] : pts.at(-1)!).join(',');
      const joint = joints.get(key) ?? { incoming: [], outgoing: [] };
      (start ? joint.outgoing : joint.incoming).push({ ribbon, start, offset: 0 });
      joints.set(key, joint);
    }
    first = i;
  }
}

// Each Georgia State crossing supplies a fixed origin even as boards or source
// ways are added upstream. Links retain their own distance from the ramp start.
for (const id of [119686423, 316454382]) {
  const origin = ribbons.find(r => r.id === id)!;
  origin.station0 = 0;
  for (const forward of [true, false]) {
    let r = origin;
    while (true) {
      const endpoint = forward ? r.pts.at(-1)! : r.pts[0];
      const joint = joints.get(endpoint.join(','))!;
      const mains = (forward ? joint.outgoing : joint.incoming).filter(e => !e.ribbon.link);
      if (mains.length !== 1) break;
      const next = mains[0].ribbon;
      if (next.station0 !== undefined) break;
      next.station0 = forward ? r.station0! + r.line.length : r.station0! - next.line.length;
      r = next;
    }
  }
}

function frame(r: Ribbon, s: number) {
  const a = r.line.at(s - 2),
    b = r.line.at(s + 2),
    p = r.line.at(s);
  const length = Math.hypot(b.x - a.x, b.z - a.z);
  return { x: p.x, z: p.z, rx: (a.z - b.z) / length, rz: (b.x - a.x) / length };
}

function typical(r: Ribbon, s: number): Section {
  const { x, z, rx, rz } = frame(r, s),
    half = (r.lanes * 3.55) / 2;
  return { s, inner: [x - rx * half, z - rz * half], outer: [x + rx * half, z + rz * half] };
}

// At a branching node the OSM centrelines share a point even when the
// physical carriageways are already side by side. Intersect the local normal
// with the surveyed median-side edge before assigning any of the lane slots.
const picksFor = (direction: ConnectorDirection) =>
  surveyedEdges.filter((p) => {
    const r = ribbons.find((w) => w.id === p.way);
    return r && !r.link && r.direction === direction;
  });
const mainEdges = { northbound: picksFor('northbound'), southbound: picksFor('southbound') };
function jointBoundary(r: Ribbon, s: number, picks: P2[]) {
  const f = frame(r, s);
  const along = (p: P2) => (p[0] - f.x) * f.rz - (p[1] - f.z) * f.rx;
  const near = picks
    .filter((p) => Math.hypot(p[0] - f.x, p[1] - f.z) < 210)
    .sort((a, b) => along(a) - along(b));
  const i = near.findIndex((p) => along(p) >= 0);
  if (i <= 0) return undefined;
  const a = near[i - 1],
    b = near[i],
    u = along(a),
    v = along(b);
  return mix(a, b, -u / (v - u || 1));
}
function junctionSection(trunk: End, ends: End[]) {
  const r = trunk.ribbon,
    s = trunk.start ? 0 : r.line.length,
    row = typical(r, s);
  const f = frame(r, s),
    width = r.lanes * 3.55;
  if (!r.link) {
    // Across a median-side HOV split the outside edge continues straight.
    const outside = ends.some((e) => e.ribbon.hov);
    const picks = mainEdges[r.direction].map((p) => (outside ? p.outer : p.inner));
    const edge = jointBoundary(r, s, picks);
    if (!edge) return row;
    const inner: P2 = outside ? [edge[0] - f.rx * width, edge[1] - f.rz * width] : edge;
    return { s, inner, outer: [inner[0] + f.rx * width, inner[1] + f.rz * width] as P2 };
  }
  // Short consecutive ramp ways can have separate bridge tags along one physical
  // lane. Carry the stripe across those metadata boundaries without recentering.
  const family = new Set<number>();
  function walk(e: End, remaining: number) {
    if (family.has(e.ribbon.id) || remaining <= 0 || !e.ribbon.link || e.ribbon.lanes !== r.lanes)
      return;
    family.add(e.ribbon.id);
    const end = (e.start ? e.ribbon.pts.at(-1)! : e.ribbon.pts[0]).join(',');
    const j = joints.get(end)!;
    if (j.incoming.length === 1 && j.outgoing.length === 1)
      walk((e.start ? j.outgoing : j.incoming)[0], remaining - e.ribbon.line.length);
  }
  ends.forEach((e) => walk(e, 220));
  const observations = surveyedEdges.filter((p) => family.has(p.way));
  const inner = jointBoundary(
      r,
      s,
      observations.map((p) => p.inner),
    ),
    outer = jointBoundary(
      r,
      s,
      observations.map((p) => p.outer),
    );
  return inner && outer ? { s, inner, outer } : row;
}
const pins = new Map<Ribbon, Section[]>(ribbons.map((r) => [r, []]));
export interface LaneEnd {
  ribbon: Ribbon;
  lane: number;
}
export const laneKey = ({ ribbon, lane }: LaneEnd) => ribbon.key + '/' + lane;
export const successors = new Map<string, LaneEnd[]>();
for (const joint of joints.values()) {
  const all = [...joint.incoming, ...joint.outgoing];
  // The widest mainline supplies the common stripe grid. Outer slip lanes share
  // their exit choice at the nose. Median-side HOV ramps take the inside slot.
  const trunk = all.reduce((a, b) =>
    (a.ribbon.link === b.ribbon.link ? a.ribbon.lanes >= b.ribbon.lanes : !a.ribbon.link) ? a : b,
  );
  const total = trunk.ribbon.lanes;
  const basis = junctionSection(trunk, all);
  for (const side of [joint.incoming, joint.outgoing]) {
    const ordered = side.slice().sort((a, b) => {
      const f = frame(trunk.ribbon, trunk.start ? 0 : trunk.ribbon.line.length);
      const sideOf = (e: End) => {
        const s = e.start ? 16 : e.ribbon.line.length - 16,
          p = e.ribbon.line.at(s);
        return (p.x - f.x) * f.rx + (p.z - f.z) * f.rz;
      };
      return sideOf(a) - sideOf(b);
    });
    let assigned = 0;
    for (const e of ordered) {
      const leftRamp = e.ribbon.hov;
      const medianBranch = side.some((o) => o !== e && o.ribbon.hov);
      e.offset =
        e === trunk
          ? 0
          : e.ribbon.link && !leftRamp
            ? total - e.ribbon.lanes
            : !e.ribbon.link && medianBranch
              ? Math.min(1, total - e.ribbon.lanes)
              : 0;
      if (trunk.ribbon.link || side.filter(branch => !branch.ribbon.link).length > 1) e.offset = Math.min(assigned, total - e.ribbon.lanes);
      if (trunk.ribbon.id === deeringDonor && !trunk.start && e.start) {
        if (e.ribbon.id === deeringBranch) e.offset = 0;
        if (e.ribbon.id === deeringThrough) e.offset = 2;
      }
      assigned += e.ribbon.lanes;
      const s = e.start ? 0 : e.ribbon.line.length;
      pins.get(e.ribbon)!.push({
        s,
        inner: stripePoint(basis, e.offset / total),
        outer: stripePoint(basis, (e.offset + e.ribbon.lanes) / total),
      });
      if (e.ribbon.link && !trunk.ribbon.link) e.ribbon.direction = trunk.ribbon.direction;
    }
  }
  for (const from of joint.incoming)
    for (let i = 0; i < from.ribbon.lanes; i++) {
      const to: LaneEnd[] = [];
      for (const end of joint.outgoing) {
        const lane = from.offset + i - end.offset;
        if (lane >= 0 && lane < end.ribbon.lanes) to.push({ ribbon: end.ribbon, lane });
      }
      successors.set(laneKey({ ribbon: from.ribbon, lane: i }), to);
    }
}

export function alongOn(r: Pick<Ribbon, "pts" | "line">, p: P2) {
  let best = Infinity,
    along = 0;
  for (let i = 1; i < r.pts.length; i++) {
    const a = r.pts[i - 1],
      b = r.pts[i],
      dx = b[0] - a[0],
      dz = b[1] - a[1];
    const f = Math.max(
      0,
      Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)),
    );
    const d = Math.hypot(a[0] + dx * f - p[0], a[1] + dz * f - p[1]);
    if (d < best) {
      best = d;
      along = r.line.cum[i - 1] + f * (r.line.cum[i] - r.line.cum[i - 1]);
    }
  }
  return { s: along, distance: best };
}

// At Georgia State a mapped junction lies *within* the measured span. Each
// approach owns its actual subset of that cross-section, including the SB choice.
const underRail: Record<number, [number, number]> = {
  949112684: [0, 5],
  39160892: [5, 7],
  119686423: [0, 7],
  316454382: [0, 7],
  119686426: [0, 6],
  9236888: [5, 7],
};
const railStation = (p: P2) => (p[0] - 760) * 0.8 - (p[1] - 545) * 0.6;
function measured(r: Ribbon, s: number, station: number) {
  const [first, last] = underRail[r.id],
    lanes = connectorLanes(r.direction, Math.max(-76, Math.min(77, station)))!;
  return { s, inner: lanes.edges[first], outer: lanes.edges[last] };
}

// Survey cross-sections are inserted on the source polyline, preserving every
// original bend. Interpolate the lateral correction rather than cutting a chord
// across a curve between two widely spaced measurements.
for (const pick of surveyedEdges) {
  const midpoint = mix(pick.inner, pick.outer, 0.5);
  const r = ribbons
    .filter((w) => w.id === pick.way)
    .sort((a, b) => alongOn(a, midpoint).distance - alongOn(b, midpoint).distance)[0];
  if (!r) continue;
  const s = alongOn(r, mix(pick.inner, pick.outer, 0.5)).s;
  if (s > 0.1 && s < r.line.length - 0.1) pins.get(r)!.push({ s, inner: pick.inner, outer: pick.outer });
}
const index = new PlacementIndex<Ribbon>();
/** Rows that are measured, not inferred: the rail-crossing section and the surveyed edges.
 * The one-surface-owner pass never moves them. */
const fixedRows = new Set<Section>();
for (const r of ribbons) {
  const anchors = pins.get(r)!;
  if (underRail[r.id]) {
    for (let i = 1; i < r.pts.length; i++) {
      const a = railStation(r.pts[i - 1]),
        b = railStation(r.pts[i]);
      for (const station of [-76, 77]) {
        const f = (station - a) / (b - a);
        if (f > 0 && f < 1) {
          const s = r.line.cum[i - 1] + f * (r.line.cum[i] - r.line.cum[i - 1]);
          anchors.push(measured(r, s, station));
        }
      }
    }
  }
  anchors.sort((a, b) => a.s - b.s);
  const stations = new Set([...r.line.cum, ...anchors.map((a) => a.s), ...deeringStations(r.id).filter(s=>s>0 && s<r.line.length)]);
  for (const p of anchors)
    for (const delta of [-50, 50]) {
      const s = p.s + delta;
      if (s > 0 && s < r.line.length && anchors.every((a) => Math.abs(s - a.s) >= 49.99)) {
        stations.add(s);
      }
    }
  // Paint, structural treads and lane centre paths share these sections.
  // Continue the eight-metre sampling grid through source way boundaries.
  const start = r.station0 ?? 0;
  for (let station = (Math.floor(start / 8) + 1) * 8; station < start + r.line.length; station += 8)
    stations.add(station - start);
  for (const s of [...stations].sort((a, b) => a - b)) {
    const row = typical(r, s),
      p = r.line.at(s),
      station = railStation([p.x, p.z]);
    if (underRail[r.id] && station >= -76 - 1e-6 && station <= 77 + 1e-6) {
      const row = measured(r, s, station);
      fixedRows.add(row);
      r.rows.push(row);
      continue;
    }
    const right = anchors.find((a) => a.s >= s) ?? anchors.at(-1)!;
    const left = anchors[anchors.indexOf(right) - (right.s > s ? 1 : 0)] ?? anchors[0];
    const gap = right.s - left.s;
    const t = gap ? (s - left.s) / gap : 0;
    for (const [anchor, weight] of [
      [left, 1 - t],
      [right, t],
    ] as const) {
      // Long unsurveyed gaps return to the local OSM alignment. Close observed
      // sections carry their correction continuously through the bend.
      const w = gap > (r.link ? 140 : 300) ? Math.max(0, 1 - Math.abs(anchor.s - s) / 50) : weight;
      if (!w) continue;
      const base = typical(r, anchor.s);
      for (const k of ['inner', 'outer'] as const)
        for (const j of [0, 1]) row[k][j] += (anchor[k][j] - base[k][j]) * w;
    }
    const fitted = deeringSection(r.id,row);
    // A surveyed pick inside the way (not a junction pin, which the owner pass may extend).
    if (anchors.some(a => Math.abs(a.s - s) < 1e-6 && a.s > 0.1 && a.s < r.line.length - 0.1)) fixedRows.add(fitted);
    r.rows.push(fitted);
  }
  index.add(r, r.pts, 32);
}

/**
 * One surface owner at merges and diverges (docs/road-kit.md, primitive 5).
 *
 * Sibling ways share their OSM node, so once the 50 m junction blend fades each ribbon's width
 * is laid around its own centreline, and the two lie over each other until the ways separate.
 * The branch that does not own the surface (a link beside a mainline, else the narrower way) is
 * pushed sideways row by row until its edge meets its neighbour's. The push falls to zero where
 * the ways separate on their own, so it never adds a kink. The shared edge is one dashed lane
 * line, and the wedge where the edges part is a gore, painted with chevrons (connector-paint).
 */
export interface Gore {
  /** The joint's node, "x,z" as in the source ways. */
  joint: string;
  left: Ribbon;
  right: Ribbon;
  /** The wedge between the two edges, from where they part to where they are a lane apart. */
  ring: P2[];
}
export const gores: Gore[] = [];
/** Rows moved in the current separation pass. */
let moved = 0;
const GORE_GAP_M = 3.6, GORE_MAX_M = 150, ZONE_MAX_M = 400, BLEND_M = 60;
/** A push grows at most 1 m per 10 m from a fixed joint (about 6 degrees), so a row at a node
 * never moves and the edge never kinks. Where OSM lane counts do not balance, a branch starts
 * inside its neighbour's lane at the node; it tapers out at this rate (lane tapers, part 4). */
const PUSH_SLOPE = 0.1;
/** Beside a mainline with no shared node, a branch's ends at real joints stay put; 1 m per 4 m. */
const PARALLEL_SLOPE = 0.25;
/** Total sideways push per row, across passes. */
const pushed = new WeakMap<Section, number>();
/** Record how much of a row stays under its owner after the push (or clear it). */
function cover(row: Section, side: 'inner' | 'outer', metres: number) {
  const { [side]: _, ...rest } = row.covered ?? {};
  row.covered = metres > 0.02 ? { ...rest, [side]: metres } : Object.keys(rest).length ? rest : undefined;
}
/** Tests: how far the one-surface-owner pass moved this row sideways, in metres. */
export const pushOf = (row: Section) => pushed.get(row) ?? 0;
/** Push a row sideways along unit u by up to t metres, within its cap; returns the push made. */
function push(ribbon: Ribbon, row: Section, u: P2, t: number, cap: number) {
  if (fixedRows.has(row)) return 0;
  // Beside a measured row, and from either end of the ribbon at a real joint (where lanes meet
  // their successors), the push grows from zero, so nothing at a joint moves or kinks.
  for (const q of ribbon.rows) if (fixedRows.has(q)) cap = Math.min(cap, 0.3 * Math.abs(q.s - row.s));
  cap = Math.min(cap, PARALLEL_SLOPE * fixedDistance(ribbon, row.s));
  const done = pushed.get(row) ?? 0, room = Math.max(0, cap - done), m = Math.sign(t) * Math.min(Math.abs(t), room);
  if (Math.abs(m) < 1e-6) return 0;
  for (const k of ['inner', 'outer'] as const) row[k] = [row[k][0] + u[0] * m, row[k][1] + u[1] * m];
  pushed.set(row, done + Math.abs(m));
  moved++;
  return m;
}

type Step = { ribbon: Ribbon; forward: boolean };
/** A ribbon and the ones that continue it away from the joint through plain chain joints. */
function chainFrom(first: Step) {
  const out = [first];
  for (let length = first.ribbon.line.length; length < ZONE_MAX_M; ) {
    const last = out.at(-1)!;
    const node = (last.forward ? last.ribbon.pts.at(-1)! : last.ribbon.pts[0]).join(',');
    const j = joints.get(node);
    if (!j || j.incoming.length !== 1 || j.outgoing.length !== 1) break;
    const next = (last.forward ? j.outgoing : j.incoming)[0].ribbon;
    if (out.some(o => o.ribbon === next)) break;
    out.push({ ribbon: next, forward: last.forward });
    length += next.line.length;
  }
  return out;
}
/** Rows of a chain in walk order, with the distance walked from the joint. */
function walkRows(chain: Step[]) {
  const out: { row: Section; ribbon: Ribbon; d: number }[] = [];
  let base = 0;
  for (const { ribbon, forward } of chain) {
    const rows = forward ? ribbon.rows : [...ribbon.rows].reverse();
    for (const row of rows) out.push({ row, ribbon, d: base + (forward ? row.s : ribbon.line.length - row.s) });
    base += ribbon.line.length;
  }
  return out;
}
/** Index of the last row at or before s. */
function sectionIndex(r: Ribbon, s: number) {
  let lo = 0, hi = r.rows.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (r.rows[m].s <= s) lo = m; else hi = m; }
  return lo;
}
/** Signed distance t along unit u from p to the polyline, nearest crossing within reach. */
function crossing(p: P2, u: P2, line: P2[], reach: number) {
  let best: number | undefined;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], ex = b[0] - a[0], ez = b[1] - a[1];
    const den = u[0] * ez - u[1] * ex;
    if (Math.abs(den) < 1e-9) continue;
    const wx = a[0] - p[0], wz = a[1] - p[1];
    const t = (wx * ez - wz * ex) / den, v = (wx * u[1] - wz * u[0]) / den;
    if (v < -1e-9 || v > 1 + 1e-9 || Math.abs(t) > reach) continue;
    if (best === undefined || Math.abs(t) < Math.abs(best)) best = t;
  }
  return best;
}
/** The owner keeps its sections: a mainline over a link, else the wider way, else the first. */
const owns = (a: Ribbon, b: Ribbon) => a.link !== b.link ? !a.link : a.lanes !== b.lanes ? a.lanes > b.lanes : true;
/** Distance from a point on a branch to the nearest mainline at grade. */
function toMainline(r: Ribbon, s: number) {
  const p = r.line.at(s);
  let best = Infinity;
  for (const m of index.at(p.x, p.z)) if (!m.link && m.kind === 'ground') best = Math.min(best, alongOn(m, [p.x, p.z]).distance);
  return best;
}
function separate(joint: string, left: End, right: End, forward: boolean) {
  // Two equal links: the one nearer the mainline keeps its place and the other moves away,
  // so a branch already beside the mainline is never pushed back into it.
  const tie = left.ribbon.link === right.ribbon.link && left.ribbon.lanes === right.ribbon.lanes;
  const at = (e: End) => forward ? Math.min(16, e.ribbon.line.length) : Math.max(0, e.ribbon.line.length - 16);
  const leftOwns = tie ? toMainline(left.ribbon, at(left)) <= toMainline(right.ribbon, at(right)) : owns(left.ribbon, right.ribbon);
  const owner = leftOwns ? left : right, minor = leftOwns ? right : left;
  const ownerRows = walkRows(chainFrom({ ribbon: owner.ribbon, forward }));
  // The owner's edge that faces the minor branch.
  const edge = ownerRows.map(o => leftOwns ? o.row.outer : o.row.inner);
  const minorRows = walkRows(chainFrom({ ribbon: minor.ribbon, forward }));
  let parted = 0, clear = 0, cap = Infinity;
  const edgeOfMinor: P2[] = [], edgeOfOwner: P2[] = [];
  for (const { row, ribbon, d } of minorRows) {
    if (d > ZONE_MAX_M) break;
    const len = Math.hypot(row.outer[0] - row.inner[0], row.outer[1] - row.inner[1]);
    if (len < 1e-6) continue;
    const u: P2 = [(row.outer[0] - row.inner[0]) / len, (row.outer[1] - row.inner[1]) / len];
    const p = leftOwns ? row.inner : row.outer;
    const t = crossing(p, u, edge, 40);
    if (t === undefined) break;
    // Overlap: the owner's edge lies inside the minor branch (right of its inner edge when the
    // owner is on the left, left of its outer edge when the owner is on the right).
    const overlap = leftOwns ? t : -t;
    // Balanced lanes abut at the node, and the push grows only as the centrelines meet. Where
    // the lane counts do not balance, the branch starts inside its neighbour: it tapers out.
    if (d < 0.5 && overlap > 0.05) cap = 0;
    const facing = leftOwns ? 'inner' : 'outer';
    if (overlap > 0.02 || (overlap > -0.02 && row.joined?.[facing] === 'none')) {
      // Moved here, or already moved to abut on an earlier pass. What the push could not take
      // out (a shared option lane, tapering out at 1:10) stays under the owner: covered.
      const m = overlap > 0.02 ? push(ribbon, row, u, t, cap === Infinity ? Infinity : PUSH_SLOPE * d) : 0;
      cover(row, facing, overlap - Math.abs(m));
      row.joined = { ...row.joined, [facing]: 'none', [facing + 'With']: owner.ribbon };
      parted = d;
      clear = 0;
      edgeOfMinor.length = edgeOfOwner.length = 0;
      continue;
    }
    // Parted: collect the gore wedge until the edges are a lane apart.
    if (-overlap < GORE_GAP_M && d - parted < GORE_MAX_M) {
      const q = leftOwns ? row.inner : row.outer;
      edgeOfMinor.push(q);
      edgeOfOwner.push([q[0] + u[0] * t, q[1] + u[1] * t]);
    }
    if (d > BLEND_M && ++clear >= 3 && (-overlap >= GORE_GAP_M || d - parted >= GORE_MAX_M)) break;
  }
  // The owner draws the shared edge as one dashed lane line up to where the edges part.
  for (const { row, d } of ownerRows) {
    if (d > parted) break;
    if (parted > 0) row.joined = { ...row.joined, [leftOwns ? 'outer' : 'inner']: 'dash', [(leftOwns ? 'outer' : 'inner') + 'With']: minor.ribbon };
  }
  if (edgeOfMinor.length > 1) gores.push({ joint, left: left.ribbon, right: right.ribbon, ring: [...edgeOfMinor, ...edgeOfOwner.reverse()] });
}
function separateSiblings() {
for (const [key, joint] of joints)
  for (const [side, forward] of [[joint.outgoing, true], [joint.incoming, false]] as const) {
    if (side.length < 2 || side.some(e => e.ribbon.kind === 'tunnel')) continue;
    // Left to right across the carriageway, 16 m from the node along each branch.
    const lateral = (e: End) => {
      const ref = side[0].ribbon, f = frame(ref, forward ? 0 : ref.line.length);
      const p = e.ribbon.line.at(forward ? Math.min(16, e.ribbon.line.length) : Math.max(0, e.ribbon.line.length - 16));
      return (p.x - f.x) * f.rx + (p.z - f.z) * f.rz;
    };
    const ordered = side.slice().sort((a, b) => a.offset - b.offset || lateral(a) - lateral(b));
    for (let i = 1; i < ordered.length; i++) separate(key, ordered[i - 1], ordered[i], forward);
  }
}

/** Distance along a ribbon to its nearest end at a real joint (a plain chain node is not fixed). */
function fixedDistance(r: Ribbon, s: number) {
  const fixed = (p: P2) => { const j = joints.get(p.join(',')); return !j || j.incoming.length !== 1 || j.outgoing.length !== 1; };
  return Math.min(fixed(r.pts[0]) ? s : Infinity, fixed(r.pts.at(-1)!) ? r.line.length - s : Infinity);
}
function separateParallel() {
// Same-direction neighbours at grade that share no node (a ramp's upstream piece beside the
// mainline before their joint): the same rule, row by row, with no gore. Only ground pairs:
// two OSM bridges side by side may be at different levels (the stacked ramps).
for (const minor of ribbons) {
  if (minor.kind !== 'ground') continue;
  const near = new Set<Ribbon>();
  for (const p of minor.pts) for (const r of index.at(...p)) near.add(r);
  for (const owner of near) {
    if (owner === minor || owner.kind !== 'ground' || !owns(owner, minor) || owns(minor, owner) && owner.id > minor.id) continue;
    // Pieces that meet at a node (a chain, or siblings already separated above) are not parallel.
    const ends = (r: Ribbon) => [r.pts[0].join(','), r.pts.at(-1)!.join(',')];
    if (ends(owner).some(e => ends(minor).includes(e))) continue;
    const inner = owner.rows.map(q => q.inner), outer = owner.rows.map(q => q.outer);
    for (const row of minor.rows) {
      const len = Math.hypot(row.outer[0] - row.inner[0], row.outer[1] - row.inner[1]);
      if (len < 1e-6) continue;
      const u: P2 = [(row.outer[0] - row.inner[0]) / len, (row.outer[1] - row.inner[1]) / len];
      const mid = mix(row.inner, row.outer, 0.5), nearest = alongOn(owner, mid);
      if (nearest.distance > 40) continue;
      const f = owner.line.at(nearest.s), t0 = minor.line.at(row.s);
      if (f.dx * t0.dx + f.dz * t0.dz < 0.9) continue;
      // Right of the owner (frame(): right is (-dz, dx)) faces its outer edge, left its inner.
      const right = (mid[0] - f.x) * -f.dz + (mid[1] - f.z) * f.dx > 0;
      const t = crossing(right ? row.inner : row.outer, u, right ? outer : inner, 40);
      if (t === undefined || (right ? t : -t) <= 0.02) continue;
      const m = push(minor, row, u, t, PARALLEL_SLOPE * fixedDistance(minor, row.s));
      cover(row, right ? 'inner' : 'outer', Math.abs(t) - Math.abs(m));
      row.joined = { ...row.joined, [right ? 'inner' : 'outer']: 'none', [(right ? 'inner' : 'outer') + 'With']: owner };
      // The owner's facing edge here becomes the one dashed line.
      const o = sectionIndex(owner, nearest.s);
      for (const q of [owner.rows[o], owner.rows[o + 1]].filter(Boolean)) q.joined = { ...q.joined, [right ? 'outer' : 'inner']: 'dash', [(right ? 'outer' : 'inner') + 'With']: minor };
    }
  }
}
}
// A ramp beside its mainline is moved first, then each sibling pair from its node. One move
// can press a branch into another (a link pushed off its mainline into its own sibling), so
// the passes repeat until nothing moves.
for (let pass = 0; pass < 4; pass++) {
  moved = 0;
  gores.length = 0;
  separateParallel();
  separateSiblings();
  if (!moved) break;
}
// Pieces of one road pushed separately meet again exactly at their chain node.
for (const joint of joints.values()) {
  if (joint.incoming.length !== 1 || joint.outgoing.length !== 1) continue;
  const into = joint.incoming[0].ribbon, from = joint.outgoing[0].ribbon;
  if (into.lanes !== from.lanes || into.kind === 'tunnel' || from.kind === 'tunnel') continue;
  const a = into.rows.at(-1)!, b = from.rows[0];
  if (!pushed.has(a) && !pushed.has(b)) continue;
  for (const k of ['inner', 'outer'] as const) a[k] = b[k] = mix(a[k], b[k], 0.5);
}

/** The shared-edge treatment at distance s (from the row at or before s), or undefined. */
export function joinedAt(r: Ribbon, s: number, side: 'inner' | 'outer') {
  return r.rows[sectionIndex(r, s)]?.joined?.[side];
}
/** The sibling that shares this edge at distance s, if any. */
export function joinedWith(r: Ribbon, s: number, side: 'inner' | 'outer') {
  const j = r.rows[sectionIndex(r, s)]?.joined;
  return side === 'inner' ? j?.innerWith : j?.outerWith;
}

export function sectionAt(r: Ribbon, s: number): Section {
  const rows = r.rows;
  let lo = 0,
    hi = rows.length - 1;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (rows[m].s <= s) lo = m;
    else hi = m;
  }
  const a = rows[lo],
    b = rows[hi],
    t = Math.max(0, Math.min(1, (s - a.s) / (b.s - a.s || 1)));
  const row: Section = { s, inner: mix(a.inner, b.inner, t), outer: mix(a.outer, b.outer, t) };
  if (a.covered || b.covered) {
    const at = (k: 'inner' | 'outer') => (a.covered?.[k] ?? 0) * (1 - t) + (b.covered?.[k] ?? 0) * t;
    row.covered = { inner: at('inner'), outer: at('outer') };
  }
  return row;
}

const mainline = (direction: ConnectorDirection) => ribbons
  .filter((r): r is Ribbon & { station0: number } => r.direction === direction && r.station0 !== undefined)
  .sort((a, b) => b.station0 - a.station0);
const carriageways = { northbound: mainline('northbound'), southbound: mainline('southbound') };

/** Half-open mainline interval in metres of travel from that direction's
 * Georgia State origin. At a source junction the downstream ribbon owns s. */
export function connectorSectionAtStation(direction: ConnectorDirection, stationM: number) {
  const ways = carriageways[direction];
  if (stationM >= ways[0].station0 + ways[0].line.length) return undefined;
  const ribbon = ways.find(r => stationM >= r.station0);
  if (ribbon) return { ribbon, section: sectionAt(ribbon, stationM - ribbon.station0) };
}

/** Match the carrying axis and travel direction, including separately mapped HOV lanes. */
export function matchRibbon(a: P2, b: P2, link: boolean, kind?: Kind) {
  const mid = mix(a, b, 0.5),
    dx = b[0] - a[0],
    dz = b[1] - a[1],
    length = Math.hypot(dx, dz);
  let best = 2.5,
    found: Ribbon | undefined;
  for (const r of index.at(...mid)) {
    if (r.link !== link || (kind && r.kind !== kind)) continue;
    const near = alongOn(r, mid),
      p = r.line.at(near.s);
    if (near.distance >= best || dx * p.dx + dz * p.dz < 0.94 * length) continue;
    found = r;
    best = near.distance;
  }
  return found;
}
