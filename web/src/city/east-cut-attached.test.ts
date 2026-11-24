import { describe, expect, it } from 'vitest';
import { Mesh, MeshLambertMaterial, Vector3 } from 'three';
import type { SceneManifest } from '../core/scene-data';
import type { TrainState } from '../model/types';
import { Line } from '../vignette/geom';
import { ServiceTrack } from './east-cut';
import { CityTrains } from './trains';
import { CityFreight, DOWNTOWN_ENTRY_MS } from './freight';
import { createSurfaceTransport } from '../terrain/transport';
import { GroundGrid } from '../terrain/grid';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prepareEastCut } from './east-cut';

const bounds = { minX:-500, maxX:500, minZ:-500, maxZ:500 };
const manifest: SceneManifest = { name:'test',notes:'',sources:[],origin:{lon:0,lat:0}, profiles:{test:{s0:0,step:1,z:[0]}}, bounds };
const stock = (s: number): TrainState => ({ routeId:'blue', pathId:'test', s:{value:s}, lengthM:{value:114.5},
  lon:0, lat:0, heading:90 } as TrainState);
const colors = new Map([['blue','#0075b2']]);
describe('attached City passenger stock', () => {
  for (const name of ['ER','EL'] as const) it('places and clips ' + name + ' at both mouths', () => {
    const route = new ServiceTrack('blue',name,700,804);
    const cut = {paths:new Map([['test',route]]), treadY:-7, freight:{pts:[],kind:'ground' as const,cls:'standard_gauge'}};
    const fleet = new CityTrains([],manifest,bounds,colors,[],cut);
    for (const s of [700,804]) {
      fleet.update([stock(s)],0);
      const cars = fleet.group.children.filter(c=>c.visible) as Mesh[];
      expect(cars.length).toBe(3);
      const clipped = cars.filter(c=>(c.material as MeshLambertMaterial).clippingPlanes?.length);
      expect(clipped.length).toBe(1);
      const pose = route.car(s,0)!;
      expect(clipped[0].position.distanceTo(new Vector3(pose.x,-7,pose.z))).toBeLessThan(.00001);
      expect((clipped[0].material as MeshLambertMaterial).clippingPlanes![0]).toBe(pose.plane);
    }
    fleet.update([stock(590)],0);
    expect(fleet.surfaceCars).toBe(0);
  });

  it('keeps legacy train placement with the attachment absent', () => {
    const line = new Line([[-100,0],[100,0]]);
    const fleet = new CityTrains([{line,elev:()=>5}],manifest,bounds,colors,[]);
    fleet.update([stock(700)],0);
    expect(fleet.surfaceCars).toBe(5);
    for (const car of fleet.group.children) expect(car.position.y).toBeCloseTo(5.55);
  });
});

const dir = resolve(__dirname,'../../public/data/scene/downtown');
const staged = ['scene.json','vignette.json','ground.json','ground.i16','../../ga/routes.json'].every(f=>existsSync(resolve(dir,f)));
it.skipIf(!staged)('keeps freight suppressed on the old unsupported tread if route evidence disappears', () => {
  const json = (f: string) => JSON.parse(readFileSync(resolve(dir,f),'utf8'));
  const city = json('vignette.json'), spec = json('scene.json'), routes = json('../../ga/routes.json');
  const grid = new GroundGrid(json('ground.json'),Uint8Array.from(readFileSync(resolve(dir,'ground.i16'))).buffer);
  const cut = prepareEastCut(routes,spec,grid,city.terrainTransport.rail)!;
  const scoped = {...city,terrainTransport:{version:1,roads:[],rail:[cut.freight]}};
  // Worst-case opening: the old terrain provides no drawable surface between the mouths.
  const transport = createSurfaceTransport(scoped,grid,()=>null,cut);
  expect(transport.freightTreads.length).toBe(1);
  const run = transport.freightTreads[0];
  expect(Math.abs(run.at(-1)!.s - run[0].s)).toBeCloseTo(106.23);
  expect(run.every(p=>Math.abs(p.position.y-cut.treadY)<1e-6)).toBe(true);
  const loop = new CityFreight(transport.freightTreads,[]);
  loop.update(DOWNTOWN_ENTRY_MS + 50 / 4.5 * 1000); // slot 0, lead 50 m into the run
  expect(loop.visibleCars).toBeGreaterThan(0);
  delete spec.rail.paths['marta:path:155177'];
  const missing = prepareEastCut(routes,spec,grid,city.terrainTransport.rail);
  expect(missing).toBeUndefined();
  const base = createSurfaceTransport(scoped,grid,()=>null,missing);
  expect(base.freightTreads).toEqual([]);
  base.dispose(); loop.dispose(); transport.dispose();
});
