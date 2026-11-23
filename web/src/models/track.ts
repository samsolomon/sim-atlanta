/** The Model Lab's short length of track: ballast, sleepers and rails, standing on the ground disc at y = 0. */
import * as THREE from 'three';

/**
 * No face may share a plane with the ground disc at y = 0. A ballast top exactly at 0 z-fought
 * with it, so the bed flickered and the ink pass drew broken lines along the sleepers. The top now
 * sits 3 cm up, 2 cm below the sleeper tops, and the bottom is sunk below the ground.
 */
export const LEVELS = {
  ballast: [-0.05, 0.03],
  sleeper: [-0.09, 0.05],
  rail: [-0.025, 0.125], // railhead at 0.125, where the vehicle models stand
} as const;

const box = (w: number, [y0, y1]: readonly [number, number], l: number, color: string) => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, y1 - y0, l), new THREE.MeshLambertMaterial({ color }));
  mesh.position.y = (y0 + y1) / 2;
  return mesh;
};

export function labTrack(length = 60) {
  const track = new THREE.Group();
  track.add(box(3.6, LEVELS.ballast, length, '#8d877d'));
  for (const x of [-0.72, 0.72]) {
    const rail = box(0.1, LEVELS.rail, length, '#6b625b');
    rail.position.x = x;
    track.add(rail);
  }
  const tie = box(2.6, LEVELS.sleeper, 0.26, '#9b968c');
  const count = Math.floor(length / .7);
  const sleepers = new THREE.InstancedMesh(tie.geometry, tie.material, count);
  const matrix = new THREE.Matrix4();
  for (let i=0; i<count; i++) {
    sleepers.setMatrixAt(i, matrix.makeTranslation(0,tie.position.y,(i-(count-1)/2)*.7));
  }
  track.add(sleepers);
  return track;
}
