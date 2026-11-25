// Private post-road ground-map pass. The accepted I-85 NB tread owns its own material.
import raw from './ways.json';
import { paintSouthbound } from '../brookwood-lanes/profile';
import { Line, type P2 } from '../../../web/src/vignette/geom';
import { PAL } from '../../../web/src/vignette/world';
import { ribbons, sectionAt, stripePoint } from '../../../web/src/terrain/connector-corridor';

const source = (id: number) => raw.find(w => w.id === id)!;
const axis = (id: number) => new Line(source(id).axis as P2[]);
const specs = [
  {id:879130781,phase:0},{id:187141934,phase:0},
  {id:38981789,phase:axis(9238427).length+axis(38981788).length},
];
const roads = specs.map(({id,phase}) => {
  const line=axis(id),lanes=Number(source(id).tags.lanes);
  const ribbon=ribbons.find(r=>r.id===id);
  const stations=new Set([0,line.length,...line.cum,...ribbon?.rows.map(r=>r.s)??[]]);
  for(let s=0;s<line.length;s+=2) stations.add(s);
  for(let s=-phase%12;s<line.length;s+=12) {
    if(s>=0) stations.add(s);
    if(s+3>0 && s+3<line.length) stations.add(s+3);
  }
  const rows=[...stations].filter(s=>s>=0 && s<=line.length).sort((a,b)=>a-b).map(s=>{
    const p=line.at(s), width=lanes*3.55;
    const row=ribbon?sectionAt(ribbon,Math.min(s,ribbon.line.length)):{
      s,inner:[p.x+p.nx*width/2,p.z+p.nz*width/2] as P2,
      outer:[p.x-p.nx*width/2,p.z-p.nz*width/2] as P2,
    };
    return {s,row,z:p.z};
  });
  return {id,phase,lanes,rows};
});

export function paintI85Corridor(ctx: CanvasRenderingContext2D, board: string) {
  if(board!=='brookwood-station' && board!=='r16') return;
  paintSouthbound(ctx);
  ctx.save();
  ctx.beginPath();
  ctx.rect(600,-5800,455,215); // open approaches around the seam; structure owners draw their spans
  ctx.clip();
  ctx.lineCap='butt';
  for(const {id,lanes,phase,rows} of roads) {
    const width=lanes*3.55;
    const link=id===38981789;
    const ga=id===879130781 || id===187141934;
    const inside=link?.6:ga?(14-width)/2:2.2, outside=link?.8:ga?(14-width)/2:2.8;
    const active=rows.filter(({z})=>z>=-5803 && z<=-5582);
    if(active.length<2) continue;
    const band=(left:number,right:number,color:string)=>{
      ctx.beginPath();
      for(const [index,r] of active.entries()){
        const p=stripePoint(r.row,left); if(index===0)ctx.moveTo(...p);else ctx.lineTo(...p);
      }
      for(let i=active.length-1;i>=0;i--) ctx.lineTo(...stripePoint(active[i].row,right));
      ctx.closePath(); ctx.fillStyle=color;ctx.fill();
    };
    band(-inside/width,1+outside/width,'#66666c');
    band(0,1,PAL.asphaltHwy);
    for(let i=0;i<=lanes;i++){
      const edge=i===0||i===lanes;
      ctx.strokeStyle=i===0&&!link?PAL.lineYellow:PAL.lineWhite;
      ctx.lineWidth=edge?.28:.24;
      ctx.beginPath();
      for(let j=1;j<active.length;j++){
        const a=active[j-1],b=active[j];
        if(!edge && ((a.s+b.s)/2+phase)%12>=3)continue;
        ctx.moveTo(...stripePoint(a.row,i/lanes));ctx.lineTo(...stripePoint(b.row,i/lanes));
      }
      ctx.stroke();
    }
  }
  ctx.restore();
}
