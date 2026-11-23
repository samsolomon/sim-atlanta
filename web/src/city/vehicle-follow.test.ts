import { describe, expect, it } from 'vitest';
import type { RailData } from '../core/scene-data';
import tunnelRuns from './fixtures/midtown-tunnel.json';
import { inMappedTunnel, trainHidden, VehicleFollow, type Fix, type Followed } from './vehicle-follow';

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
    expect(trainHidden(rail,'blue-east',20,482,-3063)).toBe('covered');
    expect(trainHidden(rail,'blue-east',60,482,-3063)).toBe('underground');
    expect(trainHidden(rail,'blue-east',60,0,0)).toBeNull();
  });
});
