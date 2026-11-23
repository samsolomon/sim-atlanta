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
// A joint of half-width \`w\` (in cells) on the integer lines of t, minus its own average (2w), so
// it never shifts the wall's mean. f is one pixel's footprint in cells, passed in rather than
// taken with fwidth so it stays defined inside the branches that skip invisible detail. The
// joint antialiases by f and fades out, mean and all, once a cell is under about 7 pixels.
float sfJoint(float t, float w, float f) { float e = .5 - abs(fract(t) - .5);
  return (1. - smoothstep(w, w + f, e) - 2. * w) * (1. - smoothstep(.15, .45, f)); }
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
    float head = sfJoint(c.x, .022, fx) + (bond > .5 && bond < 1.5 ? sfJoint(c.x - .667, .022, fx) : 0.);
    float see = sfSee(.075, px); // zero by px = .0375, so the branch edge above never pops
    float joint = (sfJoint(c.y, .067, fw.y / .075) + head) * see;
    m += .07 * see * (sfH(floor(c) + vec2(0., row * 3.1)) - .5) + .10 * sign(s.w) * joint;
    }
#endif
  } else if (kind < 2.5) {
    // Stucco: trowel mottle and faint rain streaks, no joints.
    // Mottle and streaks are tuned to read from the City's 150 m+ orbit (2026-11-23 gain study).
    m += .08 * sfSee(3., px) * sfTone(uv * .35);
    m += .06 * sfSee(1.5, px) * (sfN(vec2(uv.x * 1.6, uv.y * .08)) - .5);
#ifndef SURFACE_LOW
    if (px < .15) m += .03 * sfSee(.3, px) * (sfN(uv * 3.3) - .5);
#endif
  } else if (kind < 3.5 || (kind > 4.5 && kind < 5.5)) {
    // Ashlar and granite: running-bond blocks p1 m high and twice as long, darker joints.
    float course = max(s.y, .2);
    vec2 c = vec2(uv.x / (2. * course), uv.y / course);
    c.x += .5 * mod(floor(c.y), 2.);
    float joint = sfJoint(c.y, .012 / course + .006, fw.y / course) + sfJoint(c.x, .006 / course + .003, fw.x / (2. * course));
    float vary = kind > 4.5 ? .045 : .03;
    m += vary * sfSee(course, px) * (sfH(floor(c) + 11.) - .5) - .09 * joint;
    m += .03 * sfSee(3., px) * sfTone(uv * .3);
#ifndef SURFACE_LOW
    if (kind > 4.5 && px < .015) m += .04 * sfSee(.03, px) * (sfH(floor(uv * 40.)) - .5); // granite grain
#endif
  } else if (kind < 4.5) {
    // Precast panels p1 wide and p2 high, with darker reveals and a slight tone per panel.
    vec2 size = vec2(max(s.y, .3), max(s.w, .3)), c = uv / size, fc = fw / size;
    float joint = sfJoint(c.x, .012 / size.x, fc.x) + sfJoint(c.y, .012 / size.y, fc.y);
    m += .025 * sfSee(min(size.x, size.y), px) * (sfH(floor(c) + 5.) - .5) - .12 * joint;
    m += .02 * sfSee(3., px) * sfTone(uv * .3);
  } else if (kind < 6.5) {
    // Curtain wall: mullions every p1 m, a spandrel band at each p2 m floor, a tone per pane.
    vec2 size = vec2(max(s.y, .3), max(s.w, 1.)), c = uv / size, fc = fw / size;
    float mullion = sfJoint(c.x, .03 / size.x, fc.x) + sfJoint(c.y, .03 / size.y, fc.y);
    // A 0.9 m spandrel band above each floor line, drawn as a wide joint centred in the band.
    float band = .45 / size.y, spandrel = sfJoint(c.y - band, band, fc.y);
    m += .05 * sfSee(size.x, px) * (sfH(floor(c) + 2.) - .5) + .14 * mullion - .06 * spandrel;
    // Glass brightens slightly towards each floor's head.
    m += .03 * (1. - smoothstep(.15, .45, fc.y)) * (fract(c.y) - .5);
  } else if (kind < 7.5) {
    // Aged copper: muted verdigris, uneven, streaked. Tone runs from brown-green (negative)
    // to pale verdigris (positive) along long vertical runs; standing seams every p1 m.
    float t = .6 * (sfN(vec2(uv.x * 2.2, uv.y * .12)) - .5) + .4 * sfTone(uv * .35);
    float see = sfSee(2., px);
    t *= see;
    // Tuned to read from the City's 150 m+ orbit (2026-11-23 gain study: 2.5x the first pass).
    m += .25 * t;
    // The two tints average to white, so the roof keeps its authored colour as the mean.
    hue = mix(vec3(1), t > 0. ? vec3(.94, 1.04, 1.04) : vec3(1.06, .96, .96), min(abs(t) * 7., 1.) * a);
    // Standing seams every p1 m; 0 leaves them to the model's own geometry.
    if (s.y > .01) { float seam = max(s.y, .2); m -= .08 * sfJoint(uv.x / seam, .02 / seam, fw.x / seam); }
  } else if (kind < 8.5) {
    // Slate: 300 mm slates in 250 mm courses, varied per slate.
    m += .03 * sfSee(3., px) * sfTone(uv * .3);
#ifndef SURFACE_LOW
    if (px < .125) {
    vec2 c = vec2(uv.x / .3, uv.y / .25);
    c.x += .5 * mod(floor(c.y), 2.);
    m += sfSee(.25, px) * (.09 * (sfH(floor(c) + 3.) - .5) - .10 * (sfJoint(c.y, .05, fw.y / .25) + sfJoint(c.x, .03, fw.x / .3)));
    }
#endif
  } else if (kind < 9.5) {
    // Terracotta barrel tile: rounded ribs down the slope every 250 mm, 350 mm courses.
    m += .04 * sfSee(3., px) * sfTone(uv * .3);
#ifndef SURFACE_LOW
    if (px < .125) {
    vec2 c = vec2(uv.x / .25, uv.y / .35);
    float see = sfSee(.25, px);
    m += see * (.10 * cos(6.2832 * c.x) + .05 * (sfH(floor(c) + 9.) - .5) - .06 * sfJoint(c.y, .05, fw.y / .35));
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
    m += sfSee(.25, px) * (.08 * (sfH(floor(c)) - .5) - .10 * (sfJoint(c.y, .06, fw.y / .3) + sfJoint(c.x, .03, fw.x / .25)));
    }
#endif
  } else if (kind < 12.5) {
    // Concrete: soft pour tone, faint lift lines every p1 m.
    m += .035 * sfSee(3., px) * sfTone(uv * .3);
    float lift = max(s.y, .3);
    m -= .04 * sfJoint(uv.y / lift, .01 / lift, fw.y / lift);
#ifndef SURFACE_LOW
    if (px < .04) m += .025 * sfSee(.08, px) * (sfH(floor(uv * 12.)) - .5);
#endif
  } else {
    // Asphalt roofing: 140 mm courses with tab gaps, blotchy granule blends.
    m += .05 * sfSee(2., px) * sfTone(uv * .7);
#ifndef SURFACE_LOW
    vec2 c = vec2(uv.x / .33, uv.y / .14);
    c.x += .5 * mod(floor(c.y), 2.);
    if (px < .07) m -= .07 * sfSee(.14, px) * (sfJoint(c.y, .06, fw.y / .14) + sfJoint(c.x, .015, fw.x / .33));
#endif
  }
  return base * hue * (1. + a * m);
}
`;
