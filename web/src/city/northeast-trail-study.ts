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
  const tread = new THREE.Mesh(paved.geometry(), material);
  tread.name = 'Northeast Trail concrete tread and GA 13 bridge';
  const tunnel = new Builder();
  const slots = trailOpening(exposed, tunnel.quad.bind(tunnel));
  const lining = new THREE.Mesh(tunnel.geometry(), material);
  lining.name = 'Northeast Trail pedestrian tunnel lining';
  return {
    tread, lining, slots, yields: trailYields(),
    dispose() { tread.geometry.dispose(); lining.geometry.dispose(); material.dispose(); },
  };
}
