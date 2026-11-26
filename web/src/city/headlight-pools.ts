import * as THREE from 'three';

/**
 * Headlight pools: soft light on the road or track ahead of each lit vehicle's leading end, at night
 * on the High tier. One instanced additive quad per vehicle, every producer (road traffic, buses,
 * streetcar, MARTA, freight, Amtrak) writing into one shared batch, so the cost is one program and
 * one draw. No real lights and no per-pixel lighting: the falloff is computed from the quad's UV.
 * Plan and costs: docs/headlight-pools-plan.md.
 *
 * Each pool is placed from two points on the vehicle's own path (the bumper and a point ahead of it),
 * so it follows decks, ramps and grades, and a road crossing overhead never catches it. Producers
 * drop a pool where their path has no drawn surface (tunnels, holes, board edges).
 */

/** Camera distance (m) over which pools fade out; beyond the end nothing is placed at all. */
export const FADE_START = 450;
export const FADE_END = 1400;

/** What a producer needs: whether pools are on, whether a point is near enough, and add. */
export interface PoolSink {
  readonly active: boolean;
  inRange(x: number, y: number, z: number): boolean;
  add(nx: number, ny: number, nz: number, fx: number, fy: number, fz: number, width: number, power?: number): boolean;
}

/** Pool reach and spread by vehicle: metres ahead of the bumper, metres across at the far end. */
export const POOL = {
  car: { length: 16, width: 4.4 },
  truck: { length: 20, width: 5 },
  bus: { length: 18, width: 5 },
  rail: { length: 20, width: 4.2, power: 0.65 },
} as const;

const VERT = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute float aPower;
varying vec2 vUv;
varying float vPower;
varying float vDist;
void main() {
  vUv = uv;
  vPower = aPower;
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vec4 mvPosition = viewMatrix * world;
  vDist = distance(world.xyz, cameraPosition);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uColor;
uniform float uNight;
uniform float uWet;
uniform vec2 uFade;
varying vec2 vUv;
varying float vPower;
varying float vDist;
void main() {
  // u across (0..1), v along the beam (0 at the bumper, 1 at the far end).
  float v = vUv.y, x = vUv.x - 0.5;
  // Two lobes, one per lamp, that spread and merge with distance.
  float spread = mix(0.13, 0.34, v);
  float lobes = exp(-pow((x - 0.2 * (1.0 - v)) / spread, 2.0)) + exp(-pow((x + 0.2 * (1.0 - v)) / spread, 2.0));
  // Brightest just ahead of the bumper, gone at the far edge; a short soft start so it meets the lamps.
  float along = smoothstep(0.0, 0.04, v) * (1.0 - smoothstep(0.35, 1.0, v));
  float fade = 1.0 - smoothstep(uFade.x, uFade.y, vDist);
  float wet = 1.0 + 0.4 * uWet;
  float i = 1.1 * lobes * along * fade * uNight * vPower * wet;
  // Additive light fades into fog rather than taking on the fog colour.
  #ifdef USE_FOG
    #ifdef FOG_EXP2
      i *= exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
    #else
      i *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
    #endif
  #endif
  if (i < 0.002) discard;
  gl_FragColor = vec4(uColor * i, 1.0);
}`;

export class HeadlightPools implements PoolSink {
  readonly mesh: THREE.InstancedMesh;
  /** Hidden one-instance copy: City's boot prewarm (core/prewarm.ts) compiles the program through it, so
   * the first dusk compiles nothing. The live mesh is hidden whenever it has no pools to draw. */
  readonly template: THREE.InstancedMesh;
  readonly material: THREE.ShaderMaterial;
  private readonly power: THREE.InstancedBufferAttribute;
  private n = 0;
  private readonly m = new THREE.Matrix4();
  private readonly ax = new THREE.Vector3();
  private readonly ay = new THREE.Vector3();
  private readonly az = new THREE.Vector3();
  private readonly up = new THREE.Vector3(0, 1, 0);

  constructor(readonly capacity: number) {
    // A unit quad: x across (-0.5..0.5), z along (0..1), lying in y = 0.
    const g = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5);
    // PlaneGeometry's v runs toward -z after the rotation; flip so v = 0 at the bumper.
    const uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
    this.power = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aPower', this.power);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uColor: { value: new THREE.Color(1.0, 0.92, 0.74) },
        uNight: { value: 0 },
        uWet: { value: 0 },
        uFade: { value: new THREE.Vector2(FADE_START, FADE_END) },
      }]),
      fog: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    this.mesh = new THREE.InstancedMesh(g, this.material, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.name = 'Headlight pools';
    this.mesh.userData.positionTier = 'illustrative';
    // Drawn after the opaque city, before the vehicles' own glass is irrelevant: additive, no depth write.
    this.mesh.renderOrder = 2;
    this.mesh.count = 0;
    this.template = new THREE.InstancedMesh(g, this.material, 1);
    this.template.name = 'Headlight pools prewarm template';
    this.template.visible = false;
    this.template.frustumCulled = false;
    this.template.setMatrixAt(0, new THREE.Matrix4());
  }

  /** Night 0..1 (City's darkness) and wetness 0..1. Pools are skipped entirely below a little darkness. */
  private readonly eye = new THREE.Vector3(Infinity, Infinity, Infinity);
  /** Over capacity this frame (dev check: size `capacity` to every producer's maximum). */
  overflowed = false;
  get active() { return this.material.uniforms.uNight.value > 0.05; }
  /** The camera position this frame, for the range check. */
  setEye(p: THREE.Vector3) { this.eye.copy(p); }
  inRange(x: number, y: number, z: number) {
    const dx = x - this.eye.x, dy = y - this.eye.y, dz = z - this.eye.z;
    return dx * dx + dy * dy + dz * dz < FADE_END * FADE_END;
  }
  setNight(dark: number, wet = 0) {
    this.material.uniforms.uNight.value = dark;
    this.material.uniforms.uWet.value = wet;
  }
  begin() { this.n = 0; this.overflowed = false; }

  /**
   * One pool from `near` (at the leading bumper, on the path's surface) to `far` (ahead along the
   * path, on its surface), `width` metres across at the far end. `power` scales brightness (a car
   * 1, a truck or train brighter, a fading trip less).
   */
  add(nx: number, ny: number, nz: number, fx: number, fy: number, fz: number, width: number, power = 1) {
    if (this.n >= this.capacity) { this.overflowed = true; return false; }
    this.az.set(fx - nx, fy - ny, fz - nz);
    const len = this.az.length();
    if (len < 0.5) return false;
    this.ax.crossVectors(this.up, this.az).normalize().multiplyScalar(width);
    this.ay.crossVectors(this.az, this.ax).normalize();
    // Lift a few centimetres above the drawn surface; polygon offset covers the rest.
    this.m.makeBasis(this.ax, this.ay, this.az).setPosition(nx, ny + 0.04, nz);
    this.mesh.setMatrixAt(this.n, this.m);
    this.power.setX(this.n, power);
    this.n++;
    return true;
  }

  end() {
    this.mesh.count = this.n;
    this.mesh.visible = this.active && this.n > 0;
    if (!this.n) return;
    this.mesh.instanceMatrix.clearUpdateRanges();
    this.mesh.instanceMatrix.addUpdateRange(0, this.n * 16);
    this.mesh.instanceMatrix.needsUpdate = true;
    this.power.clearUpdateRanges();
    this.power.addUpdateRange(0, this.n);
    this.power.needsUpdate = true;
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
