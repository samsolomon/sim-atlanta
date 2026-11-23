import { expect, it } from 'vitest';
import type { TerrainCity } from '../terrain/transport-data';
import { connectorTrafficRoutes } from './connector-traffic-routes';

it('carries traffic in both directions between the downtown mainline and both Brookwood branches', () => {
  const city = { bounds: { minX: -1000, maxX: 1800, minZ: -5700, maxZ: 1100 } } as TerrainCity;
  const routes = connectorTrafficRoutes(city).filter(r => r.crossing);
  for (const dir of ['northbound', 'southbound']) {
    const ends = routes.filter(r => r.direction === dir).map(r =>
      dir === 'northbound' ? r.line.pts.at(-1)! : r.line.pts[0]);
    expect(ends.some(([x,z]) => x === -1000 && z < -4900)).toBe(true);
    expect(ends.some(([x,z]) => x > 500 && z === -5700)).toBe(true);
  }
});

import { readFileSync } from 'node:fs';
import { GroundGrid } from '../terrain/grid';
import { GroundSurface } from '../terrain/surface';
import { createSurfaceTransport } from '../terrain/transport';
import { midtownConnectorDecks } from '../terrain/midtown-connector-decks';
import { midtownRows } from '../square-board/sections';
import { auburnTransport } from './sweet-auburn-transport';
import { seventeenthAccess, seventeenthPortals } from './seventeenth-street';
import { bridgeApproaches } from '../terrain/bridge-approaches';
import { brookwoodGrid } from './brookwood';
import { cityRoadHeight } from './road-height';
import { Line } from '../vignette/geom';

it.each(['high', 'low'] as const)('samples the mounted Midtown surfaces at %s detail', quality => {
  const scene = midtownRows.map(row => {
    const read = (file: string) => readFileSync(new URL('../../../pipeline/prototypes/square-board/'+row+'/'+file, import.meta.url));
    const manifest = JSON.parse(read('ground.json').toString()), bytes = Uint8Array.from(read('ground.i16')).buffer;
    const grid = row.startsWith('brookwood') ? brookwoodGrid(manifest, bytes) : new GroundGrid(manifest,bytes);
    const city = midtownConnectorDecks(seventeenthAccess(auburnTransport(JSON.parse(read('context.json').toString()))));
    const surface = new GroundSurface(grid, quality);
    const banks = bridgeApproaches(seventeenthPortals(city), 323.8, surface.sampleScene.bind(surface), city.bounds, city.roads);
    const decks = createSurfaceTransport(city, grid, banks.groundAt);
    return {city,decks,banks,surface,height:cityRoadHeight(city,banks.groundAt,decks.deckAt)};
  });
  try {
    for (const [i,{city,decks,banks}] of scene.entries()) {
      let minimum=Infinity, worst: unknown;
      for(const run of city.terrainTransport!.roads) {
        if (!run.deckNavd88M) continue;
        const line=new Line(run.pts);
        for(let s=1;s<line.length;s+=3) {
          const p=line.at(s), y=decks.deckAt(p.x,p.z,run), floor=banks.groundAt(p.x,p.z,run);
          if(y===null || floor===null) continue;
          if (y-floor<minimum) {minimum=y-floor; worst=[p.x,p.z,run.name,run.pts[0]];}
        }
      }
      console.log(midtownRows[i],minimum,worst);
    }
    const routes=connectorTrafficRoutes(scene[0].city,scene.slice(1).map(b=>b.city));
    const missing=new Map<string,number>(); const jumps=new Map<string,number>();
    for(const r of routes){
      let prev:number|null=null;
      for(let s=3;s<r.line.length;s+=3){
        const p=r.line.at(s),owner=r.roads[Math.min(r.roads.length-1,Math.floor(r.line.vertexAt(s)))];
        const board=scene.find(b=>p.z>=b.city.bounds.minZ&&p.z<=b.city.bounds.maxZ)!;
        const y=board.height(p.x,p.z,owner),k=String(owner.pts[0]);
        if(y===null&&!owner.tunnel) missing.set(k,(missing.get(k)??0)+1);
        if(quality==='high' && y!==null && prev!==null && Math.abs(y-prev)>2.65 && Math.abs(y-prev)>(jumps.get(k)??0)) console.log('gap',p.x,p.z,y,prev,k, owner.pts.at(-1), board.city.terrainTransport!.roads.filter(o=>o.pts[0][0]===-194.61).map(o=>[o.pts[1],o.sub,board.decks.deckAt(p.x,p.z,o)]));
        if(y!==null&&prev!==null&&Math.abs(y-prev)>1) jumps.set(k,Math.max(jumps.get(k)??0,Math.abs(y-prev)));
        prev=y;
      }
    }
    console.log('missing',Object.fromEntries(missing),'jumps',Object.fromEntries(jumps));
  } finally { for(const b of scene) {b.decks.dispose(); b.surface.geometry.dispose();b.banks.geometry.dispose();b.banks.walls.dispose();} }
});
