// The modeled mainline continues beyond this branch. The walk to Mayson turns
// onto the existing three-node access way at its shared (interior) source node.
import { Line, type P2 } from '../../../web/src/vignette/geom';
import { alongOn } from '../../../web/src/terrain/connector-corridor';
import { trailAxis, trailHalfWidth, trailPoint } from './path';
import access from './access.json';

const fork = trailAxis.pts.findIndex(p=>p[0]===access.axis[0][0] && p[1]===access.axis[0][1]);
if(fork<0)throw new Error('Missing Mayson access node in the directed trail');
export const accessStation=trailAxis.cum[fork];
export const trailDriveAxis=new Line([...trailAxis.pts.slice(0,fork+1), ...access.axis.slice(1) as P2[]]);

// The private R16 ground map already paints 1396654839 and its receiving street.
// Once the probe leaves the elevated concrete footprint, sample that drawn surface.
export function trailDrivePoint(s:number, ground:(x:number,z:number)=>number|null) {
  if(s<=accessStation)return trailPoint(s);
  const p=trailDriveAxis.at(s), near=alongOn({line:trailAxis,pts:trailAxis.pts},[p.x,p.z]);
  const h=near.distance<=trailHalfWidth ? trailPoint(near.s)[1] : ground(p.x,p.z);
  if(h===null)throw new Error('Missing mounted Mayson access surface');
  return [p.x,h,p.z] as [number,number,number];
}
