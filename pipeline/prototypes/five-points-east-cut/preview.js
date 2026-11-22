// Local Vite study only. Each open mapped way has its own domain and support strip.
import model from './model.json';
import { trackInDaylight } from '/src/vignette/world.ts';

const { tracks, origin, along, across } = model;
const project = (x,z) => [(x-origin[0])*along[0]+(z-origin[1])*along[1],
  (x-origin[0])*across[0]+(z-origin[1])*across[1]];
const off = (track,s) => {
  if (s <= track[0][0]) return track[0][1];
  for (let i=1; i<track.length; i++) {
    const [b,v] = track[i], [a,u] = track[i-1];
    if (s <= b) return u+(s-a)*(v-u)/(b-a);
  }
  return track.at(-1)[1];
};
export function metrics(marta,transport,grid) {
  const intervals=transport.freightTreads.filter(p=>p.length && p[0].s>840 && p[0].s<980)
    .map(p=>[p[0].s,p.at(-1).s]);
  const positions=[];
  for(const s of [15,35,55,75,90]) {
    const f=off(tracks.CSX,s);
    let best=null;
    for(const al of marta) {
      for(let i=1;i<al.line.pts.length;i++) {
        const [a,u]=project(...al.line.pts[i-1]),[b,v]=project(...al.line.pts[i]);
        if(s<Math.min(a,b)||s>Math.max(a,b)||a===b) continue;
        const t=(s-a)/(b-a), centre=u+t*(v-u);
        const d=al.line.cum[i-1]+t*(al.line.cum[i]-al.line.cum[i-1]);
        if(!trackInDaylight(al,d)||Math.abs(centre-f)>30) continue;
        if(!best||Math.abs(centre-f)<Math.abs(best.offset-f)) best={offset:centre,
          bedNavd88:al.elev(d)+grid.manifest.vertical.sceneZeroNavd88M};
      }
    }
    positions.push({s,gtfs:best,csx:f});
  }
  return {intervals,positions};
}
