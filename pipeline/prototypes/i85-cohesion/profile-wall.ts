// Stations refer to a continuous directed carrier. Elevations use the caller's scene datum.
import { Builder, Line, type P2 } from '../../../web/src/vignette/geom';
export interface RoadWall {
  side: 'left'|'right';
  bounds: [number,number];
  evidence: {extent:string; top:string; toe:string};
  interruptions: {from:number;to:number;feature:string}[];
  breaks: number[]; // source nodes, tile intersections, grade and width transitions
  section: (s:number,side:RoadWall['side'])=>{edge:P2;top:number;toe:number}|null;
}

export function drawRoadWall(builder:Builder, profile:RoadWall) {
  const [start,end]=profile.bounds;
  const stations=new Set([start,end,...profile.breaks,...profile.interruptions.flatMap(g=>[g.from,g.to])]);
  for(let s=Math.ceil(start/2)*2;s<end;s+=2)stations.add(s);
  const ordered=[...stations].filter(s=>s>=start&&s<=end).sort((a,b)=>a-b);
  for(let i=1;i<ordered.length;i++){
    const lo=ordered[i-1],hi=ordered[i],mid=(lo+hi)/2;
    if(hi-lo<1e-7 || profile.interruptions.some(g=>mid>=g.from&&mid<g.to))continue;
    const a=profile.section(lo,profile.side), b=profile.section(hi,profile.side);
    if(!a||!b||a.top<=a.toe||b.top<=b.toe)continue;
    const line=new Line([a.edge,b.edge]);
    if(line.length<1e-7)continue;
    const blend=(y:number,z:number,t:number)=>y+(z-y)*t/line.length;
    // Keep panel course count fixed across adjacent sections and both board tiles.
    for(let j=0;j<4;j++){
      const h=(t:number,f:number)=>blend(a.toe+(a.top-a.toe)*f,b.toe+(b.top-b.toe)*f,t);
      const colors=['#aaa398','#b3ac9e','#aea89a'];
      builder.wall(line,0,t=>h(t,j/4),t=>h(t,(j+1)/4),
        colors[((Math.floor(mid/2)+j)%3+3)%3],line.length);
    }
  }
}
