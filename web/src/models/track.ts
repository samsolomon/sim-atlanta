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

export function labTrack() {
  const track = new THREE.Group();
  track.add(box(3.6, LEVELS.ballast, 60, '#8d877d'));
  for (const x of [-0.72, 0.72]) {
    const rail = box(0.1, LEVELS.rail, 60, '#6b625b');
    rail.position.x = x;
    track.add(rail);
  }
  for (let z = -30; z < 30; z += 0.7) {
    const tie = box(2.6, LEVELS.sleeper, 0.26, '#9b968c');
    tie.position.z = z;
    track.add(tie);
  }
  return track;
}
