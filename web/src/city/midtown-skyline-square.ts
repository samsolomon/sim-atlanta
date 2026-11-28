import { DoubleSide, Mesh, MeshBasicMaterial } from 'three';
import { Builder, type P2 } from '../vignette/geom';
import type { localLandmarkShell } from './landmark-shell';
import sites from './fixtures/midtown-skyline.json';

type Shell = NonNullable<ReturnType<typeof localLandmarkShell>>;

export function towerSquare(shell: Shell) {
  const concrete = '#d6d2c7', reveal = '#8c8b88', lobby = '#3e474d', glow = new Builder();
  // Photographs: the window banks stand on splayed concrete piloti over a recessed glass lobby
  // (base top B), and a blank concrete crown band of about three floors caps the window rows.
  const B = 13, winTop = 186;
  const box = (u: number,v: number,U: number,V: number): P2[] => [[u,v],[U,v],[U,V],[u,V]];
  // The broad faces are deep rectangular recesses bounded by structural concrete.
  const plate = box(-20,-27,20,27);
  shell.prism(plate,shell.base,B,lobby,'#828683');
  shell.prism(plate,B,197,'#505861','#828683');
  for (let face=0;face<4;face++) {
    // Bank faces sit on the mapped outline: ±33.7 m on the long axis, ±26.3 m across.
    const sideways=face%2===1, width=sideways?26.8:19.3, depth=sideways?26.3:33.7, core=sideways?20:27;
    const angle=face*Math.PI/2;
    const point=(u: number,y: number,v: number) => [u*Math.cos(angle)+v*Math.sin(angle),y,u*Math.sin(angle)-v*Math.cos(angle)];
    const pane=(u: number,v: number,lo: number,hi: number,d: number,color: string) =>
      shell.body.quad(point(u,lo,d),point(u,hi,d),point(v,hi,d),point(v,lo,d),color);
    const n=sideways?9:7, floors=42, stride=(winTop-B-1)/floors;
    // A solid bank behind the glazing keeps each storey's recess 0.8 m deep.
    const bank=[point(-width+.05,0,core),point(width-.05,0,core),point(width-.05,0,depth-.8),point(-width+.05,0,depth-.8)];
    shell.prism(bank.map(([x,,z]) => [x,z] as P2),B,197,'#505861','#828683');
    const a=point(-width,0,depth-.65),b=point(width,0,depth-.65);
    shell.facade([a[0],a[2]],[b[0],b[2]],B+1,winTop,floors,2*width/n,.90,.61,['#5b6163','#414b55','#56616c'],.08);
    for(let i=1;i<n;i++) {
      const u=-width+2*width*i/n;
      pane(u-.36,u+.36,B,winTop,depth,concrete);
    }
    // Blank crown band over the top window row, and the transfer beam the piloti carry.
    pane(-width,width,winTop,197,depth,concrete);
    pane(-width,width,B-1.6,B+1,depth,concrete);
    // Splayed piloti: one column under each pier, foot 1.6 m out from the face, head on the beam.
    for(let i=0;i<=n;i++) {
      const u=-width+2*width*i/n, w=.45;
      const foot=(du: number,dv: number)=>point(u+du,shell.base,depth+1.6+dv), head=(du: number,dv: number)=>point(u+du,B-1.6,depth+dv);
      shell.body.quad(foot(-w,0),head(-w,0),head(w,0),foot(w,0),concrete);
      shell.body.quad(foot(w,0),head(w,0),head(w,-.9),foot(w,-.9),concrete);
      shell.body.quad(foot(-w,-.9),head(-w,-.9),head(-w,0),foot(-w,0),concrete);
    }
    for(let row=0;row<floors;row++) {
      const lo=B+1+row*stride, hi=lo+1.44;
      pane(-width,width,lo,hi,depth,concrete);
      for (const y of [lo,hi]) shell.body.quad(point(-width,y,depth),point(width,y,depth),point(width,y,depth-.8),point(-width,y,depth-.8),reveal);
    }
    // Solid end blades return around the window banks, leaving the four notches visible.
    for(const side of [-1,1]) {
      const u=side*width, v=side*(width-.42);
      shell.body.quad(point(u,shell.base,depth),point(u,198,depth),point(u,198,depth-6),point(u,shell.base,depth-6),concrete);
      glow.quad(point(u+side*.03,B,depth-.04),point(u+side*.03,196,depth-.04),
        point(u+side*.03,196,depth-4.8),point(u+side*.03,B,depth-4.8),side>0?'#626bc9':'#a65abc');
      pane(Math.min(u,v),Math.max(u,v),shell.base,198,depth,concrete);
    }
  }
  shell.prism(shell.ring,197,201,concrete,'#b0b0aa');
  shell.prism(box(-19,-28.4,19,28.4),201,sites.towerSquare.heightM,'#c4c3ba','#a1a6a3');
  const model=shell.finish('#f5deb5',.7);
  const material=new MeshBasicMaterial({vertexColors:true,side:DoubleSide,transparent:true,depthWrite:false,opacity:0});
  const wash=new Mesh(glow.geometry(),material);
  wash.name='Tower Square wash';
  wash.visible=false;
  model.group.add(wash);
  return {...model,setNight(factor: number){
    model.setNight(factor);
    material.opacity=.58*factor;
    wash.visible=factor>.001;
  }};
}
