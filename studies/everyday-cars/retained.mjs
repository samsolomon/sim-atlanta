// Reference the stock road meshes. The semi uses the reviewed traffic model's fifth-wheel offset.
import { vehicleGeometry } from '../../web/src/vignette/vehicles.ts';
import { Color } from '../../web/node_modules/three/build/three.module.js';
export function retained(style, paint) {
  const faces = [];
  function add(kind, dz = 0) {
    const geometry = vehicleGeometry(kind);
    const {position, aKind, color} = geometry.attributes;
    for (let i = 0; i < position.count; i += 3) {
      const points = [i,i+1,i+2].map(j=>[position.getX(j),position.getY(j),position.getZ(j)+dz]);
      const raw = '#' + new Color().fromBufferAttribute(color,i).getHexString();
      const colors = [kind==='trailer'?'#eeece6':paint,'#e6e7d8','#a34649','#35454f',raw];
      faces.push({points,color:colors[aKind.getX(i)]});
    }
    geometry.dispose();
  }
  if (style === 'semi') { add('tractor',5.8775); add('trailer',-2.3225); } else add(style);
  return faces;
}
