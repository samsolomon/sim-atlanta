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
const WHITE_ALBEDO = 0.9;

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
  /** Low tier: skip the up-front compileAsync (it raises the memory peak); colour compiles in its
   * first frame, under the still, as before. */
  lowMemory?: boolean;
}) {
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
  const fade = (ms: number) => (overlay.style.transition = o.reducedMotion ? 'none' : `opacity ${ms}ms ease`);

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
      if (phase !== 'white') return;
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
        // Hold the white frame as a still, fade it in over the paper, and warm up colour behind it.
        const c = o.renderer.domElement;
        overlay.width = c.width;
        overlay.height = c.height;
        overlay.getContext('2d')!.drawImage(c, 0, 0);
        o.container.append(overlay);
        // A resize would stretch the still out of register with the scene: drop it instead.
        stillCamera.copy(o.camera.matrixWorld);
        ro = new ResizeObserver(() => this.check());
        ro.observe(o.container);
        // The canvas already shows the white model, so the still goes on at full strength.
        fade(0);
        overlay.style.opacity = '1';
        phase = 'compiling';
        // compileAsync can stall (it waits on every program reporting ready); never hold the city
        // hostage to it. Whatever isn't warm compiles in the first colour frame, under the still.
        const ceiling = new Promise((r) => setTimeout(r, 2500));
        // Dev: ?white=hold keeps the white model on screen, to judge it against the colour render.
        const hold = import.meta.env.DEV && new URLSearchParams(location.search).get('white') === 'hold';
        if (!hold && o.lowMemory) phase = 'colour';
        else if (!hold) void Promise.race([o.renderer.compileAsync(o.scene, o.camera).catch(() => undefined), ceiling]).then(() => {
          if (phase === 'compiling') phase = 'colour';
        });
      } else if (this.check()) {
        // dropped
      } else if (phase === 'colour') {
        // The first colour frame is drawn under the still; now let colour show through.
        phase = 'done';
        fade(1000);
        requestAnimationFrame(() => (overlay.style.opacity = '0'));
        setTimeout(() => overlay.remove(), o.reducedMotion ? 0 : 1100);
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
    get holding() { return phase === 'waiting' || phase === 'compiling'; },
    /** The camera and atmosphere are set: draw the white model on the next frame. */
    begin() {
      if (phase !== 'waiting') return;
      phase = 'white';
      // The white model fades in over the paper (about 300 ms).
      const c = o.container.style;
      c.transition = 'none';
      c.opacity = '0';
      requestAnimationFrame(() => {
        c.transition = o.reducedMotion ? 'none' : 'opacity 300ms ease';
        c.opacity = '1';
      });
    },
    /** A user gesture during the fade would slide the scene under a still: drop the still. */
    cancel() {
      if (phase !== 'white' && phase !== 'waiting') {
        finish();
        overlay.remove();
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
