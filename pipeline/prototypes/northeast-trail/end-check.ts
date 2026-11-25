import { Builder } from '../../../web/src/vignette/geom';
import { trailAxis,drawTrail,trailPoint } from './path';
import assert from 'node:assert/strict';
const builder=new Builder();
drawTrail(builder,{minX:-1000,maxX:1800,minZ:-6500,maxZ:-5700});
const geo=builder.geometry(),pos=geo.getAttribute('position');
for(const s of [0,.0005,.02,trailAxis.length-.02,trailAxis.length-.0005,trailAxis.length]){
  const values=[];
  for(const u of [-2.12,0,2.12]){
    const [x,y,z]=trailPoint(s,u), hits=[];
    for(let i=0;i<pos.count;i+=3){
      const ax=pos.getX(i),az=pos.getZ(i),bx=pos.getX(i+1)-ax,bz=pos.getZ(i+1)-az,cx=pos.getX(i+2)-ax,cz=pos.getZ(i+2)-az;
      const det=bx*cz-bz*cx;if(det>=-1e-10)continue;
      const l=((x-ax)*cz-(z-az)*cx)/det,r=(bx*(z-az)-bz*(x-ax))/det;
      if(l>=-1e-7&&r>=-1e-7&&l+r<=1+1e-7)hits.push(pos.getY(i)*(1-l-r)+pos.getY(i+1)*l+pos.getY(i+2)*r-y);
    }
    values.push(hits.length?Math.min(...hits.map(Math.abs)):null);
  }
  console.log(s,values);
  if(s>0&&s<trailAxis.length)assert.ok(values.every(v=>v!==null&&v<.001));
}
