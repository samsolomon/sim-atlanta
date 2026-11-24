import type { InstancedMesh } from 'three';
import { expect,it } from 'vitest';
import { Line } from '../vignette/geom';
import { sceneToLonLat } from '../core/places';
import type { RoutesFile,TrainState } from '../model/types';
import type { TrafficCourse } from './road-traffic';
import { ArterialTraffic } from './arterial-traffic';
import { cityRoadHeight } from './road-height';
import { streetcarTraffic } from './streetcar-traffic';

const origin={lon:-84.3916,lat:33.7539};
const rf={paths:[{id:'tram',routeId:'marta:route:STREETCAR',coords:[...sceneToLonLat(origin,0,0),...sceneToLonLat(origin,300,0)],cum:[0,300]}]} as unknown as RoutesFile;
const state=(s=60)=>({id:'t',routeId:'marta:route:STREETCAR',pathId:'tram',s:{value:s,tier:'scheduled'}} as TrainState);
const course=(pts:[number,number][]):TrafficCourse=>({line:new Line(pts),roads:pts.slice(1).map(()=>({pts,cls:'secondary',name:'Test street',bridge:false,tunnel:false})),dailyFlow:10000,speedMps:10,truckShare:0});

it('projects scheduled rear and front positions onto the same lane',()=>{
  const bind=streetcarTraffic(rf,origin,()=>[state()],()=>0,()=>0);
  const blocks=bind(course([[0,0],[300,0]]))!(0);
  expect(blocks).toHaveLength(1);
  expect(blocks[0].rear).toBeCloseTo(47.945,2);
  expect(blocks[0].front).toBeCloseTo(72.055,2);
});
it('excludes adjacent lanes, opposing traffic, crossings and an overhead road',()=>{
  const bind=streetcarTraffic(rf,origin,()=>[state()],()=>0,()=>0);
  for(const pts of [[[0,3.3],[300,3.3]],[[300,0],[0,0]],[[60,-100],[60,100]]] as [number,number][][])
    expect(bind(course(pts))).toBeUndefined();
  expect(streetcarTraffic(rf,origin,()=>[state()],()=>0,()=>8)(course([[0,0],[300,0]]))).toBeUndefined();
});
it('does not invent a historical blocker for absent or live-only states',()=>{
  const c=course([[0,0],[300,0]]);
  expect(streetcarTraffic(rf,origin,()=>[],()=>0,()=>0)(c)!(0)).toEqual([]);
  expect(streetcarTraffic(rf,origin,()=>[{...state(),s:{value:60,tier:'live'}} as TrainState],()=>0,()=>0)(c)!(0)).toEqual([]);
});
it('shares historical samples across courses and evicts beyond its bounded cache',()=>{
  let calls=0;
  const bind=streetcarTraffic(rf,origin,()=>{calls++;return [state()];},()=>0,()=>0);
  const a=bind(course([[0,0],[300,0]]))!,b=bind(course([[0,1],[300,1]]))!;
  a(0);b(0);expect(calls).toBe(1);
  for(let t=1;t<=2400;t++)a(t);
  expect(calls).toBe(2401);b(0);expect(calls).toBe(2402);
});
it('retains a complete long-course replay rather than thrashing a shorter FIFO',()=>{
  let calls=0;
  const bind=streetcarTraffic(rf,origin,()=>{calls++;return [state()];},()=>0,()=>0);
  const sample=bind(course([[0,0],[20000,0]]))!;
  for(let i=0;i<3000;i++)sample(i/2);
  const first=calls;
  for(let i=0;i<3000;i++)sample(i/2);
  expect(calls).toBe(first);
  expect(bind(course([[0,0],[40000,0]]))).toBeUndefined();
});

it('uses the final carrying segment when a tram projects exactly onto the course endpoint',()=>{
  const c=course([[0,0],[60,0]]);
  const height=cityRoadHeight({roads:c.roads} as Parameters<typeof cityRoadHeight>[0],()=>0);
  const bind=streetcarTraffic(rf,origin,()=>[state(49)],()=>0,height);
  expect(bind(c)!(0)[0].front).toBe(60);
  expect(bind({...c,roads:[]})).toBeUndefined();
});

it('updates arterial queues throughout a full day including 21:00 and backward clock seeks',()=>{
  const c=course([[0,0],[60,0]]),road=c.roads[0];
  const city={bounds:{minX:-10,maxX:70,minZ:-10,maxZ:10},roads:[road],rail:[],buildings:[]};
  const height=cityRoadHeight(city,()=>0);
  const make=()=>new ArterialTraffic({city,quality:'low',roadHeight:height,
    hourly:{weekday:Array(24).fill(1/24),weekend:Array(24).fill(1/24)},
    arterials:[{id:'endpoint',runs:[{road,from:'a',to:'b',allow:'forward',
      lanes:{forward:1},aadt:{forward:80000,reverse:0},truckShare:0,speedMph:24}]}],
    movingBlocks:streetcarTraffic(rf,origin,()=>[state(49)],()=>0,height)});
  const fleet=make(),fresh=make(),start=Date.parse('2026-11-20T00:00:00-05:00');
  try {
    for(let minute=0;minute<24*60;minute+=5){
      fleet.update(start+minute*60000,0);
      expect(fleet.visibleCars).toBeGreaterThan(0);
    }
    const target=start+21*3600000+125;
    const snapshot=()=>fleet.group.children.map(o=>Array.from((o as InstancedMesh).instanceMatrix.array.slice(0,(o as InstancedMesh).count*16)));
    fleet.update(target,0);const first=snapshot();
    fleet.update(start+23*3600000,0);fleet.update(start,0);fleet.update(target,0);
    expect(snapshot()).toEqual(first);
    fresh.update(target,0);
    expect(snapshot()).toEqual(fresh.group.children.map(o=>Array.from((o as InstancedMesh).instanceMatrix.array.slice(0,(o as InstancedMesh).count*16))));
  } finally {fleet.dispose();fresh.dispose();}
});
