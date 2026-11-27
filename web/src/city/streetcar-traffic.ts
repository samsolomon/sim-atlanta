import type { RoutesFile, TrainState } from '../model/types';
import { S70_LENGTH } from '../vignette/streetcar';
import { type Line } from '../vignette/geom';
import { alongAt, pointAlong, streetcarPaths } from './streetcar-cars';
import { STREETCAR_ROUTE } from './streetcar';
import { MOVING_QUEUE_WAIT_S, type MovingBlock, type MovingBlocks } from './traffic-queues';
import { SIGNAL_MAX_WAIT_S } from './traffic-signals';
import type { TrafficCourse } from './road-traffic';

export const TRAFFIC_EPOCH_MS = Date.UTC(2026,0,1);
const MAX_CACHE_SAMPLES = 7200;
type Point = {x:number;z:number;dx:number;dz:number;y:number};
type Tram = {rear:Point;front:Point};

/** A same-direction lane projection, never a crossing road or the next lane. */
export function streetcarProjection(line: Line, point: Point, height: (s:number)=>number|null) {
  let best: {s:number;distance:number}|undefined;
  for(let i=1;i<line.pts.length;i++) {
    const a=line.pts[i-1],b=line.pts[i],dx=b[0]-a[0],dz=b[1]-a[1];
    const length=Math.hypot(dx,dz);
    if(!length || (dx*point.dx+dz*point.dz)/length<.85)continue;
    const f=Math.max(0,Math.min(1,((point.x-a[0])*dx+(point.z-a[1])*dz)/(length*length)));
    const distance=Math.hypot(point.x-a[0]-f*dx,point.z-a[1]-f*dz);
    if(distance>=2.4 || best && distance>=best.distance)continue;
    const s=line.cum[i-1]+f*length,y=height(s);
    if(y===null || !Number.isFinite(y) || Math.abs(y-point.y)>=2.5)continue;
    best={s,distance};
  }
  return best?.s;
}

/** Historical streetcar poses are timetable data, independent of draw order or
 * frames visited. The bounded cache is shared by all downtown arterial courses. */
export function streetcarTraffic(rf: RoutesFile, origin:{lon:number;lat:number},
  statesAt:(clockMs:number)=>readonly TrainState[], streetHeight:(x:number,z:number)=>number|null,
  roadHeight:(x:number,z:number,road:TrafficCourse['roads'][number])=>number|null) {
  const paths=streetcarPaths(rf,origin);
  const cache=new Map<number,Tram[]>();
  let cacheSamples=2400;
  const posesAt=(seconds:number)=>{
    const saved=cache.get(seconds);if(saved)return saved;
    const poses:Tram[]=[];
    for(const state of statesAt(TRAFFIC_EPOCH_MS+seconds*1000)) {
      if(state.routeId!==STREETCAR_ROUTE || state.s.tier==='live')continue;
      const path=paths.get(state.pathId);if(!path)continue;
      const s=alongAt(path,state.s.value);
      const rear=pointAlong(path,s-S70_LENGTH/2),front=pointAlong(path,s+S70_LENGTH/2);
      const ry=streetHeight(rear.x,rear.z),fy=streetHeight(front.x,front.z);
      if(ry===null || fy===null)continue;
      poses.push({rear:{...rear,y:ry},front:{...front,y:fy}});
    }
    cache.set(seconds,poses);
    if(cache.size>cacheSamples)cache.delete(cache.keys().next().value!);
    return poses;
  };
  return (course:TrafficCourse):MovingBlocks|undefined=>{
    if(course.closed)return;
    const height=(s:number)=>{
      // A projection may land exactly on the final vertex, which has no outgoing segment.
      const p=course.line.at(s),road=course.roads[Math.min(course.roads.length-1,Math.floor(course.line.vertexAt(s)))];
      return road ? roadHeight(p.x,p.z,road) : null;
    };
    // Bind only courses with a same-level parallel overlap. Sample the rail at
    // 5 m spacing once, not every road and rail segment on every frame.
    let shared=false;
    for(const {line} of paths.values()) {
      for(let s=0;s<=line.length;s+=5) {
        const p=line.at(s),y=streetHeight(p.x,p.z);
        if(y!==null && streetcarProjection(course.line,{...p,y},height)!==undefined){shared=true;break;}
      }
      if(shared)break;
    }
    if(!shared)return;
    // Retain the longest complete slot period plus one minute of margin. A
    // smaller FIFO cache thrashes when a cohort replays past its oldest entry.
    const period=(course.line.length+(course.offstageM ?? 0))/course.speedMps
      +(course.signals?.length ?? 0)*(SIGNAL_MAX_WAIT_S+30)+MOVING_QUEUE_WAIT_S;
    const required=Math.ceil(period*2)+120;
    if(required>MAX_CACHE_SAMPLES)return; // pathological long courses keep skip-draw
    cacheSamples=Math.max(cacheSamples,required);
    return seconds=>{
      const blocks:MovingBlock[]=[];
      for(const pose of posesAt(seconds)) {
        const rear=streetcarProjection(course.line,pose.rear,height);
        const front=streetcarProjection(course.line,pose.front,height);
        if(rear===undefined || front===undefined || front<=rear || front-rear>S70_LENGTH*1.5)continue;
        blocks.push({rear,front});
      }
      return blocks;
    };
  };
}
