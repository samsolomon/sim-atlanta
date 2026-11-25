import { drawAccessApron } from '../../../pipeline/prototypes/northeast-trail/access';
import * as THREE from 'three';
import { drawTrail, trailYields } from '../../../pipeline/prototypes/northeast-trail/path';
import { trailOpening } from '../../../pipeline/prototypes/northeast-trail-opening/portal';
import { Builder } from '../vignette/geom';

export function northeastTrailStudy(
  bounds: Parameters<typeof drawTrail>[1],
  exposed: Parameters<typeof trailOpening>[0],
) {
  const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const paved = new Builder();
  drawTrail(paved, bounds);
  let tread: THREE.Mesh | undefined;
  const tunnel = new Builder();
  const slots = trailOpening(exposed, tunnel.quad.bind(tunnel));
  const lining = new THREE.Mesh(tunnel.geometry(), material);
  lining.name = 'Northeast Trail pedestrian tunnel lining';
  return {
    lining, slots, yields: trailYields(),
    receivingHeight(carriers: THREE.Group, ground: Parameters<typeof drawAccessApron>[1]) {
      const road = carriers.getObjectByName('Carrier 9270932');
      if (!road) throw Error('Missing Mayson Road tread');
      road.updateWorldMatrix(true, false);
      const ray = new THREE.Raycaster();
      ray.ray.direction.set(0, -1, 0);
      return (x: number, z: number) => {
        ray.ray.origin.set(x, 250, z);
        return ray.intersectObject(road, false)[0]?.point.y ?? ground(x, z);
      };
    },
    mountTread(ground: Parameters<typeof drawAccessApron>[1]) {
      drawAccessApron(paved, ground);
      tread = new THREE.Mesh(paved.geometry(), material);
      tread.name = 'Northeast Trail concrete tread and GA 13 bridge';
      return tread;
    },
    dispose() { tread?.geometry.dispose(); lining.geometry.dispose(); material.dispose(); },
  };
}
