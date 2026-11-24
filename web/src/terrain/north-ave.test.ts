import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { Builder, Line } from '../vignette/geom';
import railRows from '../city/fixtures/midtown-rail.json';
import { GroundGrid } from './grid';
import { GroundSurface } from './surface';
import { drawNorthAve, northAveSlots, northAveLocal, northAveRailProfile, northAveFloor, northAvePoint, NORTH_AVE } from './north-ave';
import type { TerrainCity } from './transport-data';
const read=(file:string)=>readFileSync(new URL('../../../pipeline/prototypes/square-board/midtown-south/'+file,import.meta.url));
const grid=new GroundGrid(JSON.parse(read('ground.json').toString()),Uint8Array.from(read('ground.i16')).buffer);
const city=JSON.parse(read('context.json').toString()) as TerrainCity;
it('cuts both tiers to the lower road, preserving the surrounding banks',()=>{
 for(const q of ['high','low'] as const){const ground=new GroundSurface(grid,q,northAveSlots(city,323.8));
  for(const s of [5,40,70,103,120,145]){const [x,z]=northAvePoint(s,0);expect(ground.sampleScene(x,z) ?? -Infinity).toBeLessThanOrEqual(northAveFloor(s)-323.8+.001);}
  const [x,z]=northAvePoint(60,20);expect(ground.sampleScene(x,z)).not.toBeNull();ground.geometry.dispose();
 }
});
it('keeps every real rail crossing continuous and under 1.5 percent through the crossing and approach',()=>{
 let samples=0,maxGrade=0;
 for(const run of railRows['midtown-south']){const line=new Line(run.pts as [number,number][]),grade=northAveRailProfile({pts:run.pts as [number,number][]},grid);let last:{s:number;y:number}|undefined;
  for(let d=0;d<line.length;d+=1){const p=line.at(d),[s,t]=northAveLocal(p.x,p.z);
   if(s<21||s>89||Math.abs(t)>119){last=undefined;continue;}
   const base=grid.sample(p.x,p.z)!-323.8,y=grade(p.x,p.z,base)!;
   if(last)maxGrade=Math.max(maxGrade,Math.abs(y-last.y)/(d-last.s));last={s:d,y};samples++;
   if(Math.abs(t)<11.3)expect(y+323.8-northAveFloor(s)).toBeGreaterThanOrEqual(4.5);
  }
 }
 expect(samples).toBeGreaterThan(500);expect(maxGrade).toBeLessThanOrEqual(.015);
});
it('draws the five cover groups in one shared batch within the structural triangle budget',()=>{
 const builder=new Builder();drawNorthAve(city,grid,builder);
 expect(NORTH_AVE.groups).toHaveLength(5);expect(builder.pos.length/9).toBeLessThan(4000);expect(builder.pos.length/9).toBeGreaterThan(500);
});
