/** Moved verbatim from city/johnson-burgee.ts (2026-11-23): One Atlantic and 191 Peachtree's ashlar. */
/**
 * GLSL that darkens running-bond ashlar joints on stone. It reads
 * `vStonePos` (model-space position) and only touches fragments that pass
 * `where`, so glass and metal stay smooth. Joints fade out once a course is
 * smaller than a pixel.
 */
export function ashlarCoursing(courseWidth: number, courseHeight: number, where: string, depth = .13) {
  return `
        vec2 tile = vec2((vStonePos.x + vStonePos.z) / ${courseWidth}, vStonePos.y / ${courseHeight});
        vec2 footprint = max(fwidth(tile), vec2(0.001));
        tile.x += 0.5 * mod(floor(tile.y), 2.0);
        vec2 edge = 0.5 - abs(fract(tile) - 0.5);
        vec2 seam = 1.0 - smoothstep(vec2(0.01), 0.035 + footprint, edge);
        seam *= 1.0 - smoothstep(vec2(0.12), vec2(0.65), footprint);
        if (${where}) {
          diffuseColor.rgb *= 1.0 - ${depth} * max(seam.x, seam.y);
        }`;
}

/** Declares `vStonePos` and inserts `fragment` after the base colour is known. */
export function withStonePosition(shader: { vertexShader: string; fragmentShader: string }, fragment: string) {
  shader.vertexShader = 'varying vec3 vStonePos;\n' + shader.vertexShader.replace(
    '#include <begin_vertex>', '#include <begin_vertex>\n vStonePos = position;');
  shader.fragmentShader = 'varying vec3 vStonePos;\n' + shader.fragmentShader.replace(
    '#include <color_fragment>', `#include <color_fragment>${fragment}`);
}
