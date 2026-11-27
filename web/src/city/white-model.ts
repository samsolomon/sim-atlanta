/**
 * City arrives as a white study model (A2c step 9, docs/ui-controls-brief.md "Loading and
 * arrival"). The real scene is drawn once with one paper-white override material, keeping its
 * light, shadows, ink and grade. That frame is held as a still overlay while the colour
 * materials compile, and colour then fades in underneath. Nothing moves while it loads.
 *
 * The white material is swapped onto each mesh for those frames: RenderPass.overrideMaterial
 * (the brief's quick test) reaches only the first pass, and the passes that redraw the scene
 * themselves then disagree with it.
 */
import * as THREE from 'three';

export const WHITE_MODEL = 0xf4efe4;
export const WHITE_ALBEDO = 0.9;
/** The white-to-colour fade (paper arrival), shared with the placeholder's dissolve (placeholder.ts). */
export const WHITE_FADE_MS = 1000;
/** The fade's ease-in-out, as CSS and as a function of t in [0, 1]. */
export const WHITE_EASE = [0.45, 0, 0.55, 1] as const;
export function easeInOut(t: number) {
  // cubic-bezier(x1, y1, x2, y2): solve x(u) = t by bisection, then return y(u).
  const [x1, y1, x2, y2] = WHITE_EASE;
  const bez = (u: number, a: number, b: number) => 3 * (1 - u) * (1 - u) * u * a + 3 * (1 - u) * u * u * b + u * u * u;
  let lo = 0, hi = 1;
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (bez(m, x1, x2) < t) lo = m; else hi = m; }
  return bez((lo + hi) / 2, y1, y2);
}

export type WhitePhase = 'waiting' | 'white' | 'compiling' | 'colour' | 'done';

export function createWhiteModel(o: {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  container: HTMLElement;
  /** Vehicles, people, rain and snow: they appear only with colour. */
  hide: () => (THREE.Object3D | undefined | false | null)[];
  reducedMotion: boolean;
  /** With everything one colour the ink mostly draws silhouettes: strengthen it while white. */
  inkBoost?: () => void;
  /** Passes to skip while white: ambient occlusion runs at CSS resolution and, against the
   * swapped materials, came out cropped on the High tier. The white model doesn't need it. */
  skipPasses?: ({ enabled: boolean } | null | undefined)[];
  /** The placeholder's masses alone (true) or whole (false), for the buildings-only still. */
  massesOnly?: (on: boolean) => void;
  /**
   * 'paper': the white model fades in over the paper, then colour (first open from a link).
   * 'map': white buildings only, over a transparent background, standing on the tilted 2D map
   *   underneath; then the full colour scene, ground included, cross-fades in over the map.
   * 'fade': City was built before this session: no white stage, colour cross-fades in.
   */
  mode?: 'paper' | 'map' | 'fade';
}) {
  let mode = o.mode ?? 'paper';
  const ease = `cubic-bezier(${WHITE_EASE.join(',')})`; // ease-in-out, as the brief asks
  // A slightly lowered albedo keeps sunlit faces from clipping to one flat white. No board clipping
  // planes: on this material they culled every mesh. (Dev: ?whitealbedo= to tune.)
  const albedo = (import.meta.env.DEV && Number(new URLSearchParams(location.search).get('whitealbedo'))) || WHITE_ALBEDO;
  const white = new THREE.MeshLambertMaterial({ color: new THREE.Color(WHITE_MODEL).multiplyScalar(albedo) });
  // Nothing draws until the host has placed the camera and set the sky (begin()).
  let phase: WhitePhase = 'waiting';
  // The first frames settle lighting, shadow maps and size: draw the white model live for a few,
  // and take the still from the last.
  const SETTLE = 6;
  let whiteFrames = 0;
  const skipped: [{ enabled: boolean }, boolean][] = [];
  let ro: ResizeObserver | undefined;
  // The still is only true for the camera and canvas it was taken with.
  const stillCamera = new THREE.Matrix4();
  const finish = () => {
    ro?.disconnect();
    ro = undefined;
  };
  let resolveRevealed!: () => void;
  const revealed = new Promise<void>((r) => (resolveRevealed = r));
  const overlay = document.createElement('canvas');
  overlay.className = 'city-white-model';
  overlay.setAttribute('aria-hidden', 'true');
  overlay.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0;z-index:1';
  const fade = (ms: number) => (overlay.style.transition = o.reducedMotion ? 'none' : `opacity ${ms}ms ${ease}`);
  const fadeCanvas = (to: number, ms: number) => {
    const c = o.container.style;
    c.transition = o.reducedMotion ? 'none' : `opacity ${ms}ms ${ease}`;
    c.opacity = String(to);
  };
  // In 'map' mode the canvas stays hidden until colour, so the still sits beside it, not inside.
  const place = () => (mode === 'map' ? o.container.after(overlay) : o.container.append(overlay));

  /** Buildings only, in white, over a transparent background (the map shows through). */
  // A landmark is a group of parts (podium, tower, canopy): judge the largest building-sized
  // ancestor, so its short parts stay with it. World's merged buildings are tagged.
  const sizes = new Map<THREE.Object3D, boolean>();
  const buildingSized = (x: THREE.Object3D, box: THREE.Box3) => {
    let v = sizes.get(x);
    if (v === undefined) {
      box.setFromObject(x);
      const size = box.getSize(new THREE.Vector3());
      v = size.y > 6 && Math.max(size.x, size.z) < 600;
      sizes.set(x, v);
    }
    return v;
  };
  const isBuilding = (mesh: THREE.Mesh, box: THREE.Box3) => {
    for (let x: THREE.Object3D | null = mesh; x && x !== o.scene; x = x.parent) {
      if (x.userData.building || buildingSized(x, box)) return true;
    }
    return false;
  };
  const LUT = new Uint8Array(256).map((_, i) => {
    const v = i / 255;
    return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
  });
  function drawBuildingsOnly(into: HTMLCanvasElement) {
    const c = o.renderer.domElement;
    const w = c.width, h = c.height;
    const rt = new THREE.WebGLRenderTarget(w, h, { depthBuffer: true });
    const bg = o.scene.background, fog = o.scene.fog;
    const clear = o.renderer.getClearColor(new THREE.Color()), alpha = o.renderer.getClearAlpha();
    const off: THREE.Object3D[] = [];
    for (const x of o.hide()) if (x && x.visible) { x.visible = false; off.push(x); }
    const box = new THREE.Box3();
    // Settle distance switches (house tiles) for this camera first, so nothing changes version mid-render in colour.
    o.scene.traverse((m) => { if ((m as THREE.LOD).isLOD && (m as THREE.LOD).autoUpdate) (m as THREE.LOD).update(o.camera); });
    o.scene.traverseVisible((m) => {
      const mesh = m as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      // The placeholder is white already, and draws its masses alone over the map (placeholder.ts).
      if (mesh.userData.placeholder) return;
      const skip = (mesh as THREE.InstancedMesh).instanceColor || mats.some((x) => x.transparent || x.alphaTest > 0);
      if (skip || !isBuilding(mesh, box)) off.push(mesh);
      else {
        swapped.set(mesh, mesh.material);
        mesh.material = white;
      }
    });
    for (const m of off) m.visible = false;
    o.massesOnly?.(true);
    o.scene.background = null;
    o.scene.fog = null;
    // Off the board's own ground the buildings would read grey; lift them to paper, as on the
    // reference (docs/ui-a2c/loading/map-with-white-buildings.jpg). (Dev: ?whitelift= to tune.)
    const lift = new THREE.AmbientLight(0xffffff, (import.meta.env.DEV && Number(new URLSearchParams(location.search).get('whitelift'))) || 1.4);
    o.scene.add(lift);
    o.renderer.setRenderTarget(rt);
    o.renderer.setClearColor(0x000000, 0);
    o.renderer.clear();
    o.renderer.render(o.scene, o.camera);
    const px = new Uint8Array(w * h * 4);
    o.renderer.readRenderTargetPixels(rt, 0, 0, w, h, px);
    o.renderer.setRenderTarget(null);
    o.scene.remove(lift);
    o.massesOnly?.(false);
    o.renderer.setClearColor(clear, alpha);
    o.scene.background = bg;
    o.scene.fog = fog;
    for (const m of off) m.visible = true;
    for (const [mesh, mat] of swapped) mesh.material = mat;
    swapped.clear();
    rt.dispose();
    // A render target holds linear colour, bottom row first: encode to sRGB and flip.
    const img = new ImageData(w, h);
    for (let y = 0; y < h; y++) {
      const src = (h - 1 - y) * w * 4, dst = y * w * 4;
      for (let x = 0; x < w * 4; x += 4) {
        img.data[dst + x] = LUT[px[src + x]];
        img.data[dst + x + 1] = LUT[px[src + x + 1]];
        img.data[dst + x + 2] = LUT[px[src + x + 2]];
        img.data[dst + x + 3] = px[src + x + 3];
      }
    }
    into.width = w;
    into.height = h;
    into.getContext('2d')!.putImageData(img, 0, 0);
  }

  // Things the override can't make white: instanced colours (trees), and see-through materials
  // (glass, light pools), which would turn into opaque white sheets.
  const hiddenNow: THREE.Object3D[] = [];
  // Each visible mesh wears the white material for the frame. (RenderPass.overrideMaterial
  // reached only the first pass, and the ambient-occlusion and foliage passes, which redraw the
  // scene themselves, then disagreed with it.)
  const swapped = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  const conceal = () => {
    for (const h of o.hide()) if (h && h.visible) { h.visible = false; hiddenNow.push(h); }
    o.scene.traverseVisible((m) => {
      const mesh = m as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      if (mesh.userData.placeholder) return; // white already (placeholder.ts)
      if ((mesh as THREE.InstancedMesh).instanceColor || mats.some((x) => x.transparent || x.alphaTest > 0)) hiddenNow.push(mesh);
      else {
        swapped.set(mesh, mesh.material);
        mesh.material = white;
      }
    });
    for (const m of hiddenNow) m.visible = false;
  };
  const restore = () => {
    for (const m of hiddenNow) m.visible = true;
    hiddenNow.length = 0;
    for (const [mesh, mat] of swapped) mesh.material = mat;
    swapped.clear();
  };

  return {
    revealed,
    get phase() { return phase; },
    /** Call just before the composer renders. */
    before() {
      if (phase !== 'white' || mode === 'map') return;
      o.inkBoost?.();
      skipped.length = 0;
      for (const p of o.skipPasses ?? []) if (p) { skipped.push([p, p.enabled]); p.enabled = false; }
      conceal();
    },
    /** Call just after the composer renders (the drawing buffer is still valid in this task). */
    after() {
      if (phase === 'white') {
        restore();
        for (const [p, was] of skipped) p.enabled = was;
        if (++whiteFrames < SETTLE) return;
        if (mode === 'map') {
          // White buildings stand on the tilted map; the colour frames so far warmed the shaders.
          drawBuildingsOnly(overlay);
          place();
          fade(1200);
          requestAnimationFrame(() => (overlay.style.opacity = '1'));
        } else {
          // Hold the white frame as a still over the paper, and warm up colour behind it.
          const c = o.renderer.domElement;
          overlay.width = c.width;
          overlay.height = c.height;
          overlay.getContext('2d')!.drawImage(c, 0, 0);
          place();
          // The canvas already shows the white model, so the still goes on at full strength.
          fade(0);
          overlay.style.opacity = '1';
        }
        // The overlay now owns the white pixels. Release the temporary shader programs.
        white.dispose();
        // A resize would stretch the still out of register with the scene: drop it instead.
        stillCamera.copy(o.camera.matrixWorld);
        ro = new ResizeObserver(() => this.check());
        ro.observe(o.container);
        phase = 'compiling';
        // The first colour frame behind the still warms the actual composer programs, including
        // each mesh's clipping planes. A separate canvas precompile retains unused variants.
        const hold = import.meta.env.DEV && new URLSearchParams(location.search).get('white') === 'hold';
        if (!hold) phase = 'colour';
      } else if (this.check()) {
        // dropped
      } else if (phase === 'colour') {
        // The first colour frame is drawn; now let colour show through.
        phase = 'done';
        const ms = mode === 'paper' ? WHITE_FADE_MS : 1400;
        if (mode === 'paper') {
          fade(ms);
          requestAnimationFrame(() => (overlay.style.opacity = '0'));
          setTimeout(() => overlay.remove(), o.reducedMotion ? 0 : ms + 100);
        } else {
          // Colour fades in over the still, which stays opaque underneath until colour covers it,
          // so the map never ghosts through both half-faded layers.
          if (overlay.isConnected) o.container.after(overlay);
          o.container.style.zIndex = '2'; // the canvas container is already positioned
          requestAnimationFrame(() => fadeCanvas(1, ms));
          setTimeout(() => {
            overlay.remove();
            o.container.style.zIndex = '';
          }, o.reducedMotion ? 0 : ms + 100);
        }
        finish();
        resolveRevealed();
      }
    },
    /** Keys, Follow or a resize moved things under the still: drop it rather than slide. */
    check(): boolean {
      if ((phase === 'compiling' || phase === 'colour') && overlay.isConnected &&
        (o.renderer.domElement.width !== overlay.width || o.renderer.domElement.height !== overlay.height || !o.camera.matrixWorld.equals(stillCamera))) {
        this.cancel();
        return true;
      }
      return false;
    },
    /** True while frames would draw colour that the still hides: skip the expensive draw. */
    get holding() { return phase === 'waiting' || (phase === 'compiling' && mode !== 'map'); },
    /** Before begin(): City couldn't open on the map's view (off the board), so arrive over paper. */
    setMode(m: 'paper' | 'map' | 'fade') {
      if (phase === 'waiting') mode = m;
    },
    /** The camera and atmosphere are set: draw the white model on the next frame. */
    begin() {
      if (phase !== 'waiting') return;
      const c = o.container.style;
      c.transition = 'none';
      c.opacity = '0';
      if (mode === 'paper') {
        phase = 'white';
        // The white model settles in over the paper (about 1.2 s, ease-in-out).
        requestAnimationFrame(() => fadeCanvas(1, 1200));
      } else if (mode === 'map') phase = 'white';
      else {
        // Built before: colour compiles behind the map, then cross-fades in.
        phase = 'colour';
      }
    },
    /** A user gesture during the fade would slide the scene under a still: drop the still. */
    cancel() {
      if (phase !== 'white' && phase !== 'waiting') {
        finish();
        overlay.remove();
        fadeCanvas(1, 0);
        if (phase !== 'done') {
          phase = 'done';
          resolveRevealed();
        }
      }
    },
    dispose() {
      finish();
      o.container.style.opacity = '';
      o.container.style.transition = '';
      overlay.remove();
      white.dispose();
      resolveRevealed();
    },
  };
}
