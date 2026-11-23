/**
 * The shared material patterns, as GLSL. Every pattern modulates the authored vertex colour
 * with an offset whose mean is about zero, so a wall seen from a distance keeps its flat colour
 * (the City's look before the library). Detail fades to that mean once a feature is under about
 * two pixels, the way the #248 ground covers do, so nothing shimmers.
 *
 * Inputs are in metres in the host's frame: landmark shells pass model space, so courses follow
 * the building's own walls. `s` is the per-vertex surface: (kind, p1, strength, p2).
 *
 * The low tier (`SURFACE_LOW`) compiles out every feature smaller than half a metre (brick,
 * slate, clapboard, grain) and the second noise octave. What stays is one structural grid
 * (ashlar courses, precast panels, mullions, copper seams) and one soft tone variation.
 */

/** Kinds, in the order the shader tests them. Stored in the vertex data, so new kinds go last. */
export const SURFACE_KINDS = [
  'none', 'brick', 'stucco', 'ashlar', 'precast', 'granite', 'curtain-glass', 'aged-copper',
  'slate', 'terracotta-tile', 'clapboard', 'shingle', 'concrete', 'asphalt-roof',
] as const;
export type SurfaceKind = typeof SURFACE_KINDS[number];

export const SURFACE_GLSL = /* glsl */ `
float sfH(vec2 p) { vec3 q = fract(vec3(p.xyx) * .1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
float sfN(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(sfH(i), sfH(i + vec2(1, 0)), f.x), mix(sfH(i + vec2(0, 1)), sfH(i + vec2(1, 1)), f.x), f.y); }
// 1 while a feature of \`size\` metres spans about 7 px or more, 0 once it is under 2 px.
float sfSee(float size, float px) { return 1. - smoothstep(.15, .5, px / size); }
// A joint of half-width \`w\` (in cells) on integer lines of t, antialiased by f, the footprint of
// one pixel in cells. f is passed in rather than taken with fwidth, so lines stay defined inside
// the branches that skip invisible detail.
float sfLine(float t, float w, float f) { float e = .5 - abs(fract(t) - .5);
  return (1. - smoothstep(w, w + f, e)) * (1. - smoothstep(.15, .45, f)); }
// Soft tone between -.5 and .5: one octave on the low tier, two otherwise.
float sfTone(vec2 p) {
#ifdef SURFACE_LOW
  return sfN(p) - .5;
#else
  return .65 * (sfN(p) - .5) + .35 * (sfN(p * 2.7 + 7.1) - .5);
#endif
}

vec3 surfaceColour(vec4 s, vec3 p, vec3 n, vec3 base) {
  float kind = floor(s.x + .5);
  if (kind < .5) return base;
  // Walls run u along the wall and v up it. Roofs run u across the slope and v up the slope in
  // true slope length, so seams and courses follow the fall line on hips and gables alike.
  vec2 uv; float hl = length(n.xz);
  if (abs(n.y) < .7) uv = vec2(dot(p.xz, vec2(-n.z, n.x) / max(hl, 1e-4)), p.y);
  else if (hl > .05) { vec2 d = n.xz / hl; uv = vec2(dot(p.xz, vec2(-d.y, d.x)), -dot(p.xz, d) / max(abs(n.y), .2)); }
  else uv = p.xz;
  vec2 fw = max(fwidth(uv), vec2(1e-4));
  float px = max(fw.x, fw.y), a = s.z, m = 0.;
  vec3 hue = vec3(1);

  if (kind < 1.5) {
    // Brick: 215 x 65 mm units, 10 mm joints. p1 is the bond (0 running, 1 flemish, 2 stack,
    // 3 english); p2 signs the joints (+ lighter mortar, - darker).
    m += .035 * sfSee(2.5, px) * sfTone(uv * .4);
#ifndef SURFACE_LOW
    if (px < .04) { // sfSee(.075) is zero beyond this, so distant walls skip the brick work
    vec2 c = vec2(uv.x / .225, uv.y / .075);
    float row = floor(c.y), bond = floor(s.y + .5), unit = .225;
    if (bond < .5) c.x += .5 * mod(row, 2.);
    else if (bond < 1.5) { unit = .3375; c.x = uv.x / unit + .5 * mod(row, 2.); }
    else if (bond > 2.5 && mod(row, 2.) > .5) { unit = .1125; c.x = uv.x / unit + .25; }
    float fx = fw.x / unit;
    float head = bond > .5 && bond < 1.5 ? max(sfLine(c.x, .022, fx), sfLine(c.x - .667, .022, fx)) : sfLine(c.x, .022, fx);
    float joint = max(sfLine(c.y, .067, fw.y / .075), head);
    float see = sfSee(.075, px);
    m += see * (.07 * (sfH(floor(c) + vec2(0., row * 3.1)) - .5) * (1. - joint) + .10 * sign(s.w) * (joint - .2));
    }
#endif
  } else if (kind < 2.5) {
    // Stucco: trowel mottle and faint rain streaks, no joints.
    m += .035 * sfSee(3., px) * sfTone(uv * .35);
    m += .025 * sfSee(1.5, px) * (sfN(vec2(uv.x * 1.6, uv.y * .08)) - .5);
#ifndef SURFACE_LOW
    if (px < .15) m += .03 * sfSee(.3, px) * (sfN(uv * 3.3) - .5);
#endif
  } else if (kind < 3.5 || (kind > 4.5 && kind < 5.5)) {
    // Ashlar and granite: running-bond blocks p1 m high and twice as long, darker joints.
    float course = max(s.y, .2);
    vec2 c = vec2(uv.x / (2. * course), uv.y / course);
    c.x += .5 * mod(floor(c.y), 2.);
    float joint = max(sfLine(c.y, .012 / course + .006, fw.y / course), sfLine(c.x, .006 / course + .003, fw.x / (2. * course)));
    float see = sfSee(course, px);
    float vary = kind > 4.5 ? .045 : .03;
    m += see * (vary * (sfH(floor(c) + 11.) - .5) * (1. - joint) - .09 * (joint - .03));
    m += .03 * sfSee(3., px) * sfTone(uv * .3);
#ifndef SURFACE_LOW
    if (kind > 4.5 && px < .015) m += .04 * sfSee(.03, px) * (sfH(floor(uv * 40.)) - .5); // granite grain
#endif
  } else if (kind < 4.5) {
    // Precast panels p1 wide and p2 high, with darker reveals and a slight tone per panel.
    vec2 size = vec2(max(s.y, .3), max(s.w, .3)), c = uv / size, fc = fw / size;
    float joint = max(sfLine(c.x, .012 / size.x, fc.x), sfLine(c.y, .012 / size.y, fc.y));
    float see = sfSee(min(s.y, s.w), px);
    m += see * (.025 * (sfH(floor(c) + 5.) - .5) - .12 * (joint - .02));
    m += .02 * sfSee(3., px) * sfTone(uv * .3);
  } else if (kind < 6.5) {
    // Curtain wall: mullions every p1 m, a spandrel band at each p2 m floor, a tone per pane.
    vec2 size = vec2(max(s.y, .3), max(s.w, .5)), c = uv / size, fc = fw / size;
    float mullion = max(sfLine(c.x, .03 / size.x, fc.x), sfLine(c.y, .03 / size.y, fc.y));
    float spandrel = step(fract(c.y), .9 / max(s.w, .5)) * sfSee(s.w, px);
    float see = sfSee(s.y, px);
    m += see * (.05 * (sfH(floor(c) + 2.) - .5) * (1. - mullion) + .14 * (mullion - .04));
    m -= .06 * (spandrel - .9 / max(s.w, .5));
    m += .03 * sfSee(6., px) * (fract(c.y) - .5);
  } else if (kind < 7.5) {
    // Aged copper: muted verdigris, uneven, streaked. Tone runs from brown-green (negative)
    // to pale verdigris (positive) along long vertical runs; standing seams every p1 m.
    float t = .6 * (sfN(vec2(uv.x * 2.2, uv.y * .12)) - .5) + .4 * sfTone(uv * .35);
    float see = sfSee(2., px);
    t *= see;
    m += .10 * t;
    hue = mix(vec3(1), t > 0. ? vec3(.93, 1.05, 1.03) : vec3(1.07, .96, .9), min(abs(t) * 3., 1.));
    float seam = sfLine(uv.x / max(s.y, .2), .02 / max(s.y, .2), fw.x / max(s.y, .2));
    m -= .08 * sfSee(s.y, px) * (seam - .04);
  } else if (kind < 8.5) {
    // Slate: 300 mm slates in 250 mm courses, varied per slate.
    m += .03 * sfSee(3., px) * sfTone(uv * .3);
#ifndef SURFACE_LOW
    if (px < .125) {
    vec2 c = vec2(uv.x / .3, uv.y / .25);
    c.x += .5 * mod(floor(c.y), 2.);
    float joint = max(sfLine(c.y, .05, fw.y / .25), sfLine(c.x, .03, fw.x / .3));
    m += sfSee(.25, px) * (.09 * (sfH(floor(c) + 3.) - .5) * (1. - joint) - .10 * (joint - .15));
    }
#endif
  } else if (kind < 9.5) {
    // Terracotta barrel tile: rounded ribs down the slope every 250 mm, 350 mm courses.
    m += .04 * sfSee(3., px) * sfTone(uv * .3);
#ifndef SURFACE_LOW
    if (px < .125) {
    vec2 c = vec2(uv.x / .25, uv.y / .35);
    float see = sfSee(.25, px);
    m += see * (.10 * cos(6.2832 * c.x) - .06 * (sfLine(c.y, .05, fw.y / .35) - .1) + .05 * (sfH(floor(c) + 9.) - .5));
    }
#endif
  } else if (kind < 10.5) {
    // Clapboard: 200 mm laps, each a little darker in the shadow under the board above.
    m += .015 * sfSee(3., px) * sfTone(uv * .3);
#ifndef SURFACE_LOW
    if (px < .1) m += .08 * sfSee(.2, px) * (fract(uv.y / .2) - .5);
#endif
  } else if (kind < 11.5) {
    // Wall shingles: 250 mm wide in 300 mm courses, staggered, varied per shingle.
    m += .025 * sfSee(3., px) * sfTone(uv * .3);
#ifndef SURFACE_LOW
    if (px < .125) {
    vec2 c = vec2(uv.x / .25, uv.y / .3);
    c.x += .37 * floor(c.y);
    float joint = max(sfLine(c.y, .06, fw.y / .3), sfLine(c.x, .03, fw.x / .25));
    m += sfSee(.25, px) * (.08 * (sfH(floor(c)) - .5) * (1. - joint) - .10 * (joint - .15));
    }
#endif
  } else if (kind < 12.5) {
    // Concrete: soft pour tone, faint lift lines every p1 m.
    m += .035 * sfSee(3., px) * sfTone(uv * .3);
    m -= .04 * sfSee(max(s.y, .3), px) * (sfLine(uv.y / max(s.y, .3), .01 / max(s.y, .3), fw.y / max(s.y, .3)) - .02);
#ifndef SURFACE_LOW
    if (px < .04) m += .025 * sfSee(.08, px) * (sfH(floor(uv * 12.)) - .5);
#endif
  } else {
    // Asphalt roofing: 140 mm courses with tab gaps, blotchy granule blends.
    m += .05 * sfSee(2., px) * sfTone(uv * .7);
#ifndef SURFACE_LOW
    vec2 c = vec2(uv.x / .33, uv.y / .14);
    c.x += .5 * mod(floor(c.y), 2.);
    if (px < .07) m -= .07 * sfSee(.14, px) * (max(sfLine(c.y, .06, fw.y / .14), sfLine(c.x, .015, fw.x / .33)) - .12);
#endif
  }
  return base * hue * (1. + a * m);
}
`;
