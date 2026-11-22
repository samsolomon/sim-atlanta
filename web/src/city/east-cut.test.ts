import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { SceneManifest } from '../core/scene-data';
import type { RoutesFile } from '../model/types';
import { GroundGrid } from '../terrain/grid';
import type { TransportRun } from '../terrain/transport-data';
import { CAR_GAP, CAR_LENGTH } from '../vignette/cq400';
import { cutPoint, prepareEastCut, ServiceTrack } from './east-cut';
import model from '../../../pipeline/prototypes/five-points-east-cut/model.json';

const pitch = CAR_LENGTH + CAR_GAP;
for (const name of ['ER','EL'] as const) describe(name, () => {
  const route = new ServiceTrack('test', name, 700, 804);
  for (const mouth of ['west','east'] as const) it('keeps a five-car consist moving through the ' + mouth + ' mouth', () => {
    const atEntry = (name === 'ER') === (mouth === 'west');
    const s = atEntry ? route.entry : route.exit;
    const cars = [2,1,0,-1,-2].map(i => route.car(s, i*pitch));
    expect(cars.map(Boolean)).toEqual(atEntry ? [true,true,true,false,false] : [false,false,true,true,true]);
    const centre = cars[2]!;
    expect(centre.clipped).toBe(mouth);
    const v = new Vector3(centre.x, 0, centre.z);
    expect(centre.plane!.distanceToPoint(v)).toBeCloseTo(0);
    const dir = new Vector3(centre.dx, 0, centre.dz);
    const sign = atEntry ? 1 : -1;
    expect(centre.plane!.distanceToPoint(v.clone().addScaledVector(dir,sign*5))).toBeCloseTo(5);
    expect(centre.plane!.distanceToPoint(v.clone().addScaledVector(dir,-sign*5))).toBeCloseTo(-5);
    const outside = route.car(s, -sign*8)!;
    expect(outside.clipped).toBe(mouth);
    expect(centre.plane!.distanceToPoint(new Vector3(outside.x,0,outside.z))).toBeCloseTo(-8);
    expect(route.car(s, -sign*(CAR_LENGTH/2+.01))).toBeUndefined();
    const next = route.car(s+.5,0)!;
    expect((next.x-centre.x)*centre.dx + (next.z-centre.z)*centre.dz).toBeGreaterThan(.45);
  });
});

const origin = {lon:-84.3916,lat:33.7539}, degree = Math.PI/180*6371008.8;
const pts = [-30,0,55,110,140].map(s => cutPoint(s,-8));
function path(id: string, reverse: boolean) {
  const points = reverse ? [...pts].reverse() : pts;
  return {id, routeId:'marta:route:BLUE', cum: [0,30,85,140,170],
    coords:points.flatMap(([x,z]) => [origin.lon+x/(degree*Math.cos(origin.lat*Math.PI/180)), origin.lat-z/degree])};
}
const routes = {routes:[{id:'marta:route:BLUE', mode:'heavy_rail'}], paths:[path('east',false),path('west',true)]} as RoutesFile;
const evidence = 'five-points-east-cut';
const span = {s0:34,s1:136,ev:evidence,cover:'open',form:'cut'};
const scene = {origin, profiles:{east:{},west:{}}, rail:{version:1, evidence:{[evidence]:{sources:['osm:way/702258817','osm:way/702258818','osm:way/1453238814']}},
  paths:{east:[span],west:[span]}}} as unknown as SceneManifest;
const ground = {manifest:{vertical:{sceneZeroNavd88M:318}}, sample:()=>316} as unknown as GroundGrid;
const freight: TransportRun = {cls:'standard_gauge',kind:'ground',freightS:[961.72,855.49],
  pts:model.tracks.CSX.map(([s,u])=>cutPoint(s,u))};

it('binds using direction with the same GTFS centreline in both directions', () => {
  const cut = prepareEastCut(routes,scene,ground,[freight])!;
  expect([...cut.paths.values()].map(p=>p.name)).toEqual(['ER','EL']);
  expect(cut.paths.get('east')!.entry).toBeCloseTo(34.052);
  expect(cut.paths.get('west')!.entry).toBeCloseTo(140-109.546);
  expect(cut.treadY).toBeCloseTo(311.1-318+.13);
});

it('falls back together for incomplete evidence, ambiguous service, and unmatched freight', () => {
  expect(prepareEastCut(routes,scene,undefined,[freight])).toBeUndefined();
  expect(prepareEastCut(routes,scene,ground,[{...freight,freightS:undefined}])).toBeUndefined();
  expect(prepareEastCut(routes,scene,ground,[freight,freight])).toBeUndefined();
  expect(prepareEastCut(routes,scene,ground,[{...freight,pts:freight.pts.map(([x,z])=>[x+3,z])}])).toBeUndefined();
  const missing = structuredClone(scene);
  delete missing.rail!.paths.east;
  expect(prepareEastCut(routes,missing,ground,[freight])).toBeUndefined();
  expect(prepareEastCut({...routes,paths:[routes.paths[0]]},scene,ground,[freight])).toBeUndefined();
  const changed = structuredClone(routes);
  changed.paths[0].cum[2] = changed.paths[0].cum[1];
  expect(prepareEastCut(changed,scene,ground,[freight])).toBeUndefined();
  const hole = { ...ground, sample:()=>null } as unknown as GroundGrid;
  expect(prepareEastCut(routes,scene,hole,[freight])).toBeUndefined();
});

const dir = resolve(__dirname,'../../public/data/scene/downtown');
const staged = ['ground.i16','ground.json','vignette.json','scene.json','../../ga/routes.json']
  .every(file => existsSync(resolve(dir,file)));
it.skipIf(!staged)('binds all ten staged approach shapes and one CSX tread', () => {
  const json = (name: string) => JSON.parse(readFileSync(resolve(dir,name),'utf8'));
  const bytes = Uint8Array.from(readFileSync(resolve(dir,'ground.i16')));
  const grid = new GroundGrid(json('ground.json'), bytes.buffer);
  const cut = prepareEastCut(json('../../ga/routes.json'),json('scene.json'),grid,json('vignette.json').terrainTransport.rail)!;
  const ids = (name: string) => [...cut.paths].filter(([,p])=>p.name===name).map(([id])=>id.split(':').pop()).sort();
  expect(ids('ER')).toEqual(['155177','155181','155214','155215','155216']);
  expect(ids('EL')).toEqual(['155185','155188','155221','155222','155223']);
  expect(cut.freight.freightS).toEqual([961.72,855.49]);
});
