import {it,expect} from 'vitest';
import {Builder,type P2} from '../vignette/geom';
import {yardTerrace} from './yard-terrace';
it('joins the upper front walk on a frontage with a five percent sideways slope',()=>{
 const ground=(x:number,z:number)=>2-z*.15+x*.05;
 const b=new Builder();const t=yardTerrace(b,{at:(s,d):P2=>[s,d],ground,clear:()=>true,street:()=>3,width:12,door:0,walkEnd:10,newer:false,piers:false,bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},trees:[]})!;
 const heights=[];for(let i=0;i<b.pos.length;i+=3)if(Math.abs(b.pos[i])<=.61&&Math.abs(b.pos[i+2]-t.walkStop)<1e-6)heights.push(b.pos[i+1]);
 expect(Math.max(...heights)).toBeCloseTo(ground(0,t.walkStop)+.04,6);
});
