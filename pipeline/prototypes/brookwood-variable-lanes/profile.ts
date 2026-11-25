// Directed plan sections. The five through lanes always occupy the left group.
// Each ordered edge pair describes a travel strip, separate from its shoulders.
import axes from './axes.json';
import { Line, type P2 } from '../../../web/src/vignette/geom';
import { mix, ribbons, sectionAt, stripePoint, type Section } from '../../../web/src/terrain/connector-corridor';
import { PAL } from '../../../web/src/vignette/world';

const way = (id: keyof typeof axes) => new Line(axes[id].pts as P2[]);
const ribbon = (id: number) => ribbons.find(r => r.id === id)!;
const nb = way('369529886'), exit = way('9238434');
const sb = ribbon(484857195), entrance = ribbon(1257642775), receiving = ribbon(369529905);
const width = 3.55;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const displaced = (axis: Line, s: number, off: number): P2 => {
  const p = axis.at(s);
  return [p.x - p.nx * off, p.z - p.nz * off];
};
const edges = (axis: Line, s: number, a: number, b: number): Section =>
  ({ s, inner: displaced(axis,s,a), outer: displaced(axis,s,b) });
const part = (row: Section, a: number, b: number) =>
  ({s: row.s, inner: stripePoint(row,a), outer: stripePoint(row,b)});
const blend = (a: Section, b: Section, f: number) =>
  ({s:b.s, inner:mix(a.inner,b.inner,f), outer:mix(a.outer,b.outer,f)});
function linear(table: number[][], s: number) {
  const i = table.findIndex(p => p[0] >= s);
  if (i < 0) return table[table.length-1][1];
  if (!i) return table[0][1];
  const [x,y] = table[i-1], [xx,yy] = table[i];
  return y + (yy-y)*(s-x)/(xx-x);
}

export type Movement = 'gain' | 'drop';
function entranceSections(s: number) {
    const t = clamp(1+s/sb.line.length);
    const joined = sectionAt(receiving, Math.max(0,s));
    const oldMain = s<0 ? sectionAt(sb,t*sb.line.length) : part(joined,0,5/6);
    const oldRamp = s<0 ? sectionAt(entrance,t*entrance.line.length) : part(joined,5/6,1);
    const axis = s<0 ? sb.line : receiving.line;
    const a = s<0 ? s+sb.line.length : s;
    const divider = linear([[-80,8.25],[-50,7.25],[-20,7],[0,6.45]],s);
    const gap = linear([[-80,1.25],[-50,1],[-35,.75],[-20,0]],s);
    const f = clamp((s+84)/14)*clamp((75-s)/30);
    return { main:blend(oldMain,edges(axis,a,divider-5*width,divider),f),
      ramp:blend(oldRamp,edges(axis,a,divider+gap,divider+gap+width),f), solid:s < -18 };
}

// The approach joins the incoming source sections to the aerial-fitted taper.
// Match each physical edge and its tangent at the ties; the two source axes
// reach the same normalized station at different longitudinal positions.
const gainStart = -sb.line.length;
const gainTie = -40;
const gainSpan = gainTie - gainStart;
const startRow = entranceSections(gainStart);
const startNext = entranceSections(gainStart + 1);
const endRow = entranceSections(gainTie);
const endNext = entranceSections(gainTie + 1);

function approachRow(s: number, which: 'ramp' | 'main'): Section {
  const t = (s-gainStart)/gainSpan, u = 1-t;
  function point(edge: 'inner' | 'outer'): P2 {
    const a = startRow[which][edge], b = endRow[which][edge];
    const c = startNext[which][edge], d = endNext[which][edge];
    const at = (i:number) => u*u*(1+2*t)*a[i] + t*t*(3-2*t)*b[i]
      + gainSpan*t*u*(u*(c[i]-a[i])-t*(d[i]-b[i]));
    return [at(0),at(1)];
  }
  return {s,inner:point('inner'),outer:point('outer')};
}

export function entranceShoulderTie(s:number) {
  const t=clamp((s-gainStart)/(gainTie-gainStart));
  return t*t*(3-2*t);
}
export function sections(m: Movement, s: number) {
  if (m === 'gain') {
    if(s>=gainStart && s<gainTie) return {main:approachRow(s,'main'),ramp:approachRow(s,'ramp'),solid:true};
    return entranceSections(s);
  }
  const end = ribbon(369529900);
  const old = sectionAt(end,end.line.length);
  const common = blend(old,edges(nb,s,-3*width,3*width),clamp(s/10));
  const divider = linear([[40,2*width],[75,7.5],[145,7.25],[220,7.5],[260,7]],s);
  const gap = linear([[110,0],[145,1],[170,2.25],[195,3.5],[220,5],[260,6.75]],s);
  const f=clamp((s-40)/30);
  const main=blend(part(common,0,5/6),edges(nb,s,divider-5*width,divider),f);
  const ramp=blend(part(common,5/6,1),edges(nb,s,divider+gap,divider+gap+width),f);
  // Resume each independently mapped axis downstream of the aerial fork.
  const mainTie=clamp((s-260)/70);
  const rampTie=clamp((s-260)/70);
  const rampS=s*exitAt330/330;
  return {main:blend(main,edges(nb,s,-2.5*width,2.5*width),mainTie),
    ramp:blend(ramp,edges(exit,rampS,-width/2,width/2),rampTie),solid:s>=110};
}
// Project the downstream through station onto the actual exit centreline.
import { alongOn } from '../../../web/src/terrain/connector-corridor';
const p330 = nb.at(330);
const exitAt330 = alongOn({pts:exit.pts,line:exit},[p330.x,p330.z]).s;
export const startGain = -sb.line.length;
export const endGain = 75;
export const endDrop = 330;
export const planRows = (m: Movement) => {
  const start=m==='gain'?startGain:0, end=m==='gain'?endGain:endDrop;
  const stations = new Set([start,end,0]);
  for(let s=Math.ceil(start);s<end;s++) stations.add(s);
  return [...stations].sort((a,b)=>a-b).map(s=>({s,...sections(m,s)}));
};
export const gain = planRows('gain'), drop = planRows('drop');
export const nbTail = (branch:boolean) => {
  const axis=branch?exit:nb, start=branch?exitAt330:330;
  const stations=new Set([start,...axis.cum.filter(s=>s>start)]);
  for(let s=start+3;s<axis.length;s+=3) stations.add(s);
  const half=width*(branch?.5:2.5);
  return [...stations].sort((a,b)=>a-b).map(s=>edges(axis,s,-half,half));
};
const tails=[nbTail(false),nbTail(true)];
export function paintVariable(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.lineCap='butt';
  function strip(rows: Section[], lanes:number, ramp:boolean, sharedEdge:(s:number)=>boolean,phase:number,gainJoin=false) {
    function fill(a:number,b:number,color:string) {
      ctx.beginPath();ctx.moveTo(...stripePoint(rows[0],a));
      for(const r of rows.slice(1)) ctx.lineTo(...stripePoint(r,a));
      for(let i=rows.length-1;i>=0;i--)ctx.lineTo(...stripePoint(rows[i],b));
      ctx.closePath();ctx.fillStyle=color;ctx.fill();
    }
    // The facing shoulders grow only into the available gap, below the travel surface.
    ctx.beginPath();
    for (const [i,row] of rows.entries()) {
      const tie=gainJoin ? clamp((row.s-45)/30) : 0;
      const p=stripePoint(row,ramp?0:-(1.8+.4*tie)/(lanes*width));
      if(i===0)ctx.moveTo(...p);else ctx.lineTo(...p);
    }
    for(const row of [...rows].reverse()){
      const tie=gainJoin ? clamp((row.s-45)/30) : 0;
      ctx.lineTo(...stripePoint(row,ramp?1+(1.8+tie)/width:1));
    }
    ctx.closePath();ctx.fillStyle='#66666c';ctx.fill();
    fill(0,1,PAL.asphaltHwy);
    for(let i=0;i<=lanes;i++){
      ctx.beginPath();
      for(let j=1;j<rows.length;j++){
        const a=rows[j-1],b=rows[j],s=(a.s+b.s)/2;
        const separator=ramp?i===0:i===lanes;
        if(separator && !sharedEdge(s) && ramp)continue;
        const dashed=(separator?!sharedEdge(s):i>0&&i<lanes&&i!==1);
        if(dashed && ((s+phase)%12+12)%12>=3)continue;
        ctx.moveTo(...stripePoint(a,i/lanes));ctx.lineTo(...stripePoint(b,i/lanes));
      }
      ctx.strokeStyle=!ramp && i===0?PAL.lineYellow:PAL.lineWhite;
      ctx.lineWidth=.28;ctx.stroke();
    }
  }
  for(const [rows,isGain] of [[gain,true],[drop,false]] as const) {
    const active=rows.filter(r=>isGain||r.s>=40);
    const solid=(s:number)=>isGain?s< -18:s>=110;
    // The widening gore has two observed white edges and a paved nose.
    ctx.beginPath();
    for(const [i,r] of active.entries()) {
      if(i===0)ctx.moveTo(...r.main.outer);else ctx.lineTo(...r.main.outer);
    }
    for(const r of [...active].reverse())ctx.lineTo(...r.ramp.inner);
    ctx.closePath();ctx.fillStyle='#66666c';ctx.fill();
    for(const branch of [false,true]) strip(active.map(r=>({...(branch ? r.ramp : r.main),s:r.s})),branch?1:5,branch,solid,0,isGain);
  }
  tails.forEach((rows,i)=>strip(rows,i?1:5,!!i,()=>true,i?330-exitAt330:0));
  ctx.restore();
}
