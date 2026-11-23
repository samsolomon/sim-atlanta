/**
 * Residential siding courses for the generic facade shader (patchFacades in vignette/world.ts):
 * clapboard laps, running-bond brick, stucco grain and staggered cedar shingle, selected by
 * the facade style \`st\` (3 to 6 after the 7–10 houses fold onto them). Moved here verbatim from
 * world.ts (2026-11-23) so houses and landmarks find every building material in one place;
 * the shader source is byte-identical. It reads \`y\`, \`u\`, \`st\` and \`hh()\` from that shader.
 */
export const SIDING_GLSL = `            float px = fwidth(y);
            float lap = 1.0;
            // 7–10 are the same sidings with the windows drawn as geometry instead.
            hasWin = step(st, 6.5);
            st = st > 6.5 ? st - 4.0 : st;
            if (st < 3.5) {
              lap = mix(0.95, 0.84 + 0.16 * step(0.2, fract(y / 0.2)), 1.0 - smoothstep(0.06, 0.16, px));
            } else if (st < 4.5) {
              float row = floor(y / 0.075);
              float joint = step(fract(y / 0.075), 0.16) + step(fract(u / 0.21 + 0.5 * mod(row, 2.0)), 0.05);
              float brick = mix(0.82, 0.95 + 0.1 * hh(vec2(floor(u / 0.21), row)), 1.0 - min(joint, 1.0));
              lap = mix(0.93, brick, 1.0 - smoothstep(0.02, 0.06, px));
            } else if (st < 5.5) {
              lap = 0.97 + 0.05 * hh(floor(vec2(u * 2.0, y * 2.0)));
            } else {
              float row = floor(y / 0.3);
              float joint = step(fract(y / 0.3), 0.12) + step(fract(u / 0.25 + 0.37 * row), 0.06);
              float shingle = mix(0.8, 0.9 + 0.14 * hh(vec2(floor(u / 0.25 + 0.37 * row), row)), 1.0 - min(joint, 1.0));
              lap = mix(0.9, shingle, 1.0 - smoothstep(0.08, 0.2, px));
            }
            diffuseColor.rgb *= lap;`;
