import * as THREE from 'three';
import { expect, it } from 'vitest';
import { listenForTap, pickVehicle } from './pick';

const camera = new THREE.PerspectiveCamera(45, 1, 1, 1000);
camera.position.set(0, 100, 0);
camera.up.set(0, 0, -1);
camera.lookAt(0, 0, 0);
camera.updateMatrixWorld();

it('picks the nearest drawn vehicle within 24 CSS pixels and ignores expired buses', () => {
  const bus = { id: 'bus', x: 0, y: 0, z: 0, a: 0 };
  const group = new THREE.Group();
  expect(pickVehicle(224,200,400,400,camera,group,[bus],[],[])).toEqual({ kind:'bus', id:'bus' });
  expect(pickVehicle(225,200,400,400,camera,group,[bus],[],[])).toBeNull();
  expect(pickVehicle(200,200,400,400,camera,group,[],[],[])).toBeNull();
});

it('picks the exposed end of a portal car and skips the clipped end, hidden stock and foreground cover', () => {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial();
  material.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0,0,1),0)];
  const car = new THREE.Mesh(new THREE.BoxGeometry(3,4,23), material);
  car.userData.trainId = 'train';
  group.add(car);
  group.updateMatrixWorld();
  const pick = (z: number, scenery: THREE.Object3D[] = []) => {
    const p = new THREE.Vector3(0, 2, z).project(camera);
    return pickVehicle((1+p.x)*200,(1-p.y)*200,400,400,camera,group,[],[],scenery);
  };
  expect(pick(10)).toEqual({ kind:'train', id:'train' });
  expect(pick(-10)).toBeNull();
  const roof = new THREE.Mesh(new THREE.BoxGeometry(25,1,35));
  roof.position.y = 10;
  roof.updateMatrixWorld();
  expect(pick(10,[roof])).toBeNull();
  roof.material.clippingPlanes = [new THREE.Plane(new THREE.Vector3(1,0,0), -20)];
  expect(pick(10,[roof])).toEqual({ kind:'train', id:'train' });
  car.visible = false;
  expect(pick(10)).toBeNull();
});

it('preserves drag and pinch gestures, including a drag that returns to its start', () => {
  const canvas = new EventTarget() as HTMLCanvasElement;
  const taps: number[] = [];
  const stop = listenForTap(canvas, x => taps.push(x));
  const send = (type: string, id: number, x: number) => canvas.dispatchEvent(Object.assign(new Event(type), {
    pointerId: id, isPrimary: id === 1, button: 0, clientX: x, clientY: 5,
  }));
  send('pointerdown', 1, 4);
  send('pointermove', 1, 20);
  send('pointerup', 1, 4);
  send('pointerdown', 1, 4);
  send('pointerdown', 2, 10);
  send('pointerup', 2, 10);
  send('pointerup', 1, 4);
  send('pointerdown', 1, 4);
  send('pointercancel', 1, 4);
  send('pointerup', 1, 4);
  expect(taps).toEqual([]);
  send('pointerdown', 1, 4);
  send('pointerup', 1, 6);
  stop();
  send('pointerdown', 1, 4);
  send('pointerup', 1, 4);
  expect(taps).toEqual([6]);
});
