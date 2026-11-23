/**
 * Which City tier a device starts on (phone performance). The reference phone, a Galaxy A16
 * (Mali GPU, 4-6 GB, 411 CSS px wide), must start on low. Desktops and recent tablets stay high.
 * The rules are deliberately few: a wrong "low" costs some detail, a wrong "high" costs a
 * 4-second frame. The runtime fallback (perf.ts `watchSlow`) catches what these miss.
 */
export interface DeviceFacts {
  /** `(pointer: coarse)` */
  coarse: boolean;
  /** Shorter screen side in CSS px. */
  minScreen: number;
  /** navigator.deviceMemory in GB (Chromium only, capped at 8), or null. */
  memoryGB: number | null;
  /** navigator.hardwareConcurrency, or null. */
  cores: number | null;
  /** Unmasked WebGL renderer string, or null when hidden. */
  gpu: string | null;
}

/** Mobile and software GPUs that cannot carry the full board at the high tier. */
const WEAK_GPU = /\b(Mali|PowerVR|SwiftShader|llvmpipe|Adreno \(TM\) [1-6]\d\d|Adreno [1-6]\d\d)\b/i;

export function deviceTier(f: DeviceFacts): { tier: 'low' | 'high'; reason: string } {
  if (f.coarse && f.minScreen < 820) return { tier: 'low', reason: 'phone-sized touch screen' };
  if (f.gpu && WEAK_GPU.test(f.gpu)) return { tier: 'low', reason: `mobile or software GPU (${f.gpu})` };
  if (f.memoryGB !== null && f.memoryGB <= 4) return { tier: 'low', reason: `${f.memoryGB} GB device memory` };
  if (f.coarse && f.cores !== null && f.cores <= 4) return { tier: 'low', reason: `touch device with ${f.cores} cores` };
  return { tier: 'high', reason: 'desktop-class device' };
}

let gpuName: string | null | undefined;
/** The unmasked WebGL renderer, read once from a throwaway context. */
export function gpuRenderer(): string | null {
  if (gpuName !== undefined) return gpuName;
  gpuName = null;
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      gpuName = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }
  } catch { /* blocked or no WebGL */ }
  return gpuName;
}

export function deviceFacts(): DeviceFacts {
  const n = navigator as Navigator & { deviceMemory?: number };
  return {
    coarse: matchMedia('(pointer: coarse)').matches,
    minScreen: Math.min(screen.width, screen.height),
    memoryGB: typeof n.deviceMemory === 'number' ? n.deviceMemory : null,
    cores: n.hardwareConcurrency || null,
    gpu: gpuRenderer(),
  };
}
