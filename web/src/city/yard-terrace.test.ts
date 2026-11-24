import {expect,it} from 'vitest';
import {Builder,pointInRing,type P2} from '../vignette/geom';
import {yardTerrace} from './yard-terrace';

const site=()=>({
  at:(s:number,d:number):P2=>[s,d], ground:(_x:number,z:number)=>2-z*.15,
  clear:()=>true,street:()=>3,width:12,door:0,walkEnd:10,newer:true,piers:true,
  bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},trees:[] as number[][],
});
it('keeps every tread above its linear terrain cut, within the per-yard geometry budget',()=>{
  const b=new Builder(),o=site(),result=yardTerrace(b,o)!;
  expect(result).not.toBeNull();expect(result.triangles).toBeLessThanOrEqual(80);
  expect(result.yields).toHaveLength(3);
  // Sample all upward-facing horizontal triangles, including their interiors.
  let treadPoints=0;
  for(let i=0;i<b.pos.length;i+=9){
    const v=[b.pos.slice(i,i+3),b.pos.slice(i+3,i+6),b.pos.slice(i+6,i+9)];
    if(Math.max(...v.map(p=>p[1]))-Math.min(...v.map(p=>p[1]))>1e-6)continue;
    for(let a=0;a<=4;a++)for(let c=0;c<=4-a;c++){
      const p=[0,1,2].map(k=>(v[0][k]*a+v[1][k]*c+v[2][k]*(4-a-c))/4);
      for(const cut of result.yields)if(pointInRing(p[0],p[2],cut.ring as P2[])){
        expect(cut.floor(p[0],p[2])).toBeLessThan(p[1]);treadPoints++;
      }
    }
  }
  expect(treadPoints).toBeGreaterThan(100);
});
it('skips flat yards, blocked frontages, trees and terrain seams without drawing partial shelves',()=>{
  for(const changes of [{ground:()=>0},{clear:()=>false},{trees:[[0,9]]},{street:()=>1},
    {bounds:{minX:-6,maxX:100,minZ:-100,maxZ:100}}]){
    const b=new Builder();expect(yardTerrace(b,{...site(),...changes})).toBeNull();expect(b.pos).toHaveLength(0);
  }
});
