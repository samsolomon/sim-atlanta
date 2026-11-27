/**
 * Residential siding courses for the generic facade shader (patchFacades in materials/facade.ts):
 * clapboard laps, running-bond brick, stucco grain, staggered cedar shingle and limestone ashlar,
 * selected by the facade style \`st\`: 3 to 6 and 11 draw shader windows; 7–10 and 12 are the
 * same sidings with windows drawn as geometry, and fold onto 3–6 and 11. Moved here verbatim from
 * world.ts (2026-11-23) so houses and landmarks find every building material in one place;
 * the shader source is byte-identical. It reads \`y\`, \`u\`, \`st\` and \`hh()\` from that shader.
 */
export const SIDING_GLSL = `            float px = fwidth(y);
            float lap = 1.0;
            // 7–10 and 12 are the same sidings with the windows drawn as geometry instead.
            hasWin = step(st, 6.5) + step(10.5, st) * step(st, 11.5);
            st = st > 11.5 ? 11.0 : st > 6.5 && st < 10.5 ? st - 4.0 : st;
            if (st < 3.5) {
              lap = mix(0.95, 0.84 + 0.16 * step(0.2, fract(y / 0.2)), 1.0 - smoothstep(0.06, 0.16, px));
            } else if (st < 4.5) {
              float row = floor(y / 0.075);
              float joint = step(fract(y / 0.075), 0.16) + step(fract(u / 0.21 + 0.5 * mod(row, 2.0)), 0.05);
              float brick = mix(0.82, 0.95 + 0.1 * hh(vec2(floor(u / 0.21), row)), 1.0 - min(joint, 1.0));
              lap = mix(0.93, brick, 1.0 - smoothstep(0.02, 0.06, px));
            } else if (st < 5.5) {
              lap = 0.97 + 0.05 * hh(floor(vec2(u * 2.0, y * 2.0)));
            } else if (st < 6.5) {
              float row = floor(y / 0.3);
              float joint = step(fract(y / 0.3), 0.12) + step(fract(u / 0.25 + 0.37 * row), 0.06);
              float shingle = mix(0.8, 0.9 + 0.14 * hh(vec2(floor(u / 0.25 + 0.37 * row), row)), 1.0 - min(joint, 1.0));
              lap = mix(0.9, shingle, 1.0 - smoothstep(0.08, 0.2, px));
            } else {
              // Limestone ashlar (11, 12): 0.6 x 0.3 m blocks in running bond, thin darker joints,
              // a gentle tone per block. Sized from Sam's Ansley photographs (2026-11-23).
              float row = floor(y / 0.3), col = floor(u / 0.6 + 0.5 * mod(row, 2.0));
              float joint = step(fract(y / 0.3), 0.04) + step(fract(u / 0.6 + 0.5 * mod(row, 2.0)), 0.02);
              float ashlar = mix(0.88, 0.95 + 0.07 * hh(vec2(col, row) + 41.0), 1.0 - min(joint, 1.0));
              lap = mix(0.95, ashlar, 1.0 - smoothstep(0.06, 0.16, px));
            }
            diffuseColor.rgb *= lap;`;
