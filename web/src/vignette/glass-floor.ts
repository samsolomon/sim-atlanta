/**
 * Shaded glass never renders below a share of its own colour (Sam, 2026-11-24: option A, glass
 * only, at 0.45x, picked from a strip of 0.35x, 0.45x and 0.6x). Without it, a north face or a face in a
 * neighbour's shadow drops light glass to near-black navy, which reads as a dark hole rather
 * than glass. The floor sits below the sunlit value, so a tower keeps its sun-versus-shade step
 * and reads as a solid, not a glossy sheet.
 *
 * It patches the Lambert shader source once, before any program compiles, so every Lambert
 * program keeps its key: no new programs, and the landmark batcher (which skips hooked materials)
 * is unaffected. Lamp panes and batched copies are Lambert too, so lit windows and their walls
 * floor alike. Inside the shader the floor applies only to a fragment that
 * - has a vertex colour that reads as glass: blue-leaning, saturation under 0.75, and a linear
 *   value from 0.06 to 0.62 (precast, brick, stone, concrete, foliage and roofs all fail it);
 * - faces sideways (|world normal y| < 0.35). Road decks, slabs and plazas share glass-like
 *   blue-greys, but they are horizontal;
 * - has sunlight. The floor scales with the sun light's own colour, which City ramps from zero
 *   below the horizon, so dusk and night glass keep their dark.
 */
import { ShaderLib } from 'three';

/** The floor as a share of the fragment's own linear colour. Sam picked 0.45x: 0.6x read as a sheen. */
export const GLASS_FLOOR = 0.45;

/** Sun light (colour × intensity, max channel) at which the floor is at full strength. */
const FULL_SUN = 2.4;

/** The same glass test as the shader, on a linear RGB colour (tests and docs). */
export function isGlassColour([r, g, b]: readonly [number, number, number]) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), sat = max > 0 ? (max - min) / max : 0;
  return b > r + 0.015 && sat < 0.75 && max > 0.06 && max < 0.62;
}

/** GLSL inserted before `#include <opaque_fragment>` in the Lambert fragment shader. */
export function glassFloorChunk(strength: number) {
  return /* glsl */ `
#if defined( USE_COLOR ) && NUM_DIR_LIGHTS > 0
{
  vec3 glassC = vColor.rgb;
  float glassMax = max(max(glassC.r, glassC.g), glassC.b), glassMin = min(min(glassC.r, glassC.g), glassC.b);
  float glassSat = glassMax > 0.0 ? (glassMax - glassMin) / glassMax : 0.0;
  vec3 glassUp = inverseTransformDirection(normal, viewMatrix);
  vec3 glassSun = directionalLights[ 0 ].color;
  float glassDay = clamp(max(max(glassSun.r, glassSun.g), glassSun.b) / ${FULL_SUN.toFixed(2)}, 0.0, 1.0);
  if (glassC.b > glassC.r + 0.015 && glassSat < 0.75 && glassMax > 0.06 && glassMax < 0.62 && abs(glassUp.y) < 0.35)
    outgoingLight = max(outgoingLight, diffuseColor.rgb * (${strength.toFixed(3)} * glassDay));
}
#endif
#include <opaque_fragment>`;
}

let installed: number | null = null;
/**
 * Installs the floor into the Lambert shader. Call once, before the first render; a repeat call is
 * ignored. `strength` 0 leaves the shader as it was.
 */
export function installGlassFloor(strength = GLASS_FLOOR) {
  if (installed !== null) return installed;
  installed = strength;
  if (!(strength > 0)) return strength;
  const lambert = ShaderLib.lambert;
  if (!lambert.fragmentShader.includes('#include <opaque_fragment>')) return (installed = 0);
  lambert.fragmentShader = lambert.fragmentShader.replace('#include <opaque_fragment>', glassFloorChunk(strength));
  return strength;
}

/** The dev strength override for strips: `?glassfloor=0.35` (0 shows today's look). Dev builds only. */
export function glassFloorStrength(search: string, dev: boolean) {
  if (!dev) return GLASS_FLOOR;
  const v = new URLSearchParams(search).get('glassfloor');
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 1 ? n : GLASS_FLOOR;
}
