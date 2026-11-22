// Local figure coordinates are metres, +Z forward, with the soles or tires at y=0.
// Parts are shared across the whole board. Only the instance transforms move.
import * as THREE from 'three';
import { Builder } from '../vignette/geom';
import { travellerAt, type Traveller } from './walkways';

type XYZ = [number, number, number];
const chalk = '#ffffff', denim = '#364052', rubber = '#303038';
const jackets = ['#ebb94c', '#c85346', '#377e7b', '#6493bc', '#a46a97'];
const faces = ['#a36a48', '#e4ac84', '#815438', '#cb8a62', '#f1c5a2'];

function oval(b: Builder, at: XYZ, radius: XYZ, color: string) {
  const g = new THREE.SphereGeometry(1, 8, 5).scale(...radius).translate(...at);
  b.addGeometry(g, color);
}

function tube(b: Builder, a: XYZ, end: XYZ, radius: number, color: string) {
  const start = new THREE.Vector3(...a), delta = new THREE.Vector3(...end).sub(start);
  const g = new THREE.CylinderGeometry(radius, radius, delta.length(), 6);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize()));
  const mid = start.addScaledVector(delta, .5);
  b.addGeometry(g.translate(mid.x, mid.y, mid.z), color);
}

function jacket() {
  const b = new Builder();
  oval(b, [0, 1.06, 0], [.247, .369, .17], chalk);
  oval(b, [0, 1.09, -.165], [.15, .20, .09], '#474753'); // little daypack
  return b.geometry();
}
function head() {
  const b = new Builder();
  oval(b, [0, 1.53, .012], [.165, .19, .15], chalk);
  oval(b, [0, 1.65, -.012], [.17, .095, .15], '#523f39');
  return b.geometry();
}
function leg(cycling: boolean) {
  const b = new Builder();
  const knee: XYZ = [0, -.33, cycling ? .29 : .035];
  const ankle: XYZ = [0, cycling ? -.65 : -.72, cycling ? .16 : -.025];
  tube(b, [0, 0, 0], knee, .091, denim);
  tube(b, knee, ankle, .074, denim);
  oval(b, [0, ankle[1], ankle[2] + .05], [.085, .063, .145], rubber);
  return b.geometry();
}
function sleeve() {
  const b = new Builder();
  tube(b, [0, 0, 0], [0, -.27, -.03], .085, chalk);
  tube(b, [0, -.27, -.03], [0, -.46, .065], .066, chalk);
  return b.geometry();
}

function bicycleAndRider() {
  const b = new Builder();
  const tyre = .33, hubY = .335;
  for (const z of [-.54, .54]) {
    const tire = new THREE.TorusGeometry(tyre - .027, .027, 5, 14).rotateY(Math.PI / 2).translate(0, hubY, z);
    b.addGeometry(tire, rubber);
    for (const angle of [0, Math.PI / 3, Math.PI * 2 / 3]) {
      const y = Math.cos(angle) * .30, dz = Math.sin(angle) * .30;
      tube(b, [0, hubY - y, z - dz], [0, hubY + y, z + dz], .012, '#afb4b0');
    }
  }
  const back: XYZ = [0, hubY, -.54], crank: XYZ = [0, .34, -.04];
  const seat: XYZ = [0, .87, -.17], stem: XYZ = [0, .84, .37];
  const paint = '#d8783f';
  tube(b, back, crank, .029, paint); tube(b, back, seat, .029, paint);
  tube(b, seat, crank, .038, paint); tube(b, seat, stem, .037, paint);
  tube(b, crank, stem, .037, paint); tube(b, stem, [0, hubY, .54], .033, paint);
  tube(b, stem, [0, 1.01, .39], .025, rubber);
  tube(b, [-.23, 1.01, .39], [.23, 1.01, .39], .025, rubber);
  oval(b, [0, .92, -.17], [.105, .045, .16], rubber);
  tube(b, [0, 1.01, -.16], [0, 1.37, .075], .173, '#358988');
  for (const x of [-.16, .16]) {
    tube(b, [x, 1.34, .075], [x, 1.13, .22], .067, '#358988');
    tube(b, [x, 1.13, .22], [x, 1.035, .386], .054, '#bd805d');
  }
  oval(b, [0, 1.52, .14], [.15, .165, .14], '#bd805d');
  oval(b, [0, 1.63, .135], [.178, .106, .174], '#ffcb58');
  return b.geometry();
}

const joints = {
  walkingLeg: { x: .096, y: .783, z: 0, swing: .43 },
  walkingArm: { x: .216, y: 1.31, z: 0, swing: -.40 },
  cyclingLeg: { x: .133, y: 1, z: -.16, swing: .23 },
};
type Joint = keyof typeof joints;

function poseLimb(limb: THREE.Object3D, joint: Joint, side: number, stride: number) {
  const pivot = joints[joint];
  limb.position.set(side * pivot.x, pivot.y, pivot.z);
  limb.rotation.x = side * stride * pivot.swing;
  limb.updateMatrix();
}

/** One full-size City figure at the origin, facing +Z. Phase 0..1 is one full cycle. */
export function createFigurePreview(kind: 'walker' | 'cyclist') {
  const group = new THREE.Group();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Map<string, THREE.MeshLambertMaterial>();
  function part(geometry: THREE.BufferGeometry, color = chalk) {
    geometries.add(geometry);
    let material = materials.get(color);
    if (!material) {
      material = new THREE.MeshLambertMaterial({ color, vertexColors: true });
      materials.set(color, material);
    }
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    return mesh;
  }

  const limbs: { mesh: THREE.Mesh; joint: Joint; side: number }[] = [];
  function pair(geometry: THREE.BufferGeometry, joint: Joint, color = chalk) {
    for (const side of [-1, 1]) limbs.push({ mesh: part(geometry, color), joint, side });
  }
  if (kind === 'walker') {
    part(jacket(), jackets[0]);
    part(head(), faces[0]);
    pair(sleeve(), 'walkingArm', jackets[0]);
    pair(leg(false), 'walkingLeg');
  } else {
    part(bicycleAndRider());
    pair(leg(true), 'cyclingLeg');
  }

  function setPhase(cycle: number) {
    const stride = Math.sin((cycle % 1) * 2 * Math.PI);
    for (const { mesh, joint, side } of limbs) poseLimb(mesh, joint, side, stride);
  }
  setPhase(0);
  return {
    group, setPhase,
    dispose() {
      group.removeFromParent();
      for (const geometry of geometries) geometry.dispose();
      for (const material of materials.values()) material.dispose();
      geometries.clear();
      materials.clear();
    },
  };
}

// At overview scale a person covers only a few pixels. Keep the coat, head
// and base silhouette in one inexpensive draw, reserving limbs for close views.
function distantFigure(rider: boolean) {
  const b = new Builder();
  b.addGeometry(new THREE.CylinderGeometry(.19, .13, .57, 4).translate(0, 1.04, 0), chalk);
  b.addGeometry(new THREE.OctahedronGeometry(.19).translate(0, 1.51, .02), '#daad86');
  if (rider) {
    for (const z of [-.54, .54]) {
      b.addGeometry(new THREE.CircleGeometry(.33, 6).rotateY(Math.PI / 2).translate(0, .33, z), rubber);
      b.addGeometry(new THREE.CircleGeometry(.33, 6).rotateY(-Math.PI / 2).translate(0, .33, z), rubber);
    }
    b.box(.20, .22, 1.05, 0, .57, 0, rubber);
  } else {
    b.addGeometry(new THREE.CylinderGeometry(.14, .105, .76, 4).translate(0, .38, 0), denim);
  }
  return b.geometry();
}

export class StreetFigures {
  readonly group = new THREE.Group();
  private readonly material = new THREE.MeshLambertMaterial({ vertexColors: true });
  private readonly root = new THREE.Object3D();
  private readonly limb = new THREE.Object3D();
  private readonly matrix = new THREE.Matrix4();
  private readonly coat: THREE.InstancedMesh;
  private readonly face: THREE.InstancedMesh;
  private readonly arms: THREE.InstancedMesh;
  private readonly legs: THREE.InstancedMesh;
  private readonly cycles: THREE.InstancedMesh;
  private readonly pedals: THREE.InstancedMesh;
  private readonly distantWalkers: THREE.InstancedMesh;
  private readonly distantRiders: THREE.InstancedMesh;
  private readonly projection = new THREE.Matrix4();
  private readonly previousProjection = new THREE.Matrix4();
  private readonly frustum = new THREE.Frustum();
  private readonly bounds = new THREE.Sphere(new THREE.Vector3(), 1.5);
  private readonly tint = new THREE.Color();
  private tick = NaN;
  private viewportHeight = 0;

  constructor(private readonly people: Traveller[], private readonly ground: (x: number, z: number) => number | null,
    private readonly low: boolean) {
    const riders = people.filter(p => p.rider).length, walkers = people.length - riders;
    const batch = (geometry: THREE.BufferGeometry, capacity: number) => {
      const mesh = new THREE.InstancedMesh(geometry, this.material, capacity);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      this.group.add(mesh);
      return mesh;
    };
    this.coat = batch(jacket(), walkers);
    this.face = batch(head(), walkers);
    this.arms = batch(sleeve(), walkers * 2);
    this.legs = batch(leg(false), walkers * 2);
    this.cycles = batch(bicycleAndRider(), riders);
    this.pedals = batch(leg(true), riders * 2);
    this.distantWalkers = batch(distantFigure(false), walkers);
    this.distantRiders = batch(distantFigure(true), riders);
  }

  private joint(batch: THREE.InstancedMesh, index: number, joint: Joint, side: number, stride: number) {
    poseLimb(this.limb, joint, side, stride);
    batch.setMatrixAt(index, this.matrix.multiplyMatrices(this.root.matrix, this.limb.matrix));
  }

  update(ms: number, camera: THREE.PerspectiveCamera, viewportHeight: number) {
    const step = this.low ? 80 : 40;
    const tick = Math.floor(ms / step);
    camera.updateMatrixWorld();
    this.projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    if (this.tick === tick && viewportHeight === this.viewportHeight && this.projection.equals(this.previousProjection)) return;
    this.viewportHeight = viewportHeight;
    this.previousProjection.copy(this.projection);
    this.frustum.setFromProjectionMatrix(this.projection);
    const focalPixels = viewportHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const detailRangeSq = (1.7 * focalPixels / (this.low ? 6 : 4)) ** 2;
    this.tick = tick;
    let walker = 0, rider = 0, farWalker = 0, farRider = 0;
    for (const person of this.people) {
      const p = travellerAt(person, tick * step / 1000);
      const y = this.ground(p.x, p.z);
      if (y === null) continue;
      this.bounds.center.set(p.x, y + .85, p.z);
      if (!this.frustum.intersectsSphere(this.bounds)) continue;
      this.root.position.set(p.x, y, p.z);
      this.root.rotation.y = p.angle;
      this.root.scale.setScalar(person.size);
      this.root.updateMatrix();
      if (this.bounds.center.distanceToSquared(camera.position) > detailRangeSq) {
        const mesh = person.rider ? this.distantRiders : this.distantWalkers;
        const index = person.rider ? farRider++ : farWalker++;
        mesh.setMatrixAt(index, this.root.matrix);
        mesh.setColorAt(index, this.tint.set(person.rider ? '#67a99d' : jackets[person.tint]));
      } else if (person.rider) {
        this.cycles.setMatrixAt(rider, this.root.matrix);
        for (let i = 0; i < 2; i++) {
          const side = i * 2 - 1;
          this.joint(this.pedals, rider * 2 + i, 'cyclingLeg', side, p.stride);
        }
        rider++;
      } else {
        this.coat.setMatrixAt(walker, this.root.matrix);
        this.face.setMatrixAt(walker, this.root.matrix);
        this.face.setColorAt(walker, this.tint.set(faces[person.tint]));
        this.coat.setColorAt(walker, this.tint.set(jackets[person.tint]));
        this.arms.setColorAt(walker * 2, this.tint);
        this.arms.setColorAt(walker * 2 + 1, this.tint);
        for (let i = 0; i < 2; i++) {
          const side = i * 2 - 1;
          this.joint(this.legs, walker * 2 + i, 'walkingLeg', side, p.stride);
          this.joint(this.arms, walker * 2 + i, 'walkingArm', side, p.stride);
        }
        walker++;
      }
    }
    this.legs.count = this.arms.count = walker * 2;
    this.coat.count = this.face.count = walker;
    this.cycles.count = rider;
    this.pedals.count = rider * 2;
    this.distantWalkers.count = farWalker;
    this.distantRiders.count = farRider;
    for (const child of this.group.children) {
      const mesh = child as THREE.InstancedMesh;
      if (!mesh.count) continue;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  dispose() {
    for (const child of this.group.children) {
      const mesh = child as THREE.InstancedMesh;
      mesh.dispose(); mesh.geometry.dispose();
    }
    this.material.dispose();
    this.group.removeFromParent();
  }
}
