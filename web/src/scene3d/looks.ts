/**
 * Visual "looks" for the diorama: same geometry and data, different lighting, palette and
 * materials. Used for look-dev (?look=<id>, or L to cycle) before we commit to one style.
 *
 * Buildings carry no normals or ids, so the shader derives both: the face normal from screen
 * derivatives, and a per-building hash from the baked vertex colour (which already includes a
 * per-building jitter). Windows are procedural: 3.5 m floors × 3 m bays on every wall.
 */
import * as THREE from 'three';

export interface Look {
  id: string;
  name: string;
  sky: [string, string]; // top, horizon
  fog?: { color: string; near: number; far: number };
  hemi: { sky: string; ground: string; intensity: number };
  sun: { color: string; intensity: number; dir: [number, number, number]; shadows: boolean };
  ground: string;
  roads: string;
  track: string;
  buildings: {
    /** baked = pipeline colours; mono = one material colour; palette = pick by building. */
    mode: 'baked' | 'mono' | 'palette';
    colors?: string[];
    roof?: string; // roof tint multiplier
    toon?: boolean;
    /** Night: fraction of windows lit and their colour. Day: how dark the glass reads (0 = none). */
    windows?: { lit: number; color: string; glass: number };
  };
  edges?: { color: string; opacity: number };
  trainsGlow?: boolean;
  /** Render at 1/n resolution with nearest-neighbour upscaling. */
  pixel?: number;
  exposure?: number;
}

export const LOOKS: Look[] = [
  {
    id: 'baseline',
    name: 'Baseline',
    sky: ['#e9e6df', '#e9e6df'],
    hemi: { sky: '#f4f1ea', ground: '#8a8478', intensity: 1.6 },
    sun: { color: '#fff3dd', intensity: 1.6, dir: [-600, 900, 400], shadows: false },
    ground: '#e2ddd2',
    roads: '#ffffff',
    track: '#ffffff',
    buildings: { mode: 'baked' },
  },
  {
    id: 'maquette',
    name: 'Architect’s model',
    sky: ['#f3f2ee', '#dcdad3'],
    hemi: { sky: '#ffffff', ground: '#b9b4a8', intensity: 1.9 },
    sun: { color: '#ffffff', intensity: 2.2, dir: [-500, 1100, 300], shadows: true },
    ground: '#d8d3c6',
    roads: '#ebe7de',
    track: '#c9c4b8',
    buildings: { mode: 'mono', colors: ['#f7f5f0'], roof: '#ffffff', windows: { lit: 0, color: '#000000', glass: 0.06 } },
  },
  {
    id: 'golden',
    name: 'Golden hour',
    sky: ['#7d8fb8', '#f2b98a'],
    fog: { color: '#efc29c', near: 3200, far: 7000 },
    hemi: { sky: '#a8b8e8', ground: '#7a6a70', intensity: 1.5 },
    sun: { color: '#ffb36b', intensity: 3.2, dir: [-900, 380, 150], shadows: true },
    ground: '#e6d2b8',
    roads: '#f4e4cc',
    track: '#d9b89a',
    buildings: { mode: 'mono', colors: ['#f3e6d6'], roof: '#fff4e4', windows: { lit: 0.08, color: '#ffcf8a', glass: 0.18 } },
    exposure: 1.05,
  },
  {
    id: 'night',
    name: 'Night',
    sky: ['#070b18', '#1b2340'],
    fog: { color: '#161c34', near: 3300, far: 7500 },
    hemi: { sky: '#8090d0', ground: '#202638', intensity: 2.4 },
    sun: { color: '#9fb4ff', intensity: 0.8, dir: [300, 900, -400], shadows: false },
    ground: '#2c3142',
    roads: '#b08a5a',
    track: '#3a3f55',
    buildings: { mode: 'mono', colors: ['#5a6280'], roof: '#c8d0f0', windows: { lit: 0.38, color: '#ffc979', glass: 0.5 } },
    trainsGlow: true,
  },
  {
    id: 'toy',
    name: 'Toy town',
    sky: ['#bfe3f0', '#f7efd9'],
    hemi: { sky: '#ffffff', ground: '#c8b89a', intensity: 1.5 },
    sun: { color: '#fff6e0', intensity: 2.4, dir: [-500, 900, 500], shadows: true },
    ground: '#a9cf8f',
    roads: '#f5efe2',
    track: '#c99a7a',
    buildings: {
      mode: 'palette',
      colors: ['#f2c7a5', '#f7e3b0', '#b9d7e8', '#e8b4b8', '#cfe3c4', '#f4f0e6', '#d9c8e9'],
      roof: '#ffffff',
      toon: true,
    },
    edges: { color: '#3b3346', opacity: 0.55 },
  },
  {
    id: 'pixel',
    name: 'Pixel diorama',
    sky: ['#8ec5e8', '#f6e7c8'],
    hemi: { sky: '#ffffff', ground: '#a08c70', intensity: 1.4 },
    sun: { color: '#fff1d6', intensity: 2.6, dir: [-700, 800, 300], shadows: true },
    ground: '#9fbf7f',
    roads: '#d8d0c0',
    track: '#b08060',
    buildings: {
      mode: 'palette',
      colors: ['#e8d8c0', '#c8d8e8', '#f0c8a0', '#d8e8d0', '#e0c8d8', '#f4ecd8'],
      roof: '#ffffff',
      toon: true,
      windows: { lit: 0, color: '#000000', glass: 0.35 },
    },
    pixel: 3,
  },
];

export function lookById(id: string | null | undefined): Look {
  return LOOKS.find((l) => l.id === id) ?? LOOKS[0];
}

// ---- building material ---------------------------------------------------------------

export interface BuildingUniforms {
  uMode: { value: number };
  uPalette: { value: THREE.Color[] };
  uPaletteN: { value: number };
  uRoof: { value: THREE.Color };
  uLit: { value: number };
  uWinColor: { value: THREE.Color };
  uGlass: { value: number };
}

export function makeBuildingUniforms(): BuildingUniforms {
  return {
    uMode: { value: 0 },
    uPalette: { value: Array.from({ length: 8 }, () => new THREE.Color(1, 1, 1)) },
    uPaletteN: { value: 1 },
    uRoof: { value: new THREE.Color(1, 1, 1) },
    uLit: { value: 0 },
    uWinColor: { value: new THREE.Color(1, 0.8, 0.5) },
    uGlass: { value: 0 },
  };
}

export function setBuildingUniforms(u: BuildingUniforms, look: Look) {
  const b = look.buildings;
  u.uMode.value = b.mode === 'baked' ? 0 : b.mode === 'mono' ? 1 : 2;
  const cols = b.colors ?? ['#ffffff'];
  cols.slice(0, 8).forEach((c, i) => u.uPalette.value[i].set(c));
  u.uPaletteN.value = Math.min(cols.length, 8);
  u.uRoof.value.set(b.roof ?? '#ffffff');
  u.uLit.value = b.windows?.lit ?? 0;
  u.uWinColor.value.set(b.windows?.color ?? '#000000');
  u.uGlass.value = b.windows?.glass ?? 0;
}

const HEAD = /* glsl */ `
uniform int uMode;
uniform vec3 uPalette[8];
uniform int uPaletteN;
uniform vec3 uRoof;
uniform float uLit;
uniform vec3 uWinColor;
uniform float uGlass;
varying vec3 vWPos;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float h31(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
`;

/** Patch a Lambert/Toon material with palette, roof tint and procedural windows. */
export function patchBuildingMaterial(mat: THREE.Material, u: BuildingUniforms) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${HEAD}`)
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        vec3 fN = normalize(cross(dFdx(vWPos), dFdy(vWPos)));
        float isRoof = step(0.7, abs(fN.y));
        // Walls are the roof colour darkened (scaled), so hash the channel ratios to match them.
        float bh = h21(floor(vec2(vColor.r, vColor.b) / max(vColor.g, 1e-3) * 60.0));
        if (uMode == 1) diffuseColor.rgb = uPalette[0] * (0.94 + 0.08 * bh);
        if (uMode == 2) {
          int k = int(floor(bh * float(uPaletteN)));
          for (int i = 0; i < 8; i++) if (i == k) diffuseColor.rgb = uPalette[i];
        }
        diffuseColor.rgb *= mix(vec3(1.0), uRoof, isRoof);
        // Windows: 3.5 m floors, 3 m bays along the wall; fade out where they'd alias.
        vec3 tng = normalize(vec3(-fN.z, 0.0, fN.x));
        vec2 cell = vec2(dot(vWPos, tng) / 3.0, vWPos.y / 3.5);
        vec2 fw = fwidth(cell);
        float clarity = clamp(1.0 - max(fw.x, fw.y) * 1.6, 0.0, 1.0);
        vec2 f = fract(cell);
        float pane = step(0.18, f.x) * step(f.x, 0.82) * step(0.3, f.y) * step(f.y, 0.78);
        float win = pane * (1.0 - isRoof) * step(3.5, vWPos.y) * clarity;
        float lit = step(1.0 - uLit, h21(floor(cell) + bh * 91.0)) * win;
        diffuseColor.rgb *= 1.0 - uGlass * win;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>\ntotalEmissiveRadiance += uWinColor * lit;`,
      );
  };
  mat.customProgramCacheKey = () => 'building-look';
}

export function skyTexture(top: string, bottom: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 2;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
