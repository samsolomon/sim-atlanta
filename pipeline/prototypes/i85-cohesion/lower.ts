// Private corridor fixture. Stations increase from GA 13 SB toward I-85 SB.
import raw from './ways.json';
import { Line, type P2 } from '../../../web/src/vignette/geom';
import { PAL } from '../../../web/src/vignette/world';

const way = (id: number) => raw.find(row => row.id === id)!.axis as P2[];
const approach = new Line(way(9238427));
export const boreLength = new Line(way(38981788)).length;
export const lowerAxis = new Line([...approach.pts, ...way(38981788).slice(1), ...way(38981789).slice(1)]);
export const east = approach.length;
export const west = east + boreLength;
export const lowerEdges = [-2.375, 2.575] as const; // metres right of source travel

type Ground = (x: number, z: number) => number | null; // existing exposed tread in scene metres
export function lowerPoint(station: number, offset: number, exposed: Ground) {
  if (station < east - 15 || station > west + 25 || offset < lowerEdges[0] || offset > lowerEdges[1]) return null;
  const p = lowerAxis.at(station);
  const back = lowerAxis.at(station - 0.5), ahead = lowerAxis.at(station + 0.5);
  const len = Math.hypot(ahead.x-back.x,ahead.z-back.z);
  const x = p.x - (ahead.z-back.z)*offset/len, z = p.z + (ahead.x-back.x)*offset/len;
  const s = station-east;
  const t = Math.min(1,Math.max(0,(s-5)/boreLength));
  // End tangents use independent exposed class-2 windows. Concealed grade is inferred.
  const rise = 256.13 - 252.61;
  let navd = 252.61 + rise*t + (0.014*boreLength-rise)*t*(1-t)*(1-2*t);
  if (s < 5) navd = 252.61 + (s-5)*0.014;
  if (station > west+5) navd = 256.13 + (station-west-5)*0.014;
  const weight = Math.max(0,-s/15,(station-west-10)/15);
  let y = navd - 323.8;
  if (weight > 0) {
    const h = exposed(x,z);
    if (h == null) return null;
    y += weight*(h-y);
  }
  return [x,y,z] as [number, number, number];
}

export function lowerStrips(exposed: Ground, emit: (
  vertices: [number,number,number][], color: string, tread: boolean
) => void) {
  const lo=east-15, hi=west+25;
  const stations=new Set([lo,hi,east,west,west+5,west+10,...lowerAxis.cum.filter(s=>s>lo && s<hi)]);
  for(let s=lo+1;s<hi;s++) stations.add(s);
  const rows=[...stations].sort((a,b)=>a-b);
  const strips: [number,number,string,boolean][] = [
    [lowerEdges[0],-1.775, '#66666c',true],[-1.775,1.775,PAL.asphaltHwy,true],
    [1.775,lowerEdges[1],'#66666c',true],[-1.875,-1.675,PAL.lineWhite,false],[1.675,1.875,PAL.lineWhite,false],
  ];
  for (let i=1;i<rows.length;i++) for(const [a,b,color,tread] of strips) {
    const quad=[lowerPoint(rows[i-1],a,exposed),lowerPoint(rows[i],a,exposed),
      lowerPoint(rows[i],b,exposed),lowerPoint(rows[i-1],b,exposed)];
    if(quad.some(p=>!p)) continue;
    const vs=quad.map(p=>p!);
    if(!tread) for(const p of vs) p[1]+=.012;
    emit([vs[0],vs[2],vs[1],vs[0],vs[3],vs[2]],color,tread);
  }
}
