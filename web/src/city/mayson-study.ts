import * as THREE from 'three';
import fixture from './fixtures/mayson-study.json';

export function mountMayson() {
  const group = new THREE.Group();
  group.name = 'Mayson inferred carriers';
  for (const surface of fixture.surfaces) {
    const geometry = new THREE.BufferGeometry();
    const xyz = surface.tiles.flat(1).flatMap(triangle => triangle.flatMap(vertex => vertex.slice(0, 3)));
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(xyz, 3));
    geometry.computeVertexNormals();
    const road = surface.way === 9270932 || surface.way === 429349499;
    const mesh = new THREE.Mesh(geometry, new THREE.MeshLambertMaterial({
      color: road ? 0x756e65 : 0x695f53, side: THREE.DoubleSide,
    }));
    mesh.userData.way = surface.way;
    mesh.name = 'Carrier ' + surface.way;
    group.add(mesh);
  }
  return group;
}
