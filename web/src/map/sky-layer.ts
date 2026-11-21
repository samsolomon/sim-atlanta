/**
 * The Map's sky: one MapLibre custom layer, a full-screen shader drawn above the basemap's
 * fills and below our rail, stations and labels, so it never hides what matters.
 *   - light: a warm wash on the side the sun is on, soft shade opposite; its angle follows the
 *     sun, so it sweeps across the city over a day. At night, cool moonlight and a downtown glow.
 *   - weather (Atlanta's): drifting cloud shadows (anchored to the ground), rain streaks, snow,
 *     fog haze. It fades as you zoom out or move away from the metro: one city's rain shouldn't
 *     cover Georgia.
 *   - a fine grain, as in the diorama.
 * Animates only while there's weather to animate, at ≤ 30 fps, and holds still under
 * prefers-reduced-motion.
 */
import type { CustomLayerInterface, Map as MlMap } from 'maplibre-gl';
import type { Atmosphere } from '../core/atmosphere';

const DOWNTOWN: [number, number] = [-84.388, 33.755];
const KM_X = 92.6; // km per degree of longitude at Atlanta
const KM_Y = 111.2;

const VS = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5); gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FS = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uO, uDX, uDY;     // km coords at screen uv (0,0), (1,0), (0,1)
uniform vec2 uSun;             // screen direction toward the sun (y down)
uniform float uDay, uLow, uDark;
uniform float uCloud, uRain, uSnow, uFog, uWx;
uniform vec2 uGlow; uniform float uGlowR;
uniform float uMotion;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

vec3 col = vec3(0.0); float alpha = 0.0;
void over(vec3 c, float a) { a = clamp(a, 0.0, 1.0); col = c * a + col * (1.0 - a); alpha = a + alpha * (1.0 - a); }

void main() {
  vec2 uv = vUv;
  vec2 px = uv * uRes;
  vec2 km = uO + uv.x * (uDX - uO) + uv.y * (uDY - uO);
  float t = uTime * uMotion;

  // ---- light: warm on the sun's side, soft shade opposite (day); moonlight + glow (night)
  float s = clamp(dot(uv - 0.5, uSun) * 1.6, -1.0, 1.0);
  vec3 warm = mix(vec3(1.0, 0.94, 0.80), vec3(1.0, 0.70, 0.42), uLow);
  float flatL = 1.0 - uCloud * 0.75;
  over(warm, max(s, 0.0) * (0.07 + 0.10 * uLow) * uDay * flatL);
  over(vec3(0.20, 0.18, 0.26), max(-s, 0.0) * (0.05 + 0.05 * uLow) * uDay * flatL);
  over(vec3(0.10, 0.14, 0.26), 0.10 * uDark);
  float g = length((uv - uGlow) * vec2(uRes.x / uRes.y, 1.0)) / max(uGlowR, 1e-3);
  over(vec3(1.0, 0.72, 0.38), 0.16 * uDark * exp(-g * g));

  // ---- weather (fades with zoom and distance from Atlanta: uWx)
  vec2 wind = vec2(0.9, 0.35) * t * 0.012; // km/s, exaggerated so it reads
  float cl = fbm(km * 0.22 + wind);
  over(mix(vec3(0.16, 0.17, 0.2), vec3(0.0), uDark), uCloud * uWx * 0.13 * smoothstep(0.42, 0.78, cl));

  vec3 haze = mix(vec3(0.94, 0.95, 0.95), vec3(0.16, 0.19, 0.24), uDark);
  vec2 e = abs(uv - 0.5) * 2.0;
  float edge = smoothstep(0.35, 1.25, max(e.x, e.y) + 0.3 * fbm(km * 0.5 + wind * 0.5));
  over(haze, uFog * uWx * (0.06 + 0.18 * edge)); // the DOM fog overlay adds the edge blur

  if (uRain > 0.0) {
    vec2 q = vec2(px.x + px.y * 0.22, px.y - t * 900.0);
    vec2 cell = floor(q / vec2(7.0, 46.0));
    float h = hash(cell);
    float y = fract(q.y / 46.0);
    float x = abs(fract(q.x / 7.0) - 0.5);
    float streak = step(1.0 - 0.18 * uRain, h) * smoothstep(0.0, 0.15, y) * smoothstep(0.75, 0.25, y) * smoothstep(0.18, 0.0, x);
    over(mix(vec3(0.85, 0.9, 0.96), vec3(0.7, 0.78, 0.9), uDark), streak * uWx * 0.55);
    over(mix(vec3(0.55, 0.63, 0.72), vec3(0.1, 0.13, 0.2), uDark), uRain * uWx * 0.05);
  }
  if (uSnow > 0.0) {
    vec2 q = px / 22.0 + vec2(sin(t * 0.4) * 0.6, -t * 1.1);
    vec2 cell = floor(q);
    float h = hash(cell);
    vec2 c = fract(q) - 0.5 + (vec2(hash(cell + 7.1), hash(cell + 3.3)) - 0.5) * 0.6;
    float flake = step(1.0 - 0.35 * uSnow, h) * smoothstep(0.09, 0.03, length(c));
    over(vec3(1.0), flake * uWx * 0.85);
  }

  // ---- grain
  float n = hash(px + fract(t * 0.7) * 91.0) - 0.5;
  over(n > 0.0 ? vec3(1.0) : vec3(0.0), abs(n) * 0.05);

  gl_FragColor = vec4(col * alpha, alpha); // premultiplied
}`;

export class SkyLayer implements CustomLayerInterface {
  readonly id = 'sky';
  readonly type = 'custom' as const;
  readonly renderingMode = '2d' as const;
  atm: Atmosphere | null = null;
  private map!: MlMap;
  private prog!: WebGLProgram;
  private buf!: WebGLBuffer;
  private loc: Record<string, WebGLUniformLocation | null> = {};
  private timer = 0;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)');

  onAdd(map: MlMap, gl: WebGLRenderingContext) {
    this.map = map;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(p);
    this.prog = p;
    this.buf = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    for (const u of ['uRes', 'uTime', 'uO', 'uDX', 'uDY', 'uSun', 'uDay', 'uLow', 'uDark', 'uCloud', 'uRain', 'uSnow', 'uFog', 'uWx', 'uGlow', 'uGlowR', 'uMotion'])
      this.loc[u] = gl.getUniformLocation(p, u);
  }

  onRemove() {
    clearInterval(this.timer);
  }

  /** New atmosphere: repaint, and keep animating while there's weather to move. */
  set(a: Atmosphere) {
    this.atm = a;
    const wx = this.weatherStrength();
    const moving = !this.reduced.matches && wx > 0.02 && (a.rain > 0.02 || a.snow > 0.02 || a.cloud > 0.05 || a.fog > 0.05);
    const fast = a.rain > 0.02 || a.snow > 0.02;
    clearInterval(this.timer);
    this.timer = moving ? window.setInterval(() => this.map.triggerRepaint(), fast ? 33 : 120) : 0;
    this.map.triggerRepaint();
  }

  /** How much Atlanta's weather applies here: fades out zoomed out or far from the metro. */
  weatherStrength() {
    if (!this.map) return 0;
    const z = this.map.getZoom();
    const c = this.map.getCenter();
    const km = Math.hypot((c.lng - DOWNTOWN[0]) * KM_X, (c.lat - DOWNTOWN[1]) * KM_Y);
    const sm = (a: number, b: number, x: number) => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    };
    return sm(7, 9.5, z) * (1 - sm(50, 90, km));
  }

  render(gl: WebGLRenderingContext) {
    const a = this.atm;
    if (!a) return;
    const m = this.map;
    const canvas = m.getCanvas();
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const km = (x: number, y: number) => {
      const ll = m.unproject([x, y]);
      return [(ll.lng - DOWNTOWN[0]) * KM_X, (ll.lat - DOWNTOWN[1]) * KM_Y * -1] as const; // y down like screen
    };
    const o = km(0, 0);
    const dx = km(w, 0);
    const dy = km(0, h);
    const ang = ((a.sunAz - m.getBearing()) * Math.PI) / 180;
    const glow = m.project(DOWNTOWN);
    const glowEdge = m.project([DOWNTOWN[0] + 5 / KM_X, DOWNTOWN[1]]);
    const lowSun = 1 - Math.min(1, Math.max(0, (a.sunElev - 3) / 22));

    gl.useProgram(this.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buf);
    const pos = gl.getAttribLocation(this.prog, 'aPos');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
    const L = this.loc;
    gl.uniform2f(L.uRes, canvas.width, canvas.height);
    gl.uniform1f(L.uTime, (performance.now() / 1000) % 10000);
    gl.uniform2f(L.uO, o[0], o[1]);
    gl.uniform2f(L.uDX, dx[0], dx[1]);
    gl.uniform2f(L.uDY, dy[0], dy[1]);
    gl.uniform2f(L.uSun, Math.sin(ang), -Math.cos(ang));
    gl.uniform1f(L.uDay, 1 - a.dark);
    gl.uniform1f(L.uLow, a.dark < 1 ? lowSun : 0);
    gl.uniform1f(L.uDark, a.dark);
    gl.uniform1f(L.uCloud, a.cloud);
    gl.uniform1f(L.uRain, a.rain);
    gl.uniform1f(L.uSnow, a.snow);
    gl.uniform1f(L.uFog, a.fog);
    gl.uniform1f(L.uWx, this.weatherStrength());
    gl.uniform2f(L.uGlow, glow.x / w, glow.y / h);
    gl.uniform1f(L.uGlowR, Math.max(0.02, Math.abs(glowEdge.x - glow.x) / h));
    gl.uniform1f(L.uMotion, this.reduced.matches ? 0 : 1);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
