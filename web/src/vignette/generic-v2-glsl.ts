/**
 * Facade patterns for the v2 generic archetypes (generic-v2.ts), spliced into the generic
 * building shader (materials/facade.ts patchFacades) as one branch for styles 20 and up. Inputs: `u`
 * (metres along the face), `y` (metres above the wall's storey origin), `st` (style id),
 * `diffuseColor` (the wall's vertex colour); outputs `diffuseColor`, `litWin`, `litLevel`.
 *
 * Every pattern fades to its own mean once a bay or storey is under about two pixels, so walls
 * hold their tone at the 1.6 km Midtown view instead of shimmering or popping on zoom.
 */
import { BANDED_PANES, TOWER_PANES } from './generic-v2';

function variantGlass(panes: readonly (readonly number[])[]) {
  const colors = panes.map(rgb => `vec3(${rgb.join(', ')})`);
  return `vr < 0.5 ? ${colors[0]} : vr < 1.5 ? ${colors[1]} : vr < 2.5 ? ${colors[2]} : ${colors[3]}`;
}

export const GENERIC_V2_GLSL = /* glsl */ `
            float sid = st - 20.0;
            float arch = floor(sid / 4.0 + 0.001);
            float vr = sid - arch * 4.0;
            vec3 wall = diffuseColor.rgb;
            vec3 g2 = vec3(0.17, 0.19, 0.21);   // punched-window glass: near-neutral, mid-dark
            vec3 pat = wall;                     // patterned colour
            float bay = 3.0, storey = 3.9;
            float w2 = 0.0, mean = 0.3, share = 0.3;
            float lvl = 1.0;
            if (arch < 0.5) {
              // Precast office, 1960s–70s: light concrete fins over recessed glass, or deep punched windows.
              if (vr < 1.5) {
                bay = vr < 0.5 ? 1.6 : 2.0; storey = 3.9;
                vec2 f = fract(vec2(u / bay, y / storey));
                w2 = step(0.32, f.x) * step(f.x, 0.86) * step(0.2, f.y);
                pat = mix(wall * mix(1.0, 0.8, step(0.86, f.x) * step(f.x, 0.93)), g2, w2);
                mean = 0.44;
              } else {
                bay = vr < 2.5 ? 3.0 : 2.6; storey = 3.8;
                vec2 f = fract(vec2(u / bay, y / storey));
                w2 = step(0.27, f.x) * step(f.x, 0.73) * step(0.26, f.y) * step(f.y, 0.8);
                float reveal = step(0.27, f.x) * step(f.x, 0.73) * step(0.8, f.y) * step(f.y, 0.87);
                pat = mix(wall * (1.0 - 0.28 * reveal), g2, w2);
                mean = 0.25;
              }
            } else if (arch < 1.5) {
              // Banded curtain wall, 1980s–90s: glass ribbons between spandrel bands, slim mullions.
              storey = vr < 1.5 ? 3.9 : 4.1;
              bay = 1.5;
              g2 = ${variantGlass(BANDED_PANES)};
              vec2 f = fract(vec2(u / bay, y / storey));
              float lo = mod(vr, 2.0) < 0.5 ? 0.46 : 0.38;
              float band = step(lo, f.y) * step(f.y, 0.96);
              w2 = band * step(0.05, f.x);
              pat = mix(wall, g2, w2);
              pat = mix(pat, wall * 0.75, band * (1.0 - step(0.05, f.x)));
              mean = (0.96 - lo) * 0.95;
              share = 0.32;
            } else if (arch < 2.5) {
              // Brick mid-rise: paired or single punched windows with stone sills.
              bay = vr < 1.5 ? 3.4 : 2.8; storey = 3.5;
              vec2 f = fract(vec2(u / bay, y / storey));
              float inY = step(0.24, f.y) * step(f.y, 0.78);
              float pair = mod(vr, 2.0) < 0.5 ? 1.0 : 0.0;
              float wx = mix(step(0.32, f.x) * step(f.x, 0.68), step(0.14, f.x) * step(f.x, 0.43) + step(0.57, f.x) * step(f.x, 0.86), pair);
              w2 = wx * inY;
              float sill = wx * step(0.18, f.y) * step(f.y, 0.24);
              pat = mix(mix(wall, vec3(0.62, 0.58, 0.5), sill), g2, w2);
              mean = mix(0.36, 0.58, pair) * 0.54;
              share = 0.36;
            } else if (arch < 3.5) {
              // Limestone or granite office: tall punched windows, a lighter pier every third bay.
              bay = vr < 1.5 ? 2.4 : 2.8; storey = vr < 2.5 ? 3.9 : 4.2;
              vec2 c = floor(vec2(u / bay, y / storey));
              vec2 f = fract(vec2(u / bay, y / storey));
              w2 = step(0.3, f.x) * step(f.x, 0.7) * step(0.16, f.y) * step(f.y, 0.84);
              float pier = step(2.5, mod(c.x, 3.0));
              pat = mix(wall * (1.0 + 0.06 * pier), g2, w2 * (1.0 - pier * step(vr, 1.5)));
              mean = 0.27 * mix(1.0, 0.67, step(vr, 1.5));
            } else if (arch < 4.5) {
              // 2000s+ residential: slab edges and balcony rails every floor, panel groups in an accent.
              bay = vr < 1.5 ? 3.6 : 3.0; storey = 3.2;
              vec2 c = floor(vec2(u / bay, y / storey));
              vec2 f = fract(vec2(u / bay, y / storey));
              float grp = hh(vec2(floor(c.x / 3.0), 11.0));
              vec3 accent = vr < 0.5 ? wall * 0.78 : vr < 1.5 ? mix(wall, vec3(0.06, 0.06, 0.065), 0.55) : vr < 2.5 ? wall * 1.06 : mix(wall, vec3(0.36, 0.16, 0.09), 0.55);
              vec3 panel = mix(wall, accent, step(0.55, grp));
              float wide = step(0.45, hh(vec2(c.x, 5.0)));
              w2 = step(mix(0.24, 0.1, wide), f.x) * step(f.x, mix(0.7, 0.9, wide)) * step(0.14, f.y) * step(f.y, 0.86);
              float slab = step(f.y, 0.08);
              float balc = step(0.5, grp) * step(0.08, f.y) * step(f.y, 0.36) * step(0.04, f.x) * step(f.x, 0.96);
              g2 = vec3(0.19, 0.21, 0.23);
              pat = mix(panel, g2, w2);
              pat = mix(pat, vec3(0.13, 0.14, 0.15), balc * 0.7);
              pat = mix(pat, wall * 1.08, slab);
              mean = 0.5;
              share = 0.45;
            } else if (arch < 5.5) {
              // Parking deck: open slots between pale spandrels, columns every bay.
              bay = vr < 1.5 ? 8.5 : 9.5; storey = 3.1;
              vec2 f = fract(vec2(u / bay, y / storey));
              w2 = step(0.4, f.y) * step(f.y, 0.94) * step(0.035, f.x) * step(f.x, 0.965);
              g2 = vec3(0.045, 0.048, 0.052);
              pat = mix(wall, g2, w2);
              mean = 0.5;
              share = 1.0;
              lvl = 0.22;
            } else if (arch < 6.5) {
              // Low commercial upper wall: blank, or a sparse row of small windows.
              bay = 3.2; storey = 3.6;
              vec2 f = fract(vec2(u / bay, y / storey));
              w2 = step(vr, 1.5) * step(0.5, vr) * step(0.3, f.x) * step(f.x, 0.7) * step(0.3, f.y) * step(f.y, 0.75);
              w2 += step(2.5, vr) * step(0.1, f.x) * step(f.x, 0.9) * step(0.1, y) * step(y, 0.9);
              pat = mix(wall, g2, w2);
              mean = step(0.5, vr) * step(vr, 1.5) * 0.18 + step(2.5, vr) * 0.2;
              share = 0.2;
            } else if (arch < 7.5) {
              // Glass tower: mullion grid and spandrel line in one of the palette's glass families.
              bay = 1.5; storey = 3.9;
              g2 = ${variantGlass(TOWER_PANES)};
              g2 *= 0.92 + 0.16 * clamp(y / 120.0, 0.0, 1.0);
              vec2 f = fract(vec2(u / bay, y / storey));
              w2 = step(0.06, f.x) * step(0.1, f.y);
              pat = mix(wall, g2, w2);
              mean = 0.85;
              share = 0.33;
            } else {
              // Bases. 52 lobby glass, 53 dark arcade glass, 54 blank plinth, 55 shopfront and sign band.
              float b = st - 52.0;
              bay = 3.0; storey = 4.0;
              vec2 f = fract(vec2(u / bay, y / storey));
              if (b < 0.5) {
                w2 = step(0.05, f.x) * step(f.x, 0.95) * step(0.08, f.y) * step(f.y, 0.92) * step(0.4, y);
                g2 = vec3(0.13, 0.145, 0.16);
                mean = 0.75; share = 0.8;
              } else if (b < 1.5) {
                w2 = step(0.06, f.x) * step(f.x, 0.94) * step(0.4, y);
                g2 = vec3(0.08, 0.085, 0.09);
                mean = 0.85; share = 0.8;
              } else if (b < 2.5) {
                w2 = 0.0; mean = 0.0; share = 0.0;
              } else {
                bay = 3.2;
                float fx = fract(u / bay);
                float shop = step(0.05, fx) * step(fx, 0.95) * step(0.5, y) * step(y, 3.3);
                float sband = step(3.3, y) * step(y, 4.2);
                float upper = step(4.6, y) * step(0.22, fract((y - 4.2) / 3.6)) * step(fract((y - 4.2) / 3.6), 0.82) * step(0.14, fx) * step(fx, 0.86);
                w2 = shop + upper;
                g2 = vec3(0.14, 0.15, 0.16);
                wall *= 1.0 - 0.45 * sband;
                mean = 0.6; share = 0.75;
              }
              pat = mix(wall, g2, w2);
            }
            float cellH2 = hh(floor(vec2(u / bay, y / storey)) + 41.0 + st);
            float tint2 = 0.92 + 0.16 * hh(floor(vec2(u / bay, y / storey)) + 3.0);
            pat = mix(pat, pat * tint2, w2);
            // Fade to the archetype's own mean when a bay or storey falls under ~2 px.
            vec2 fw2 = fwidth(vec2(u / bay, y / storey));
            float clar2 = 1.0 - smoothstep(0.25, 0.6, max(fw2.x, fw2.y));
            diffuseColor.rgb = mix(mix(wall, g2, mean), pat, clar2);
            float w2f = mix(mean, w2, clar2);
            litWin = w2f * step(1.0 - share, cellH2);
            litLevel = lvl * (0.45 + 0.6 * fract(cellH2 * 7.13));
`;
