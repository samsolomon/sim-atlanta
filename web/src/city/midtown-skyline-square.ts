import { DoubleSide, Mesh, MeshBasicMaterial } from 'three';
import { Builder, type P2 } from '../vignette/geom';
import type { localLandmarkShell } from './landmark-shell';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

export function towerSquare(shell: Shell) {
  const concrete = '#d6d2c7', reveal = '#8c8b88', glow = new Builder();
  const box = (u: number,v: number,U: number,V: number): P2[] => [[u,v],[U,v],[U,V],[u,V]];
  shell.prism(shell.ring,shell.base,9,concrete,'#b7b9b4');
  // The broad faces are deep rectangular recesses bounded by structural concrete.
  const plate = box(-20,-27,20,27);
  shell.prism(plate,9,197,'#505861','#828683');
  for (let face=0;face<4;face++) {
    const sideways=face%2===1, width=sideways?26.8:19.3, depth=sideways?26.2:33.1;
    const angle=face*Math.PI/2;
    const point=(u: number,y: number,v: number) => [u*Math.cos(angle)+v*Math.sin(angle),y,u*Math.sin(angle)-v*Math.cos(angle)];
    const pane=(u: number,v: number,lo: number,hi: number,d: number,color: string) =>
      shell.body.quad(point(u,lo,d),point(u,hi,d),point(v,hi,d),point(v,lo,d),color);
    const n=sideways?9:7, floors=45, stride=187/floors;
    const a=point(-width,0,depth-.65),b=point(width,0,depth-.65);
    shell.facade([a[0],a[2]],[b[0],b[2]],10,197,floors,2*width/n,.90,.61,['#5b6163','#414b55','#56616c'],.08);
    for(let i=0;i<=n;i++) {
      const u=-width+2*width*i/n;
      pane(u-.36,u+.36,9,197,depth,concrete);
    }
    for(let row=0;row<floors;row++) {
      const lo=10+row*stride, hi=lo+1.44;
      pane(-width,width,lo,hi,depth,concrete);
      shell.body.quad(point(-width,hi,depth),point(width,hi,depth),point(width,hi,depth-.8),point(-width,hi,depth-.8),reveal);
    }
    // Solid end blades return around the window banks, leaving the four notches visible.
    for(const side of [-1,1]) {
      const u=side*width, v=side*(width-.42);
      shell.body.quad(point(u,8,depth),point(u,198,depth),point(u,198,depth-6),point(u,8,depth-6),concrete);
      glow.quad(point(u+side*.03,9,depth-.04),point(u+side*.03,196,depth-.04),
        point(u+side*.03,196,depth-4.8),point(u+side*.03,9,depth-4.8),side>0?'#626bc9':'#a65abc');
      pane(Math.min(u,v),Math.max(u,v),9,198,depth,concrete);
    }
  }
  shell.prism(shell.ring,197,201,concrete,'#b0b0aa');
  shell.prism(box(-19,-28.4,19,28.4),201,206,'#c4c3ba','#a1a6a3');
  const model=shell.finish('#f5deb5',.7);
  const material=new MeshBasicMaterial({vertexColors:true,side:DoubleSide,transparent:true,depthWrite:false,opacity:0});
  model.group.add(new Mesh(glow.geometry(),material));
  return {...model,setNight(factor: number){model.setNight(factor);material.opacity=.58*factor;}};
}
