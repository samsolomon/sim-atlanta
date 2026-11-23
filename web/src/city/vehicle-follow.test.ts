import { describe, expect, it } from 'vitest';
import type { RailData } from '../core/scene-data';
import tunnelRuns from './fixtures/midtown-tunnel.json';
import { BoxGeometry, Mesh, MeshBasicMaterial, Plane, Vector3 } from 'three';
import { CAR_LENGTH } from '../vignette/cq400';
import { NORTH_LINE_VANISH_DEPTH } from './midtown-marta-rail';
import { drawnCar, inMappedTunnel, needsHandoff, pickHandoff, trainHidden, VehicleFollow, type Fix, type Followed } from './vehicle-follow';

const bounds = {minX:0,maxX:500,minZ:0,maxZ:100};
const train: Followed = {kind:'train',id:'trip-1',pathId:'blue-east',tier:'scheduled'};
const car = (x: number) => ({x,z:36});
const fix = (x: number, cars: {x:number;z:number}[] = [], hidden: Fix['hidden'] = null, over: Partial<Fix> = {}): Fix =>
  ({id:train.id,pathId:train.pathId,tier:train.tier,x,z:35,cars,hidden,...over});
const rail: RailData = {version:1,datum:'track-bed',evidence:{},paths:{'blue-east':[
  {s0:0,s1:40,cover:'covered',form:'tunnel',base:'ground',rel:0,height:'schematic',ev:'fixture'}]}};

describe('vehicle follow', () => {
  it('follows the same trip through the last car, full cover and first car of the next opening', () => {
    const f = new VehicleFollow(); f.start(train);
    expect(f.frame(fix(20,[car(21),car(31)]),bounds,0,false)).toEqual({x:26,z:36});
    expect(f.phase).toBe('drawn');
    const covered = f.frame(fix(60,[],'covered'),bounds,200,false)!;
    expect(f.phase).toBe('covered');
    expect(covered.x).toBeGreaterThan(26);
    expect(covered.x).toBeLessThan(60);
    const back = f.frame(fix(80,[car(72)]),bounds,300,false)!;
    expect(f.phase).toBe('drawn');
    expect(back.x).toBeGreaterThan(covered.x);
    expect(back.x).toBeLessThan(72);
  });

  it('tracks the source above an unmapped gap without claiming a tunnel', () => {
    const f = new VehicleFollow(); f.start(train);
    expect(f.frame(fix(20),bounds,0,false)).toEqual({x:20,z:35});
    expect(f.phase).toBe('unseen');
  });

  it('says underground only when City reports a mapped tunnel', () => {
    const f = new VehicleFollow(); f.start(train);
    f.frame(fix(20,[],'underground'),bounds,0,false);
    expect(f.phase).toBe('underground');
  });

  it('holds the camera in reduced motion until explicitly recentered, including after reacquisition', () => {
    const f = new VehicleFollow(); f.start(train);
    expect(f.frame(fix(20,[car(25)]),bounds,0,true)).toEqual({x:25,z:36});
    expect(f.frame(fix(30,[],'covered'),bounds,200,true)).toBeUndefined();
    expect(f.phase).toBe('covered');
    expect(f.frame(fix(90,[car(90)]),bounds,400,true)).toBeUndefined();
    f.recenter();
    expect(f.frame(fix(95,[car(95)]),bounds,500,true)).toEqual({x:95,z:36});
    expect(f.phase).toBe('drawn');
  });

  it('ends at the board edge after the last in-board car and stays cancelled on re-entry', () => {
    const f = new VehicleFollow(); f.start(train);
    expect(f.frame(fix(530,[car(490)]),bounds,0,false)).toBeDefined();
    expect(f.frame(fix(530,[car(510)]),bounds,200,false)).toBeUndefined();
    expect(f.phase).toBe('outside');
    expect(f.frame(fix(30,[car(30)]),bounds,300,false)).toBeUndefined();
    f.start(train); f.stop(); f.recenter();
    expect(f.active).toBe(false);
    expect(f.frame(fix(30),bounds,500,false)).toBeUndefined();
  });

  it('keeps a trip heading into an adjacent area while that area loads, and exposes the vehicle', () => {
    const f = new VehicleFollow(); f.start(train);
    expect(f.vehicle?.id).toBe(train.id);
    const joined = {...bounds,maxX:900};
    expect(f.frame(fix(560),joined,0,false)).toBeDefined();
    expect(f.phase).toBe('unseen');
    expect(f.frame(fix(560),bounds,100,false)).toBeUndefined();
    expect(f.phase).toBe('outside');
    expect(f.vehicle).toBeUndefined();
  });

  it('ends on a vanished vehicle, a different trip or path, or a data-source handover', () => {
    const f = new VehicleFollow();
    for (const changed of [null, fix(50,[],null,{id:'other'}), fix(50,[],null,{pathId:'blue-west'}),
      fix(50,[],null,{tier:'live'})]) {
      f.start(train);
      expect(f.frame(changed,bounds,0,false)).toBeUndefined();
      expect(f.phase).toBe('lost');
      expect(f.tier).toBe('scheduled');
    }
  });

  it('returns a stationary vehicle to frame after something else moved the camera', () => {
    const f = new VehicleFollow(); f.start(train);
    expect(f.frame(fix(20,[car(20)]),bounds,0,false)).toEqual({x:20,z:36});
    expect(f.frame(fix(20,[car(20)]),bounds,16,false,{x:20,z:36})).toBeUndefined();
    // An area finished loading and recentred the camera 300 m away.
    const back = f.frame(fix(20,[car(20)]),bounds,32,false,{x:320,z:36})!;
    expect(back.x).toBeLessThan(320);
    expect(back.x).toBeGreaterThanOrEqual(20);
  });

  it('ends in a gap between mounted areas, not just outside their bounding box', () => {
    const f = new VehicleFollow(); f.start(train);
    const mounted = (p: {x:number;z:number}) => p.x < 200 || p.x > 300;
    expect(f.frame(fix(150),mounted,0,false)).toBeDefined();
    expect(f.frame(fix(250),mounted,16,false)).toBeUndefined();
    expect(f.phase).toBe('outside');
  });

  it('follows a bus, which has no path, and keeps its own tier', () => {
    const f = new VehicleFollow(); f.start({kind:'bus',id:'marta:bus:1501',tier:'live'});
    const bus = {id:'marta:bus:1501',tier:'live' as const,x:40,z:50,cars:[{x:40,z:50}],hidden:null};
    expect(f.frame(bus,bounds,0,false)).toEqual({x:40,z:50});
    expect(f.phase).toBe('drawn');
    expect(f.frame({...bus,tier:'scheduled'},bounds,16,false)).toBeUndefined();
    expect(f.phase).toBe('lost');
  });
});

it('keeps accelerated playback and rewinds within eight metres of the selected consist', () => {
  const f = new VehicleFollow(); f.start(train);
  f.frame(fix(25,[car(25)]),bounds,0,false);
  const jumped = f.frame(fix(425,[car(425)]),bounds,16,false)!;
  expect(Math.abs(jumped.x-425)).toBeLessThanOrEqual(8);
  const back = f.frame(fix(25,[car(25)]),bounds,32,false)!;
  expect(Math.abs(back.x-25)).toBeLessThanOrEqual(8);
});

describe('mapped North Line tunnel', () => {
  const run = [{pts:[[0,0],[0,-100],[10,-200]]}];
  it('claims a tunnel beside the mapped way, across bends, but not past its mouth', () => {
    expect(inMappedTunnel(15,-50,20,run)).toBe(true);
    expect(inMappedTunnel(25,-50,20,run)).toBe(false);
    expect(inMappedTunnel(-12,-100,20,run)).toBe(true);
    expect(inMappedTunnel(0,10,20,run)).toBe(false);
    expect(inMappedTunnel(0,2,20,run)).toBe(true);
    expect(inMappedTunnel(11,-215,20,run)).toBe(false);
  });

  it('bakes only the Midtown tunnel, from the downtown edge to the Brookwood portal', () => {
    const zs = tunnelRuns.flatMap(r => r.pts.map(p => p[1]));
    expect(Math.max(...zs)).toBe(-1300);
    expect(Math.min(...zs)).toBeCloseTo(-5140.5, 0);
    // Midtown station sits in the tunnel; the open mains at the portal do not.
    expect(inMappedTunnel(482,-3063)).toBe(true);
    expect(inMappedTunnel(700,-5675)).toBe(false);
  });

  it('prefers downtown rail cover, then the mapped tunnel, then makes no claim', () => {
    const red = 'marta:route:RED';
    expect(trainHidden(rail,red,'blue-east',20,482,-3063)).toBe('covered');
    expect(trainHidden(rail,red,'blue-east',60,482,-3063)).toBe('underground');
    expect(trainHidden(rail,red,'blue-east',60,0,0)).toBeNull();
    // The Crescent passes beside the portal; it is never in the North Line tunnel.
    expect(trainHidden(rail,'amtrak:route:Crescent','x',60,482,-3063)).toBeNull();
  });
});

it('switches to underground exactly where the North Line portal clips the last car', () => {
  // The mouth faces +z; the portal plane keeps everything less than NORTH_LINE_VANISH_DEPTH inside it.
  const face = new Plane(new Vector3(0, 0, 1), NORTH_LINE_VANISH_DEPTH);
  const car = new Mesh(new BoxGeometry(3, 4, CAR_LENGTH), new MeshBasicMaterial({ clippingPlanes: [face] }));
  const at = (frontDepth: number) => { car.position.set(0, 0, -frontDepth - CAR_LENGTH / 2); return drawnCar(car); };
  expect(at(NORTH_LINE_VANISH_DEPTH - 0.5)).not.toBeNull();
  expect(at(NORTH_LINE_VANISH_DEPTH + 0.5)).toBeNull();
  // A car whose centre is already past the vanish point still counts while its front shows.
  expect(at(NORTH_LINE_VANISH_DEPTH - CAR_LENGTH / 2 + 1)).not.toBeNull();
  car.visible = false;
  expect(at(0)).toBeNull();
});

describe('tier handoff', () => {
  const red = 'marta:route:RED';
  const sched: Fix = {id:'marta:trip:1',pathId:'p-north',tier:'scheduled',routeId:red,heading:0,x:100,z:-2000,cars:[],hidden:'underground'};
  const live = (over: Partial<Fix>): Fix => ({id:'marta:train:401',pathId:'p-north',tier:'live',routeId:red,heading:5,x:140,z:-2150,cars:[],hidden:'underground',...over});

  it('hands a timetable trip replaced by live rail to the nearest live train, marked as a match', () => {
    const f = new VehicleFollow(); f.start({kind:'train',id:sched.id,pathId:sched.pathId,tier:'scheduled'});
    f.frame(sched,bounds2,0,false);
    const next = f.handoff([live({id:'far',x:900}), live({})])!;
    expect(next.id).toBe('marta:train:401');
    expect(f.vehicle).toMatchObject({id:'marta:train:401',tier:'live'});
    expect(f.tier).toBe('live');
    expect(f.matched).toBe(true);
    expect(f.frame(next,bounds2,16,false)).toBeDefined();
    expect(f.phase).toBe('underground');
    f.stop();
    expect(f.matched).toBe(false);
  });

  it('does not hand off to another route, the same tier, the opposite direction or a distant train', () => {
    for (const c of [live({routeId:'marta:route:GOLD'}), live({tier:'scheduled'}), live({heading:180}), live({heading:100}),
      live({x:100,z:-5000}), live({pathId:''})]) expect(pickHandoff(sched,[c])).toBeNull();
    expect(pickHandoff(sched,[live({heading:350})])?.id).toBe('marta:train:401');
    expect(pickHandoff(sched,[live({heading:80})])?.id).toBe('marta:train:401');
  });

  it('hands off only when the trip is gone or its tier changed, never on a same-tier path change', () => {
    const v: Followed = {kind:'train',id:sched.id,pathId:sched.pathId,tier:'scheduled'};
    expect(needsHandoff(v,null)).toBe(true);
    expect(needsHandoff(v,{...sched,tier:'live'})).toBe(true);
    expect(needsHandoff(v,{...sched,pathId:'other'})).toBe(false);
    expect(needsHandoff({kind:'bus',id:'b',tier:'live'},null)).toBe(false);
  });

  it('glides to a distant match instead of jumping, and keeps the lineage for the card', () => {
    const f = new VehicleFollow(); f.start({kind:'train',id:sched.id,pathId:sched.pathId,tier:'scheduled'});
    f.frame(sched,bounds2,0,false);
    const far = f.handoff([live({x:100,z:-4000})])!;
    const step = f.frame(far,bounds2,16,false,{x:100,z:-2000})!;
    expect(Math.hypot(step.x-100, step.z+2000)).toBeLessThan(400);
    expect(f.lineage).toEqual([sched.id,'marta:train:401']);
    f.stop('outside');
    expect(f.endedLineage).toEqual([sched.id,'marta:train:401']);
    expect(f.ended?.id).toBe('marta:train:401');
  });

  it('keeps following a live train that the feed re-snaps to a sibling path', () => {
    const f = new VehicleFollow(); f.start({kind:'train',id:'marta:train:401',pathId:'a',tier:'live'});
    expect(f.frame(live({pathId:'b'}),bounds2,0,false)).toBeDefined();
    expect(f.vehicle?.pathId).toBe('b');
  });

  it('still ends a trip that simply finished, and records which vehicle ended', () => {
    const f = new VehicleFollow(); f.start({kind:'train',id:sched.id,pathId:sched.pathId,tier:'scheduled'});
    f.frame(sched,bounds2,0,false);
    expect(f.handoff([])).toBeNull();
    f.frame(null,bounds2,16,false);
    expect(f.phase).toBe('lost');
    expect(f.ended?.id).toBe(sched.id);
    // A new selection is not mistaken for the ended vehicle.
    f.start({kind:'bus',id:'marta:bus:1',tier:'live'}); f.stop();
    expect(f.ended).toBeUndefined();
  });
});
const bounds2 = {minX:-5000,maxX:5000,minZ:-9000,maxZ:5000};

it('does not count a car as drawn when two planes leave none of its length', () => {
  const keepFront = new Plane(new Vector3(0, 0, 1), -5);   // z >= 5
  const keepRear = new Plane(new Vector3(0, 0, -1), -5);   // z <= -5
  const car = new Mesh(new BoxGeometry(3, 4, CAR_LENGTH), new MeshBasicMaterial({ clippingPlanes: [keepFront, keepRear] }));
  expect(drawnCar(car)).toBeNull();
  car.material.clippingPlanes = [keepFront, new Plane(new Vector3(0, 0, -1), 8)];   // 5 <= z <= 8
  expect(drawnCar(car)).not.toBeNull();
});
