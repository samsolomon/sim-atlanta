// Local figure coordinates are metres, +Z forward, with the soles or tires at y=0.
// Parts are shared across the whole board. Only the instance transforms move.
import * as THREE from 'three';
import { FigureBuilder, figureLooks, figureMaterial } from './figure-looks';
import { highSeated, highSeats, highWalkers, highWalkerPose, museumCrowd } from './high-visitors';
import { strideAngle, travelSpeed, travellerAt, type Traveller } from './walkways';

type XYZ = [number, number, number];
const rubber = '#303038';

function oval(b: FigureBuilder, at: XYZ, radius: XYZ, color: string) {
  const g = new THREE.SphereGeometry(1, 8, 5).scale(...radius).translate(...at);
  b.addGeometry(g, color);
}

function tube(b: FigureBuilder, a: XYZ, end: XYZ, radius: number, color: string) {
  const start = new THREE.Vector3(...a), delta = new THREE.Vector3(...end).sub(start);
  const g = new THREE.CylinderGeometry(radius, radius, delta.length(), 6);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize()));
  const mid = start.addScaledVector(delta, .5);
  b.addGeometry(g.translate(mid.x, mid.y, mid.z), color);
}

function jacket() {
  const b = new FigureBuilder();
  oval(b, [0, 1.06, 0], [.247, .369, .17], 'top');
  oval(b, [0, 1.08, -.172], [.16, .21, .105], 'pack');
  for (const x of [-.105, .105]) {
    tube(b, [x, 1.30, -.14], [x, 1.39, .025], .028, 'pack');
    tube(b, [x, 1.39, .025], [x, 1.17, .145], .028, 'pack');
  }
  return b.geometry();
}
function head() {
  const b = new FigureBuilder();
  oval(b, [0, 1.53, .012], [.165, .19, .15], 'skin');
  oval(b, [0, 1.65, -.012], [.17, .095, .15], '#523f39');
  return b.geometry();
}
function leg(cycling: boolean) {
  const b = new FigureBuilder();
  const knee: XYZ = [0, -.33, cycling ? .29 : .035];
  const ankle: XYZ = [0, cycling ? -.65 : -.72, cycling ? .16 : -.025];
  tube(b, [0, 0, 0], knee, .091, 'trousers');
  tube(b, knee, ankle, .074, 'trousers');
  oval(b, [0, ankle[1], ankle[2] + .05], [.085, .063, .145], rubber);
  return b.geometry();
}
function sleeve() {
  const b = new FigureBuilder();
  tube(b, [0, 0, 0], [0, -.27, -.03], .085, 'top');
  tube(b, [0, -.27, -.03], [0, -.46, .065], .066, 'top');
  return b.geometry();
}

function bicycleAndRider() {
  const b = new FigureBuilder();
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
  const paint = 'frame';
  tube(b, back, crank, .029, paint); tube(b, back, seat, .029, paint);
  tube(b, seat, crank, .038, paint); tube(b, seat, stem, .037, paint);
  tube(b, crank, stem, .037, paint); tube(b, stem, [0, hubY, .54], .033, paint);
  tube(b, stem, [0, 1.01, .39], .025, rubber);
  tube(b, [-.23, 1.01, .39], [.23, 1.01, .39], .025, rubber);
  oval(b, [0, .92, -.17], [.105, .045, .16], rubber);
  tube(b, [0, 1.01, -.16], [0, 1.37, .075], .173, 'top');
  oval(b, [0, 1.26, -.18], [.143, .18, .102], 'pack');
  for (const x of [-.16, .16]) {
    tube(b, [x * .68, 1.38, -.14], [x * .68, 1.43, .07], .029, 'pack');
    tube(b, [x, 1.34, .075], [x, 1.13, .22], .067, 'top');
    tube(b, [x, 1.13, .22], [x, 1.035, .386], .054, 'skin');
  }
  oval(b, [0, 1.52, .14], [.15, .165, .14], 'skin');
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
export function createFigurePreview(kind: 'walker' | 'cyclist', look = 0) {
  const group = new THREE.Group();
  const geometries = new Set<THREE.BufferGeometry>();
  const material = figureMaterial(false);
  function part(geometry: THREE.BufferGeometry) {
    geometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    return mesh;
  }

  const limbs: { mesh: THREE.Mesh; joint: Joint; side: number }[] = [];
  function pair(geometry: THREE.BufferGeometry, joint: Joint) {
    for (const side of [-1, 1]) limbs.push({ mesh: part(geometry), joint, side });
  }
  if (kind === 'walker') {
    part(jacket());
    part(head());
    pair(sleeve(), 'walkingArm');
    pair(leg(false), 'walkingLeg');
  } else {
    part(bicycleAndRider());
    pair(leg(true), 'cyclingLeg');
  }

  function setPhase(cycle: number) {
    const stride = Math.sin((cycle % 1) * 2 * Math.PI);
    for (const { mesh, joint, side } of limbs) poseLimb(mesh, joint, side, stride);
  }
  function setLook(index: number) {
    material.map!.offset.y = THREE.MathUtils.euclideanModulo(Math.trunc(index), figureLooks.length) / figureLooks.length;
  }
  setLook(look);
  setPhase(0);
  return {
    group, setPhase, setLook,
    cyclesPerSecond: strideAngle(kind === 'cyclist', travelSpeed(kind === 'cyclist', .5)) / (2 * Math.PI),
    dispose() {
      group.removeFromParent();
      for (const geometry of geometries) geometry.dispose();
      material.dispose();
      geometries.clear();
    },
  };
}

// At overview scale a person covers only a few pixels. Keep the coat, head
// and base silhouette in one inexpensive draw, reserving limbs for close views.
function distantFigure(rider: boolean) {
  const b = new FigureBuilder();
  b.addGeometry(new THREE.CylinderGeometry(.19, .13, .57, 4).translate(0, 1.04, 0), 'top');
  b.addGeometry(new THREE.OctahedronGeometry(.19).translate(0, 1.51, .02), 'skin');
  if (rider) {
    for (const z of [-.54, .54]) {
      b.addGeometry(new THREE.CircleGeometry(.33, 6).rotateY(Math.PI / 2).translate(0, .33, z), rubber);
      b.addGeometry(new THREE.CircleGeometry(.33, 6).rotateY(-Math.PI / 2).translate(0, .33, z), rubber);
    }
    b.box(.20, .22, 1.05, 0, .57, 0, 'frame');
  } else {
    b.addGeometry(new THREE.CylinderGeometry(.14, .105, .76, 4).translate(0, .38, 0), 'trousers');
  }
  return b.geometry();
}

// Local origin is the chair seat, facing the table.
function seatedFigure() {
  const b = new FigureBuilder();
  oval(b,[0,.30,0],[.22,.34,.15],'top');
  oval(b,[0,.76,.015],[.15,.18,.14],'skin');
  oval(b,[0,.86,0],[.15,.09,.14],'#594537');
  for (const x of [-.105,.105]) {
    tube(b,[x,.05,0],[x,.03,.31],.08,'trousers');
    tube(b,[x,.03,.31],[x,-.37,.32],.07,'trousers');
    oval(b,[x,-.39,.38],[.08,.055,.13],rubber);
    tube(b,[2*x,.49,0],[2*x,.22,.08],.07,'top');
    tube(b,[2*x,.22,.08],[2*x,.27,.30],.055,'skin');
  }
  return b.geometry();
}

export class StreetFigures {
  readonly group = new THREE.Group();
  private readonly material = figureMaterial(true);
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
  private readonly seated?: THREE.InstancedMesh;
  private minute = NaN;
  private crowd = 0;
  private museumLoaded = false;
  private tick = NaN;
  private viewportHeight = 0;

  constructor(private readonly people: Traveller[], private readonly ground: (x: number, z: number) => number | null,
    private readonly low: boolean, private readonly museumGround?: (x:number,z:number)=>number|null) {
    const riders = people.filter(p => p.rider).length, walkers = people.length - riders + (museumGround ? highWalkers.length : 0);
    const batch = (geometry: THREE.BufferGeometry, capacity: number) => {
      const mesh = new THREE.InstancedMesh(geometry, this.material, capacity);
      geometry.setAttribute('lookOffset', new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.DynamicDrawUsage));
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      this.group.add(mesh);
      return mesh;
    };
    if (museumGround && !low) this.seated = batch(seatedFigure(), highSeats.length);
    this.coat = batch(jacket(), walkers);
    this.face = batch(head(), walkers);
    this.arms = batch(sleeve(), walkers * 2);
    this.legs = batch(leg(false), walkers * 2);
    this.cycles = batch(bicycleAndRider(), riders);
    this.pedals = batch(leg(true), riders * 2);
    this.distantWalkers = batch(distantFigure(false), walkers);
    this.distantRiders = batch(distantFigure(true), riders);
  }

  private joint(batch: THREE.InstancedMesh, index: number, joint: Joint, side: number, stride: number, look: number) {
    poseLimb(this.limb, joint, side, stride);
    this.place(batch, index, this.matrix.multiplyMatrices(this.root.matrix, this.limb.matrix), look);
  }

  private place(mesh: THREE.InstancedMesh, index: number, pose: THREE.Matrix4, look: number) {
    mesh.setMatrixAt(index, pose);
    mesh.geometry.getAttribute('lookOffset').setX(index, look / figureLooks.length);
  }

  update(ms: number, camera: THREE.PerspectiveCamera, viewportHeight: number) {
    const step = this.low ? 80 : 40;
    const tick = Math.floor(ms / step);
    camera.updateMatrixWorld();
    this.projection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const museumLoaded = !!this.museumGround && Math.hypot(camera.position.x - 550, camera.position.z + 3990) < 1800
      && this.museumGround(515, -3967) !== null;
    if (this.museumLoaded === museumLoaded && this.tick === tick && viewportHeight === this.viewportHeight && this.projection.equals(this.previousProjection)) return;
    this.museumLoaded = museumLoaded;
    this.viewportHeight = viewportHeight;
    this.previousProjection.copy(this.projection);
    this.frustum.setFromProjectionMatrix(this.projection);
    const focalPixels = viewportHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const detailRangeSq = (1.7 * focalPixels / (this.low ? 6 : 4)) ** 2;
    this.tick = tick;
    let walker = 0, rider = 0, farWalker = 0, farRider = 0;
    const draw = (person: Traveller, p: ReturnType<typeof travellerAt>, y: number) => {
      this.bounds.center.set(p.x, y + .85, p.z);
      if (!this.frustum.intersectsSphere(this.bounds)) return;
      this.root.position.set(p.x, y, p.z);
      this.root.rotation.y = p.angle;
      this.root.scale.setScalar(person.size);
      this.root.updateMatrix();
      if (this.bounds.center.distanceToSquared(camera.position) > detailRangeSq) {
        const mesh = person.rider ? this.distantRiders : this.distantWalkers;
        const index = person.rider ? farRider++ : farWalker++;
        this.place(mesh, index, this.root.matrix, person.look);
      } else if (person.rider) {
        this.place(this.cycles, rider, this.root.matrix, person.look);
        for (let i = 0; i < 2; i++) {
          const side = i * 2 - 1;
          this.joint(this.pedals, rider * 2 + i, 'cyclingLeg', side, p.stride, person.look);
        }
        rider++;
      } else {
        this.place(this.coat, walker, this.root.matrix, person.look);
        this.place(this.face, walker, this.root.matrix, person.look);
        for (let i = 0; i < 2; i++) {
          const side = i * 2 - 1;
          this.joint(this.legs, walker * 2 + i, 'walkingLeg', side, p.stride, person.look);
          this.joint(this.arms, walker * 2 + i, 'walkingArm', side, p.stride, person.look);
        }
        walker++;
      }
    }
    for (const person of this.people) {
      const p = travellerAt(person,tick*step/1000), y = this.ground(p.x,p.z);
      if (y !== null) draw(person,p,y);
    }
    if (this.seated) this.seated.count = 0;
    if (museumLoaded && this.museumGround) {
      const minute = Math.floor(ms/60000);
      if (minute !== this.minute) { this.minute = minute; this.crowd = museumCrowd(ms); }
      for (let i = 0; i < this.crowd; i++) {
        const visitor = highWalkers[i];
        const p = highWalkerPose(visitor,tick*step/1000,this.museumGround);
        if (p) draw(visitor.person,p,p.y);
      }
      if (this.seated) for (let i = 0; i < highSeated(this.crowd); i++) {
        const seat = highSeats[i];
        const g = this.museumGround(...seat.table);
        if (g === null) continue;
        this.bounds.center.set(seat.x,g+1,seat.z);
        if (!this.frustum.intersectsSphere(this.bounds)) continue;
        this.root.position.set(seat.x,g+.575,seat.z);
        this.root.rotation.y = seat.angle;
        this.root.scale.setScalar(1);
        this.root.updateMatrix();
        this.place(this.seated,this.seated.count++,this.root.matrix,seat.look);
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
      mesh.geometry.getAttribute('lookOffset').needsUpdate = true;
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
