import * as THREE from 'three';

/**
 * Compile, a few at a time in idle frames, the shader programs of everything City has built but not
 * yet drawn, so a clock or weather change never stalls a frame on a first-use compile.
 *
 * three.js compiles a material the first time an object using it draws. Rain, snow, dusk and night
 * lights, night-lit rolling stock and far areas sit in the scene hidden or culled until their moment,
 * so each used to compile on the frame it appeared (100+ ms on a desktop, several times that on a
 * phone). renderer.compile() can't stand in for that: it runs with no render target (City draws into
 * an offscreen target, which changes tone mapping and output colour space in the program key) and with
 * stale clipping state, so it compiles variants the render never asks for. A real render does it
 * right. Each step draws a few never-drawn objects, alone, through a camera that sees only a
 * scratch layer, into a 4x4 target, with the scene's real lights, fog and clipping. Nothing reaches
 * the screen.
 *
 * Shadow-depth variants still compile on their first shadow pass.
 */
const LAYER = 31;

type Drawable = THREE.Mesh | THREE.Points | THREE.Line;
type Props = { get(m: THREE.Material): { currentProgram?: unknown } };

export interface Prewarmer {
  /** Objects still waiting for their first draw, found by the last scan. */
  readonly pending: number;
  /** Scan the scene for never-drawn objects (after an area mounts or freight arrives). */
  scan(): void;
  /** Draw up to `maxObjects` of them, stopping early past `budgetMs`. Returns how many it drew. */
  step(budgetMs: number, maxObjects?: number): number;
  dispose(): void;
}

export function createPrewarmer(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, textureType: THREE.TextureDataType): Prewarmer {
  const props = (renderer as unknown as { properties: Props }).properties;
  const target = new THREE.WebGLRenderTarget(4, 4, { type: textureType });
  const cam = camera.clone();
  let queue: Drawable[] = [];
  const compiled = (m: THREE.Material) => !!props.get(m).currentProgram;
  const materials = (o: Drawable) => (Array.isArray(o.material) ? o.material : [o.material]).filter(Boolean) as THREE.Material[];

  /** Draw one object alone on the scratch layer into the 4x4 target, then put everything back. */
  function draw(o: Drawable) {
    const restore: (() => void)[] = [];
    // Lights must be on the scratch layer too, or the programs compile for an unlit scene.
    scene.traverse(l => { if ((l as THREE.Light).isLight && !l.layers.isEnabled(LAYER)) { l.layers.enable(LAYER); restore.push(() => l.layers.disable(LAYER)); } });
    for (let p: THREE.Object3D | null = o; p; p = p.parent) {
      if (!p.visible) { const q = p; q.visible = true; restore.push(() => { q.visible = false; }); }
    }
    if (o.frustumCulled) { o.frustumCulled = false; restore.push(() => { o.frustumCulled = true; }); }
    if (!o.layers.isEnabled(LAYER)) { o.layers.enable(LAYER); restore.push(() => o.layers.disable(LAYER)); }
    cam.copy(camera as THREE.PerspectiveCamera);
    cam.layers.set(LAYER);
    const prevTarget = renderer.getRenderTarget();
    const prevShadow = renderer.shadowMap.needsUpdate;
    const prevAuto = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = false;
    try {
      renderer.setRenderTarget(target);
      renderer.render(scene, cam);
    } finally {
      renderer.setRenderTarget(prevTarget);
      renderer.shadowMap.autoUpdate = prevAuto;
      renderer.shadowMap.needsUpdate = prevShadow;
      for (let i = restore.length - 1; i >= 0; i--) restore[i]();
    }
  }

  return {
    get pending() { return queue.length; },
    scan() {
      const seen = new Set<THREE.Material>();
      queue = [];
      scene.traverse(o => {
        const d = o as Drawable;
        if (!((d as THREE.Mesh).isMesh || (d as THREE.Points).isPoints || (d as THREE.Line).isLine)) return;
        // One object per uncompiled material is enough to compile it.
        const fresh = materials(d).filter(m => !compiled(m) && !seen.has(m));
        if (!fresh.length) return;
        for (const m of fresh) seen.add(m);
        queue.push(d);
      });
    },
    step(budgetMs, maxObjects = 4) {
      const t0 = performance.now();
      let drawn = 0;
      // One object per render, so a step stops as soon as its budget is spent. A single compile can
      // still overrun it; that's one program, not the whole backlog.
      while (queue.length && drawn < maxObjects && (drawn === 0 || performance.now() - t0 < budgetMs)) {
        const o = queue.shift()!;
        if (!o.parent || materials(o).every(compiled)) continue;
        draw(o);
        drawn++;
      }
      return drawn;
    },
    dispose() { target.dispose(); queue = []; },
  };
}
