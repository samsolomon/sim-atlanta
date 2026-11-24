import {writeFileSync} from 'node:fs';
import {body} from './body.mjs';

const views = [[30,12,'Front three-quarter'],[90,3,'Side'],[148,10,'Rear three-quarter']];
const panels=[];
for (const [row,crossover] of [false,true].entries()) {
  for (const [column,[bearing,elevation,label]] of views.entries()) {
    const az=bearing*Math.PI/180, el=elevation*Math.PI/180;
    const project=([x,y,z])=>{
      const depth=x*Math.sin(az)+z*Math.cos(az);
      return [(x*Math.cos(az)-z*Math.sin(az))*62,(-y*Math.cos(el)+depth*Math.sin(el))*62,depth*Math.cos(el)+y*Math.sin(el)];
    };
    const polygons=body(crossover).map(({points,color})=>{
      const p=points.map(project);
      const [a,b,c]=points;
      const u=b.map((v,i)=>v-a[i]),v=c.map((n,i)=>n-a[i]);
      const nx=u[1]*v[2]-u[2]*v[1],ny=u[2]*v[0]-u[0]*v[2],nz=u[0]*v[1]-u[1]*v[0];
      const length=Math.hypot(nx,ny,nz)||1;
      const light=.76+.24*(Math.abs(ny)+.15*Math.abs(nz))/length;
      const rgb=color.slice(1).match(/../g).map(n=>Math.min(255,Math.round(parseInt(n,16)*light)));
      return {z:p.reduce((n,q)=>n+q[2],0)/p.length,tag:`<polygon points="${p.map(q=>q.slice(0,2).map(t=>t.toFixed(2)).join(',')).join(' ')}" fill="rgb(${rgb})"/>`};
    }).sort((a,b)=>a.z-b.z);
    panels.push(`<g transform="translate(${180+column*330} ${238+row*215})"><path d="M-150,1 H150" stroke="#c8cecf"/>${polygons.map(p=>p.tag).join('')}</g>`);
    if(!row)panels.push(`<text x="${180+column*330}" y="96" text-anchor="middle">${label}</text>`);
  }
}
writeFileSync(new URL('silhouettes.svg',import.meta.url),`<svg xmlns="http://www.w3.org/2000/svg" width="1020" height="530" viewBox="0 0 1020 530"><style>text{font:15px Helvetica,Arial;fill:#263537}.title{font-size:27px;font-weight:bold}.name{font-size:17px;font-weight:bold}</style><rect width="100%" height="100%" fill="#f3f3ee"/><text class="title" x="30" y="40">Everyday traffic · silhouette study</text><text x="30" y="64">Same blue-gray paint, lighting and scale · orthographic design views</text>${panels.join('')}<text class="name" x="30" y="282">Midsize sedan</text><text x="30" y="306">4.88 m long · 1.45 m high · 2.82 m wheelbase</text><text class="name" x="30" y="490">Compact crossover</text><text x="30" y="514">4.60 m long · 1.69 m high · 2.69 m wheelbase</text></svg>`);
