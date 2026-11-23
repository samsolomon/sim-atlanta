import { Line, type P2 } from '../vignette/geom';
import type { TrafficCourse } from './road-traffic';
import type { ArterialCorridor } from './arterial-traffic-routes';
import { clusterSignals, courseSignals, withSignals } from './traffic-signals';

/** Illustrative share of incoming flow, not measured turning counts. */
export const TURN_SHARE = .15;
type Arm = { course: TrafficCourse; s: number; node: string; point: P2 };

/** Derive directed arms from resolved courses, which already enforce one-way travel.
 * Only mapped, signalised shared nodes receive turns. No coordinate-only joins. */
export function arterialTurns(courses: TrafficCourse[], corridors: readonly ArterialCorridor[], points: readonly P2[]) {
  const incoming: Arm[] = [], outgoing: Arm[] = [];
  for (const course of courses) {
    if (course.closed) continue;
    for (const corridor of corridors) for (const run of corridor.runs) {
      const indices = course.roads.flatMap((r, i) => r === run.road ? [i] : []);
      if (!indices.length) continue;
      const first = indices[0], last = indices.at(-1)! + 1;
      const a = run.road.pts[0], b = run.road.pts.at(-1)!;
      const start = course.line.pts[first];
      const forward = Math.hypot(start[0]-a[0], start[1]-a[1]) < Math.hypot(start[0]-b[0], start[1]-b[1]);
      outgoing.push({ course, s: course.line.cum[first], node: forward ? run.from : run.to, point: forward ? a : b });
      incoming.push({ course, s: course.line.cum[last], node: forward ? run.to : run.from, point: forward ? b : a });
    }
  }
  const clusters = clusterSignals(points);
  const approachStops = new Map(courses.map(c => [c, courseSignals(c.line, clusters)]));
  const turns = new Map<TrafficCourse, TrafficCourse[]>();
  for (const a of incoming) for (const b of outgoing) {
    if (a.course === b.course || a.node !== b.node || Math.hypot(a.point[0]-b.point[0],a.point[1]-b.point[1]) > .5) continue;
    const controller = clusters.reduce<(typeof clusters)[number] | undefined>((best,c) =>
      Math.hypot(c.x-a.point[0],c.z-a.point[1]) < Math.min(20, best ? Math.hypot(best.x-a.point[0],best.z-a.point[1]) : Infinity) ? c : best, undefined);
    if (!controller || a.s < 35 || b.course.line.length-b.s < 35) continue;
    // Share the through controller. A twin-light merge may have dropped this
    // controller from the approach; skip that ambiguous junction.
    const approachStop = approachStops.get(a.course)!.find(s => s.key === controller.key);
    if (!approachStop) continue;
    // One speed per course: do not introduce slower traffic into a shared lane.
    if (Math.abs(a.course.speedMps-b.course.speedMps) > .1) continue;
    const entry = a.course.line.at(a.s-10), exit = b.course.line.at(b.s+10);
    const dot = entry.dx*exit.dx + entry.dz*exit.dz;
    if (Math.abs(dot) > .5) continue; // 60–120 degree turns only; no U-turns or shallow forks
    const pts: P2[] = [], roads: TrafficCourse['roads'] = [];
    const append = (p: P2, road: TrafficCourse['roads'][number]) => {
      if (pts.length) roads.push(road);
      pts.push(p);
    };
    const sample = (c: TrafficCourse, s: number) => {
      const p = c.line.at(s);
      append([p.x,p.z],c.roads[Math.min(c.roads.length-1,Math.floor(c.line.vertexAt(Math.max(0,s-1e-6))))]);
    };
    const start = 0, end = b.course.line.length;
    sample(a.course,start);
    for (let i=1;i<a.course.line.pts.length;i++) if (a.course.line.cum[i]>start && a.course.line.cum[i]<a.s-10)
      append(a.course.line.pts[i],a.course.roads[i-1]);
    sample(a.course,a.s-10);
    const stopS = Math.min(approachStop.s, new Line(pts).length-2);
    // Cubic tangents follow the incoming and outgoing lanes. Eight short segments
    // keep vehicle axles and their source surfaces continuous around the corner.
    const c1: P2 = [entry.x+entry.dx*7,entry.z+entry.dz*7];
    const c2: P2 = [exit.x-exit.dx*7,exit.z-exit.dz*7];
    for (let i=1;i<=8;i++) {
      const t=i/8,u=1-t;
      append([u*u*u*entry.x+3*u*u*t*c1[0]+3*u*t*t*c2[0]+t*t*t*exit.x,
        u*u*u*entry.z+3*u*u*t*c1[1]+3*u*t*t*c2[1]+t*t*t*exit.z],
      i<=4 ? a.course.roads[Math.max(0,Math.ceil(a.course.line.vertexAt(a.s))-1)] : b.course.roads[Math.floor(b.course.line.vertexAt(b.s))]);
    }
    for (let i=1;i<b.course.line.pts.length;i++) if (b.course.line.cum[i]>b.s+10 && b.course.line.cum[i]<end)
      append(b.course.line.pts[i],b.course.roads[i-1]);
    sample(b.course,end);
    const turn: TrafficCourse = { line:new Line(pts),roads,speedMps:a.course.speedMps,dailyFlow:0,truckShare:a.course.truckShare,
      offstageM:3*a.course.speedMps,fadeStartM:a.course.fadeStartM,fadeEndM:b.course.fadeEndM,
      turnSignal:{key:controller.key,s:stopS,dx:entry.dx,dz:entry.dz} };
    const list=turns.get(a.course) ?? []; list.push(turn); turns.set(a.course,list);
  }
  const result: TrafficCourse[] = [];
  for (const c of courses) {
    const list=turns.get(c) ?? [];
    result.push({...c,dailyFlow:c.dailyFlow*(list.length ? 1-TURN_SHARE : 1)});
    for (const t of list) {
      t.dailyFlow=c.dailyFlow*TURN_SHARE/list.length;
      result.push(t);
    }
  }
  // Reference axes must be established by straight courses before curved ones.
  return withSignals([...result.filter(c=>!c.turnSignal),...result.filter(c=>c.turnSignal)],points);
}
