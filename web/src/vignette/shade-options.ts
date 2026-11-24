/**
 * Dev-only prototypes for how shaded faces of light glass render (for Sam's glass-palette call).
 * Both are off unless the URL asks; nothing changes by default.
 *
 * - `?shade=floor` (A): GLASS ONLY. Any vertex-coloured Lambert surface (skins, their lamp meshes,
 *   generic buildings) whose vertex colour reads as glass (blue-leaning, low saturation, mid value) never light below a share of
 *   their own colour, so a north face or a face in a neighbour's shadow stays a readable mid-tone.
 *   Every other colour (precast, brick, stone, concrete, roofs) is lit exactly as before.
 * - `?shade=lift` (B): GLOBAL. The grade's cool shade tint is swapped for a slight neutral lift
 *   in the darkest tones, touching every surface on screen.
 *
 * `?shade=floor` gives building meshes hooked copies of their Lambert materials, so with it on the
 * landmark batcher leaves those meshes unbatched (more draws, one more Lambert program). It is a look
 * prototype, not a shipping path.
 */
import { MeshLambertMaterial } from 'three';

export type ShadeOption = 'off' | 'floor' | 'lift';

export function shadeOption(search = globalThis.location?.search ?? ''): ShadeOption {
  const v = new URLSearchParams(search).get('shade');
  return v === 'floor' || v === 'lift' ? v : 'off';
}

/** The floor, as a share of the fragment's own (linear) colour: 1 means "lit like a flat face at full ambient". */
export const GLASS_FLOOR = 0.6;

/** GLSL: whether a linear vertex colour reads as glass. Kept in sync with isGlassColour below. */
const GLASS_TEST = /* glsl */ `
  float glassMax = max(max(vColor.r, vColor.g), vColor.b), glassMin = min(min(vColor.r, vColor.g), vColor.b);
  float glassSat = glassMax > 0.0 ? (glassMax - glassMin) / glassMax : 0.0;
  bool isGlass = vColor.b > vColor.r + 0.015 && glassSat < 0.75 && glassMax > 0.06 && glassMax < 0.62;`;

/** The same test on a linear RGB colour, for tests and the docs. */
export function isGlassColour([r, g, b]: [number, number, number]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), sat = max > 0 ? (max - min) / max : 0;
  return b > r + 0.015 && sat < 0.75 && max > 0.06 && max < 0.62;
}

/** Daylight share for the floor (1 by day, 0 at night): City ramps it in as the sun climbs from 2° to 12°, so dusk and night glass stay dark. */
export const glassFloorDay = { value: 1 };

/** The fragment patch option A adds: glass-coloured fragments never light below GLASS_FLOOR of their colour. */
function floorGlass(shader: { fragmentShader: string; uniforms: Record<string, unknown> }) {
  shader.uniforms.uGlassFloorDay = glassFloorDay;
  shader.fragmentShader = 'uniform float uGlassFloorDay;\n' + shader.fragmentShader.replace('#include <opaque_fragment>', /* glsl */ `
    #ifdef USE_COLOR
    {${GLASS_TEST}
      if (isGlass) outgoingLight = max(outgoingLight, diffuseColor.rgb * ${GLASS_FLOOR.toFixed(3)} * uGlassFloorDay);
    }
    #endif
    #include <opaque_fragment>`);
}

/** Building materials already floored, and the floored copy of each original. */
const floored = new WeakSet<object>();
const copies = new WeakMap<MeshLambertMaterial, MeshLambertMaterial>();

/**
 * Option A. Gives every vertex-coloured Lambert mesh under a building root (userData.building or
 * userData.perf 'buildings') its own floored copy of its material. Copies, because a material can be
 * shared with roads or bridges, and per-instance hooks, because a prototype hook or cache key would
 * reach every Lambert material in the scene. A material's own onBeforeCompile and cache key carry
 * over. Roads, bridges, terrain and trees keep their materials. Call after areas mount; it is cheap
 * to repeat.
 */
export function floorBuildingGlass(root: { traverse(f: (o: unknown) => void): void }) {
  const visit = (o: { userData?: Record<string, unknown>; children?: unknown[]; material?: unknown; isMesh?: boolean }, inBuilding: boolean) => {
    const here = inBuilding || !!o.userData?.building || o.userData?.perf === 'buildings';
    const m = o.material;
    if (here && o.isMesh && m instanceof MeshLambertMaterial && m.vertexColors && !floored.has(m)) {
      let copy = copies.get(m);
      if (!copy) {
        copy = m.clone();
        const own = m.onBeforeCompile, key = m.customProgramCacheKey();
        copy.onBeforeCompile = function (this: MeshLambertMaterial, shader, renderer) { own.call(this, shader, renderer); floorGlass(shader); };
        copy.customProgramCacheKey = () => key + ':glassShadeFloor';
        copies.set(m, copy);
        floored.add(copy);
      }
      o.material = copy;
    }
    for (const c of o.children ?? []) visit(c as typeof o, here);
  };
  visit(root as Parameters<typeof visit>[0], false);
}
