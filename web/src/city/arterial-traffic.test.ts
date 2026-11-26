import { describe, expect, it, vi } from 'vitest';
import { InstancedMesh, Matrix4, Vector3 } from 'three';
import type { P2 } from '../vignette/geom';
import type { VRoad } from '../vignette/world';
import { ArterialTraffic, ARTERIAL_TRAFFIC_CAP } from './arterial-traffic';
import { arterialTrafficRoutes, type ArterialCorridor } from './arterial-traffic-routes';

type Run = ArterialCorridor['runs'][number];
const road = (pts: P2[], bridge = false): VRoad => ({pts,bridge,tunnel:false,cls:'secondary',name:'Example St'});
const run = (road: VRoad, from: string, to: string, props: Partial<Run> = {}): Run =>
  ({road,from,to,allow:'both',lanes:{forward:1,reverse:1},aadt:{forward:12000,reverse:12000},
    truckShare:.06,speedMph:24,...props});
const bounds = {minX:-510,maxX:510,minZ:-250,maxZ:250};
const city = {bounds,roads:[],rail:[],buildings:[]};
const left = road([[-500,0],[0,0]]), right = road([[.12,0],[250,0],[500,0]],true);
const corridor = {id:'example',runs:[run(left,'A','B'),run(right,'B','C')]};
const hourly = {weekday:Array(24).fill(1/24),weekend:Array(24).fill(1/24)};
const noon = Date.parse('2026-11-20T12:00:00-05:00');
const base = {city,arterials:[corridor],hourly,roadHeight:()=>1,quality:'high' as const};
const flows = (runs: Run[]) => arterialTrafficRoutes([{id:'test',runs}],bounds);

describe('arterial vehicle courses', () => {
  it('traverses a mapped node once, follows the right side and preserves each original surface owner', () => {
    const [f,r] = arterialTrafficRoutes([corridor],bounds);
    expect(f.line.pts).toEqual([[-500,2],[.06,2],[250,2],[500,2]]);
    expect(r.line.pts).toEqual([[500,-2],[250,-2],[.06,-2],[-500,-2]]);
    expect(f.roads).toEqual([left,right,right]);
    expect(f.roads[1]).toBe(right);
    expect(r.roads.at(-1)).toBe(left);
    expect(f.dailyFlow).toBeCloseTo(12000);
    expect(r.dailyFlow).toBeCloseTo(12000);
  });

  it('uses already-directional volumes and the permitted point order even on a reverse-only street', () => {
    const [route] = flows([run(left,'a','b',{allow:'reverse',aadt:{forward:0,reverse:9500}})]);
    expect(route.dailyFlow).toBe(9500);
    expect(route.line.pts).toEqual([[0,0],[-500,0]]);
    expect(flows([run(left,'a','b',{aadt:{forward:NaN,reverse:0}})])).toEqual([]);
    expect(flows([run(left,'a','b',{lanes:{}})])).toHaveLength(2);
    expect(flows([run(left,'a','b',{lanes:{forward:1,reverse:0}})])).toHaveLength(2);
  });

  it('keeps disjoint endpoints, ambiguous forks, distinct corridors and perpendicular turns apart', () => {
    const incoming = run(left,'a','j',{allow:'forward'});
    const out = (pts: P2[],to: string,from='j') => run(road(pts),from,to,{allow:'forward'});
    expect(flows([incoming,out([[.6,0],[80,0]],'b')])).toHaveLength(2);
    expect(flows([incoming,out([[0,0],[80,0]],'b','different-node')])).toHaveLength(2);
    expect(flows([incoming,out([[0,0],[0,80]],'b')])).toHaveLength(2);
    expect(flows([incoming,out([[0,0],[80,5]],'b'),out([[0,0],[80,-5]],'c')])).toHaveLength(3);
    const separate = [{id:'a',runs:[incoming]}, {id:'b',runs:[out([[0,0],[80,0]],'b')]}];
    expect(arterialTrafficRoutes(separate,bounds)).toHaveLength(2);
    for (const course of arterialTrafficRoutes(separate,bounds)) {
      expect(course.offstageM).toBeGreaterThan(course.speedMps*2);
      expect(course.fadeStartM).toBeGreaterThan(0);
      expect(course.fadeEndM).toBeGreaterThan(0);
    }
  });

  it('runs a closed circuit through its seam and weights changing demand by traversal time', () => {
    const points: P2[] = Array.from({length:12},(_,i) => [Math.cos(i*Math.PI/6)*70,Math.sin(i*Math.PI/6)*70]);
    const loop = points.map((p,i)=>run(road([p,points[(i+1)%12]]),String(i),String((i+1)%12),
      {allow:'forward',aadt:{forward:i%2 ? 8000 : 4000,reverse:0}}));
    const [course] = flows(loop);
    expect(course.closed).toBe(true);
    expect(course.line.pts[0]).toEqual(course.line.pts.at(-1));
    expect(course.offstageM).toBe(0);
    expect(course.dailyFlow).toBeCloseTo(6000);
  });
});

const snapshot = (fleet: ArterialTraffic) => fleet.group.children.map(obj => {
  const mesh = obj as InstancedMesh;
  return [...mesh.instanceMatrix.array.slice(0,mesh.count*16)];
});

it.each(['low','high'] as const)('draws repeatable %s traffic within its cap and draw-call budget', quality => {
  const fleet = new ArterialTraffic({...base, quality});
  fleet.update(noon,.5);
  const first = snapshot(fleet);
  expect(fleet.visibleCars).toBeGreaterThan(0);
  expect(fleet.visibleCars).toBeLessThanOrEqual(ARTERIAL_TRAFFIC_CAP[quality]);
  // One instanced draw per vehicle kind: low keeps sedan, SUV and box truck; high adds hatch, pickup (both
  // trims from one mesh), van and semi.
  expect(fleet.group.children.length).toBeLessThanOrEqual(quality === 'low' ? 3 : 7);
  expect(fleet.group.userData.positionTier).toBe('illustrative');
  fleet.update(noon+7000,1);
  expect(snapshot(fleet)).not.toEqual(first);
  fleet.update(noon,.2);
  expect(snapshot(fleet)).toEqual(first);
  fleet.dispose();
  expect(fleet.group.children.length).toBe(0);
});

it('samples the carrying deck for each vehicle, pitches to its surface and yields to buses', () => {
  const bridge = (x: number, _z: number, r: VRoad) => r===right ? 2+x*.05 : null;
  const bus = vi.fn(()=>false);
  const fleet = new ArterialTraffic({...base,roadHeight:bridge,busOccupies:bus});
  fleet.update(noon,.2);
  expect(fleet.visibleCars).toBeGreaterThan(0);
  const matrix = new Matrix4(), p = new Vector3(), body = new Vector3();
  for (const obj of fleet.group.children) {
    const mesh = obj as InstancedMesh;
    for (let i=0; i<mesh.count; i++) {
      mesh.getMatrixAt(i,matrix);
      p.setFromMatrixPosition(matrix);
      expect(p.x).toBeGreaterThan(0);
      expect(p.y).toBeCloseTo(2+p.x*.05+.03,4);
      body.setFromMatrixColumn(matrix,2);
      expect(body.y/body.x).toBeCloseTo(.05,4);
    }
  }
  bus.mockReturnValue(true);
  fleet.update(noon,.2);
  expect(fleet.visibleCars).toBe(0);
  expect(bus).toHaveBeenCalled();
  fleet.dispose();
});

it('draws zero cars with no resolved corridors or no usable hourly profile', () => {
  for (const opts of [{...base,arterials:undefined},{...base,hourly:{weekday:[],weekend:[]}}]) {
    const fleet = new ArterialTraffic(opts);
    fleet.update(noon,0);
    expect(fleet.visibleCars).toBe(0);
    expect(fleet.group.children).toHaveLength(0);
    fleet.dispose();
  }
});

it('fades a single vehicle at an interior end and leaves a gap before its next trip', () => {
  const entry = run(road([[0,0],[100,0]]),'a','b',{allow:'forward',aadt:{forward:7500,reverse:0}});
  const fleet = new ArterialTraffic({...base,arterials:[{id:'one',runs:[entry]}]});
  const visible: {t: number; x: number; opacity: number}[] = [];
  for (let t=0; t<30000; t+=100) {
    fleet.update(noon+t,0);
    for (const obj of fleet.group.children) {
      const mesh = obj as InstancedMesh;
      if (!mesh.count) continue;
      expect(mesh.count).toBe(1);
      visible.push({t,x:mesh.instanceMatrix.array[12],opacity:mesh.geometry.getAttribute('tripOpacity').getX(0)});
    }
  }
  let restarts = 0;
  for (let i=1; i<visible.length; i++) {
    const prev = visible[i-1], next = visible[i];
    if (next.x < prev.x) {
      expect(next.t-prev.t).toBeGreaterThan(3000);
      expect(Math.max(prev.opacity,next.opacity)).toBeLessThan(.15);
      restarts++;
    } else {
      expect(next.x-prev.x).toBeCloseTo(24*.44704*.1,3);
    }
  }
  expect(restarts).toBeGreaterThan(0);
  fleet.dispose();
});


it('recomputes hourly demand when seeking within the same minute', () => {
  const hourly={weekday:Array.from({length:24},(_,h)=>h===12?1:0),weekend:Array(24).fill(0)};
  const fleet=new ArterialTraffic({...base,hourly});
  const fresh=new ArterialTraffic({...base,hourly});
  fleet.update(noon+59000,0);
  fleet.update(noon+1000,0);
  fresh.update(noon+1000,0);
  expect(snapshot(fleet)).toEqual(snapshot(fresh));
  fleet.dispose(); fresh.dispose();
});

it('draws a moving-obstacle queue and reproduces it after clock seeks',()=>{
  const corridor={id:'queue',runs:[run(road([[0,0],[500,0]]),'a','b',{allow:'forward',aadt:{forward:80000,reverse:0}})]};
  const opts={...base,arterials:[corridor],movingBlocks:()=>()=>[{rear:250,front:274}]};
  const fleet=new ArterialTraffic(opts),fresh=new ArterialTraffic(opts);
  fleet.update(noon,0);
  expect(fleet.visibleCars).toBeGreaterThan(2);
  for(const obj of fleet.group.children){
    const mesh=obj as InstancedMesh;
    for(let i=0;i<mesh.count;i++)expect(mesh.instanceMatrix.array[i*16+12]).toBeLessThan(248);
  }
  fleet.update(noon+120000,0);fleet.update(noon+125,0);fresh.update(noon+125,0);
  expect(snapshot(fleet)).toEqual(snapshot(fresh));
  fleet.dispose();fresh.dispose();
});

it('gives every traffic mesh per-instance colour from construction, so prewarm compiles the drawn program', () => {
  // core/prewarm.ts draws never-drawn meshes at boot. A mesh without instanceColor then compiles a
  // program without USE_INSTANCING_COLOR, and the first coloured car compiles a second one.
  for (const quality of ['low', 'high'] as const) {
    const fleet = new ArterialTraffic({...base, quality});
    const meshes = fleet.group.children.filter((o): o is InstancedMesh => (o as InstancedMesh).isInstancedMesh && !o.name.startsWith('Signal'));
    expect(meshes.length).toBeGreaterThan(0);
    for (const mesh of meshes) expect(mesh.instanceColor, mesh.name).not.toBeNull();
    fleet.dispose();
  }
});
