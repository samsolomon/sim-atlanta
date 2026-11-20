/**
 * Weather for the vignette: live conditions from Open-Meteo (free, no key) when the page may
 * fetch it, or a picked preset. Drives cloud (flat light, soft shadows), rain (streaks and wet
 * surfaces), fog (distance haze) and storms (lightning).
 */
import * as THREE from 'three';
import { ATL } from './time';

export type WeatherKind = 'clear' | 'cloudy' | 'overcast' | 'rain' | 'storm' | 'fog';

export interface Weather {
  kind: WeatherKind;
  cloud: number; // 0..1
  rain: number; // 0..1
  fog: number; // 0..1
  label: string;
  tempF?: number;
  live: boolean;
}

export const PRESETS: Record<WeatherKind, Weather> = {
  clear: { kind: 'clear', cloud: 0, rain: 0, fog: 0, label: 'clear', live: false },
  cloudy: { kind: 'cloudy', cloud: 0.5, rain: 0, fog: 0, label: 'partly cloudy', live: false },
  overcast: { kind: 'overcast', cloud: 1, rain: 0, fog: 0.15, label: 'overcast', live: false },
  rain: { kind: 'rain', cloud: 1, rain: 0.7, fog: 0.3, label: 'rain', live: false },
  storm: { kind: 'storm', cloud: 1, rain: 1, fog: 0.4, label: 'thunderstorm', live: false },
  fog: { kind: 'fog', cloud: 0.8, rain: 0, fog: 1, label: 'fog', live: false },
};

/** WMO weather code (as used by Open-Meteo) → our weather. */
export function fromWmo(code: number, cloudPct: number, precipMm: number, visM: number | undefined, tempF?: number): Weather {
  const cloud = Math.min(1, Math.max(0, cloudPct / 100));
  const visFog = visM != null ? 1 - Math.min(1, Math.max(0, (visM - 300) / 9700)) : 0;
  const base = { cloud, tempF, live: true };
  if (code >= 95) return { ...base, kind: 'storm', cloud: 1, rain: 1, fog: Math.max(0.4, visFog), label: 'thunderstorm' };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    const heavy = code === 65 || code === 67 || code === 82 || precipMm > 4;
    const light = code === 51 || code === 61 || code === 80 || precipMm < 0.5;
    return { ...base, kind: 'rain', cloud: 1, rain: heavy ? 1 : light ? 0.4 : 0.7, fog: Math.max(0.25, visFog), label: code <= 57 ? 'drizzle' : heavy ? 'heavy rain' : light ? 'light rain' : 'rain' };
  }
  if (code === 45 || code === 48) return { ...base, kind: 'fog', rain: 0, fog: Math.max(0.8, visFog), label: 'fog' };
  if (code >= 71 && code <= 77) return { ...base, kind: 'overcast', cloud: 1, rain: 0, fog: 0.4, label: 'snow' }; // snow: not modelled yet
  if (code === 3) return { ...base, kind: 'overcast', rain: 0, fog: visFog * 0.6, label: 'overcast' };
  if (code === 2 || code === 1) return { ...base, kind: 'cloudy', rain: 0, fog: visFog * 0.6, label: code === 1 ? 'mostly clear' : 'partly cloudy' };
  return { ...base, kind: 'clear', rain: 0, fog: visFog * 0.6, label: 'clear' };
}

/** Current Atlanta weather, or null if the page can't reach Open-Meteo. */
export async function fetchLive(): Promise<Weather | null> {
  const u = new URL('https://api.open-meteo.com/v1/forecast');
  u.search = new URLSearchParams({
    latitude: String(ATL.lat),
    longitude: String(ATL.lon),
    current: 'weather_code,cloud_cover,precipitation,visibility,temperature_2m',
    temperature_unit: 'fahrenheit',
    timezone: 'America/New_York',
  }).toString();
  try {
    const r = await fetch(u, { signal: AbortSignal.timeout(6000) });
    if (!r.ok) return null;
    const c = (await r.json()).current;
    return fromWmo(c.weather_code, c.cloud_cover, c.precipitation, c.visibility, c.temperature_2m);
  } catch {
    return null;
  }
}

/** Rain streaks animated entirely in the vertex shader: one draw call, no per-frame uploads. */
export class Rain {
  readonly mesh: THREE.LineSegments;
  private mat: THREE.ShaderMaterial;
  constructor(count = 9000, box = 700, height = 260) {
    const base = new Float32Array(count * 2 * 3);
    const end = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * box;
      const z = (Math.random() - 0.5) * box;
      const y = Math.random() * height;
      for (let k = 0; k < 2; k++) {
        base.set([x, y, z], (i * 2 + k) * 3);
        end[i * 2 + k] = k;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(base, 3));
    g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uH: { value: height }, uAmount: { value: 0 }, uColor: { value: new THREE.Color('#c9d3e2') } },
      vertexShader: /* glsl */ `
        attribute float aEnd;
        uniform float uTime; uniform vec3 uCenter; uniform float uH; uniform float uAmount;
        varying float vA;
        void main() {
          float id = position.x * 12.9898 + position.z * 78.233;
          float keep = step(fract(sin(id) * 43758.5453), uAmount);
          float y = mod(position.y - uTime * 55.0, uH);
          vec3 p = vec3(position.x + uCenter.x, y + uCenter.y - 10.0, position.z + uCenter.z);
          p += vec3(0.6, 2.4, 0.3) * aEnd; // streak length and a little wind
          vA = keep * (0.35 + 0.65 * aEnd);
          gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor; varying float vA;
        void main() { if (vA < 0.01) discard; gl_FragColor = vec4(uColor, 0.55 * vA); }`,
    });
    this.mesh = new THREE.LineSegments(g, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 20;
  }
  update(t: number, center: THREE.Vector3, amount: number) {
    this.mat.uniforms.uTime.value = t;
    this.mat.uniforms.uCenter.value.copy(center);
    this.mat.uniforms.uAmount.value = amount;
    this.mesh.visible = amount > 0.01;
  }
}
