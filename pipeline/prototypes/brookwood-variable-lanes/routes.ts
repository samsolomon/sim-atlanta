import type { Ribbon } from '../../../web/src/terrain/connector-corridor';
import { stripePoint } from '../../../web/src/terrain/connector-corridor';
import type { P2 } from '../../../web/src/vignette/geom';
import type { VRoad } from '../../../web/src/vignette/world';
import axes from './axes.json';
import { drop, endGain, gain, nbTail } from './profile';

const owners = [axes['369529886'],axes['9238434']].map((a,i):VRoad=>({
  cls:'motorway', name:i?null:'Northeast Expressway', sub:i?'link':null,
  bridge:false, tunnel:false, pts:a.pts as P2[],
}));
const tails=[nbTail(false),nbTail(true)];

export function variablePiece(r:Ribbon,lane:number,legacy:P2[],owner:VRoad) {
  const ordinal=(branch:boolean)=>branch?.5:(lane+.5)/5;
  const side=(branch:boolean)=>branch?'ramp':'main';
  if(r.id===369529900) {
    const branch=lane===5;
    const continuation=drop.slice(1).map(row=>stripePoint(row[side(branch)],ordinal(branch)));
    for(const row of tails[Number(branch)].slice(1)) continuation.push(stripePoint(row,ordinal(branch)));
    return {pts:legacy.concat(continuation),owners:[
      ...legacy.slice(1).map(()=>owner),// The six-lane landing carries both destinations to its ground tie.
      ...drop.slice(1).map(row=>owners[Number(branch && row.s>40)]),
      ...tails[Number(branch)].slice(1).map(()=>owners[Number(branch)])]};
  }
  if(r.id===484857195||r.id===1257642775||r.id===369529905) {
    const downstream=r.id===369529905;
    const branch=r.id===1257642775 || downstream && lane===5;
    const pts=gain.filter(row=>downstream?row.s>=0:row.s<=0)
      .map(row=>stripePoint(row[side(branch)],ordinal(branch)));
    if(downstream) pts.push(...legacy.filter((_,i)=>r.rows[i].s>endGain));
    return {pts,owners:pts.slice(1).map(()=>owner)};
  }
}
