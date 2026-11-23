import { describe, expect, it } from 'vitest';
import type { TrainState } from '../model/types';
import type { RailData } from '../core/scene-data';
import { BLUE, TrainFollow } from './train-follow';

const bounds = {minX:0,maxX:500,minZ:0,maxZ:100};
const project = (x: number,z: number): [number,number] => [x,z];
const train = {id:'trip-1',pathId:'blue-east',routeId:BLUE,lon:20,lat:35,
  s:{value:20,tier:'scheduled',source:'gtfs',asOf:''}} as TrainState;
const car = (id: string,x: number,visible=true) => ({visible,userData:{trainId:id},position:{x,z:36}});
const rail: RailData = {version:1,datum:'track-bed',evidence:{},paths:{'blue-east':[
  {s0:0,s1:40,cover:'covered',form:'tunnel',base:'ground',rel:0,height:'schematic',ev:'fixture'}]}};

describe('Blue Line follow preview', () => {
  it('follows the same trip through the last car, full cover and first car of the next opening', () => {
    const f = new TrainFollow(); f.start(train);
    const step = (ms: number, cars: ReturnType<typeof car>[], x: number) =>
      f.frame([{...train,lon:x}],cars,project,bounds,rail,ms,false);
    expect(step(0,[car('other',400),car(train.id,21),car(train.id,31)],20)).toEqual({x:26,z:36});
    expect(f.phase).toBe('drawn');
    step(100,[car(train.id,21,false),car(train.id,31)],45);
    expect(f.phase).toBe('drawn');
    const covered = step(200,[car(train.id,31,false),car('other',410)],60)!;
    expect(f.phase).toBe('covered');
    expect(covered.x).toBeGreaterThan(30);
    expect(covered.x).toBeLessThan(60);
    const back = step(300,[car(train.id,72),car('other',400)],80)!;
    expect(f.phase).toBe('drawn');
    expect(back.x).toBeGreaterThan(covered.x);
    expect(back.x).toBeLessThan(72);
  });

  it('tracks the source above an unmapped gap without claiming a tunnel', () => {
    const f = new TrainFollow(); f.start(train);
    expect(f.frame([train],[],project,bounds,undefined,0,false)).toEqual({x:20,z:35});
    expect(f.phase).toBe('unseen');
  });

  it('holds the camera in reduced motion until explicitly recentered, including after reacquisition', () => {
    const f = new TrainFollow(); f.start(train);
    expect(f.frame([train],[car(train.id,25)],project,bounds,rail,0,true)).toEqual({x:25,z:36});
    expect(f.frame([train],[],project,bounds,rail,200,true)).toBeUndefined();
    expect(f.phase).toBe('covered');
    expect(f.frame([train],[car(train.id,90)],project,bounds,rail,400,true)).toBeUndefined();
    f.recenter();
    expect(f.frame([train],[car(train.id,95)],project,bounds,rail,500,true)).toEqual({x:95,z:36});
    expect(f.phase).toBe('drawn');
  });

  it('ends at the board edge after the last in-board car and stays cancelled on re-entry', () => {
    const f = new TrainFollow(); f.start(train);
    const outside = {...train,lon:530};
    expect(f.frame([outside],[car(train.id,490)],project,bounds,rail,0,false)).toBeDefined();
    expect(f.frame([outside],[car(train.id,510)],project,bounds,rail,200,false)).toBeUndefined();
    expect(f.phase).toBe('outside');
    expect(f.frame([train],[car(train.id,30)],project,bounds,rail,300,false)).toBeUndefined();
    f.start(train); f.stop(); f.recenter();
    expect(f.active).toBe(false);
    expect(f.frame([train],[],project,bounds,rail,500,false)).toBeUndefined();
  });

  it('keeps a trip heading into an adjacent area while that area loads, and exposes the trip id', () => {
    const f = new TrainFollow(); f.start(train);
    expect(f.tripId).toBe(train.id);
    const beyond = {...train,lon:560,s:{...train.s,value:600}};
    // City passes the joined bounds while the adjacent area is loading: no car drawn yet, so
    // the camera tracks the source and the card says the train is out of view.
    const joined = {...bounds,maxX:900};
    expect(f.frame([beyond],[],project,joined,rail,0,false)).toBeDefined();
    expect(f.phase).toBe('unseen');
    expect(f.active).toBe(true);
    // If that area fails, City passes downtown's bounds again and follow ends at the edge.
    expect(f.frame([beyond],[],project,bounds,rail,100,false)).toBeUndefined();
    expect(f.phase).toBe('outside');
    expect(f.tripId).toBeUndefined();
  });

  it('rejects a different trip, different path or data-source handover', () => {
    const f = new TrainFollow(); f.start({...train,routeId:'marta:route:GREEN'});
    expect(f.active).toBe(false);
    for (const changed of [{...train,id:'other'}, {...train,pathId:'blue-west'},
      {...train,s:{...train.s,tier:'live' as const}}]) {
      f.start(train);
      expect(f.frame([changed],[car('other',50)],project,bounds,rail,0,false)).toBeUndefined();
      expect(f.phase).toBe('lost');
    }
  });
});

it('keeps accelerated playback and rewinds within eight metres of the selected consist', () => {
  const f = new TrainFollow(); f.start(train);
  f.frame([train],[car(train.id,25)],project,bounds,rail,0,false);
  const jumped = f.frame([train],[car(train.id,425)],project,bounds,rail,16,false)!;
  expect(Math.abs(jumped.x-425)).toBeLessThanOrEqual(8);
  const back = f.frame([train],[car(train.id,25)],project,bounds,rail,32,false)!;
  expect(Math.abs(back.x-25)).toBeLessThanOrEqual(8);
});
