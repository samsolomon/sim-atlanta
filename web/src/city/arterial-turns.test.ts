import { describe, expect, it } from 'vitest';
import { arterialTurns, TURN_SHARE } from './arterial-turns';
import { arterialTrafficRoutes, type ArterialCorridor } from './arterial-traffic-routes';
import { signalPhase, signalPositions } from './traffic-signals';
import type { VRoad } from '../vignette/world';
import type { P2 } from '../vignette/geom';

const bounds={minX:-250,maxX:250,minZ:-250,maxZ:250};
const make=(id:string,pts:P2[],from:string,to:string,allow:'both'|'forward'|'reverse'='both'):ArterialCorridor => {
  const road:VRoad={pts,bridge:false,tunnel:false,cls:'secondary',name:id};
  return {id,runs:[{road,from,to,allow,aadt:{forward:12000,reverse:12000},lanes:{},speedMph:25,truckShare:0}]};
};
const west=make('west',[[-200,0],[0,0]],'w','j');
const east=make('east',[[0,0],[200,0]],'j','e');
// Spring is southbound only (+z), West Peachtree northbound only (-z).
const spring=make('Spring',[[0,0],[0,200]],'j','s','forward');
const wp=make('West Peachtree',[[0,0],[0,-200]],'j','n','forward');
const corridors=[west,east,spring,wp];
const base=arterialTrafficRoutes(corridors,bounds);
const routes=arterialTurns(base,corridors,[[0,0]]);
const turns=routes.filter(c=>c.turnSignal);

describe('arterial turns',()=>{
  it('turns onto permitted one-way exits and never approaches along their prohibited direction',()=>{
    expect(turns).toHaveLength(4);
    for(const c of turns){
      expect(['west','east']).toContain(c.roads[0].name);
      expect(['Spring','West Peachtree']).toContain(c.roads.at(-1)!.name);
      expect(c.line.pts.at(-1)![1]).toBe(c.roads.at(-1)!.name==='Spring'?200:-200);
      expect(c.line.pts.every(p=>p.every(Number.isFinite))).toBe(true);
      expect(c.roads).toHaveLength(c.line.pts.length-1);
      const entry=c.line.at(c.turnSignal!.s);
      expect(Math.abs(entry.dx)).toBeCloseTo(1);
    }
  });
  it('splits incoming flow without adding demand or new mid-block fade points',()=>{
    for (const source of base) {
      const departures=routes.filter(c=>c.roads[0]===source.roads[0] &&
        Math.sign(c.line.at(1).dx)===Math.sign(source.line.at(1).dx) &&
        Math.sign(c.line.at(1).dz)===Math.sign(source.line.at(1).dz));
      expect(departures.reduce((n,c)=>n+c.dailyFlow,0)).toBeCloseTo(source.dailyFlow);
      for (const c of departures) {
        expect(c.speedMps).toBe(source.speedMps);
        expect(c.line.pts[0]).toEqual(source.line.pts[0]);
      }
    }
    const incoming=routes.find(c=>!c.turnSignal && c.line.pts[0][0]===-200)!;
    expect(incoming.dailyFlow).toBeCloseTo(12000*(1-TURN_SHARE));
  });
  it('rejects missing controllers, different node IDs, disconnected endpoints and U-turns',()=>{
    expect(arterialTurns(base,corridors,[]).some(c=>c.turnSignal)).toBe(false);
    for(const other of [make('wrong-node',[[0,0],[0,200]],'other','s','forward'),
      make('gap',[[2,0],[2,200]],'j','s','forward'),make('u-turn',[[0,0],[-200,0]],'j','s','forward')]){
      const cs=[west,other];
      expect(arterialTurns(arterialTrafficRoutes(cs,bounds),cs,[[0,0]]).some(c=>c.turnSignal)).toBe(false);
    }
  });
  it('skips an exit whose speed would create a slower stream on the shared lane',()=>{
    const slow=make('slow',[[0,0],[0,200]],'j','s','forward');
    const cs=[west,{...slow,runs:slow.runs.map(r=>({...r,speedMph:10}))}];
    expect(arterialTurns(arterialTrafficRoutes(cs,bounds),cs,[[0,0]]).some(c=>c.turnSignal)).toBe(false);
  });
  it('never places a turn stop past an upstream through signal head',()=>{
    const shifted=arterialTurns(base,corridors,[[-15,0]]);
    for(const c of shifted.filter(c=>c.turnSignal)){
      const through=shifted.find(r=>!r.turnSignal && r.roads[0]===c.roads[0] && r.line.pts[0][0]===c.line.pts[0][0] && r.line.pts[0][1]===c.line.pts[0][1])!;
      const stop=through.signals!.find(s=>s.key===c.turnSignal!.key)!;
      expect(c.turnSignal!.s).toBeLessThanOrEqual(stop.s);
    }
  });
  it('holds turning cars on red and amber using the incoming phase and is independent of seek order',()=>{
    for(const c of turns){
      const sig=c.signals!.find(s=>s.key===c.turnSignal!.key)!;
      const incoming=routes.find(r=>!r.turnSignal && r.roads[0]===c.roads[0] && Math.sign(r.line.at(1).dx)===Math.sign(c.line.at(1).dx))!;
      expect(sig.axis).toBe(incoming.signals![0].axis);
      for(let t=0;t<84;t++){
        const trips=[{start:t-sig.s/c.speedMps,length:4}];
        const p=signalPositions(c.signals!,c.line.length,c.speedMps,trips,t)[0]!;
        if(signalPhase(sig.key,sig.axis,t)!=='green') expect(p).toBeLessThan(sig.s);
        const first=signalPositions(c.signals!,c.line.length,c.speedMps,trips,t+5);
        signalPositions(c.signals!,c.line.length,c.speedMps,trips,t+500);
        expect(signalPositions(c.signals!,c.line.length,c.speedMps,trips,t+5)).toEqual(first);
      }
    }
  });
});
