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
  /** Draw up to `maxObjects` of them in one scratch render. Returns how many it drew. */
  step(maxObjects?: number): number;
  /**
   * Upload a finished group's buffers (and compile its programs) a batch per frame before it shows:
   * every drawable in it is drawn once on the scratch layer, whether or not its material has
   * compiled. The group must already be in the scene (hidden is fine), so the draw uses the
   * scene's lights and fog. Resolves once all are drawn; upload work goes ahead of the compile
   * backlog. A sliced area build calls this before it mounts (see the streaming manager).
   */
  upload(group: THREE.Object3D): Promise<void>;
  dispose(): void;
}

export function createPrewarmer(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, textureType: THREE.TextureDataType): Prewarmer {
  const props = (renderer as unknown as { properties: Props }).properties;
  const target = new THREE.WebGLRenderTarget(4, 4, { type: textureType });
  const cam = camera.clone();
  let queue: Drawable[] = [];
  type Upload = { left: Drawable[]; done: () => void };
  const uploads: Upload[] = [];
  const compiled = (m: THREE.Material) => !!props.get(m).currentProgram;
  // One attempt per object. A draw can leave a material uncompiled (three.js skips material.visible
  // false, and some objects never render on this layer); without this, every 10 s rescan would queue
  // such an object again, and each attempt costs a whole-scene traversal.
  const tried = new WeakSet<THREE.Object3D>();
  // Only materials a draw can compile: a hidden material never renders, so it can't stall a frame
  // until it becomes visible (and then it is one object, on one frame).
  // A material that two draws didn't compile won't on a third (thousands of objects can share it).
  const attempts = new WeakMap<THREE.Material, number>();
  const wanted = (m: THREE.Material) => m.visible && !compiled(m) && (attempts.get(m) ?? 0) < 2;
  const materials = (o: Drawable) => (Array.isArray(o.material) ? o.material : [o.material]).filter(Boolean) as THREE.Material[];

  /** Draw a batch of objects alone on the scratch layer into the 4x4 target, then put everything
   * back. One render per batch: each render walks the whole scene, and most first draws reuse a
   * program another material already compiled, so a batch costs little more than one object. */
  function draw(batch: Drawable[]) {
    const restore: (() => void)[] = [];
    // Lights must be on the scratch layer too, or the programs compile for an unlit scene.
    scene.traverse(l => { if ((l as THREE.Light).isLight && !l.layers.isEnabled(LAYER)) { l.layers.enable(LAYER); restore.push(() => l.layers.disable(LAYER)); } });
    for (const o of batch) {
      for (let p: THREE.Object3D | null = o; p; p = p.parent) {
        if (!p.visible) { const q = p; q.visible = true; restore.push(() => { q.visible = false; }); }
      }
      if (o.frustumCulled) { o.frustumCulled = false; restore.push(() => { o.frustumCulled = true; }); }
      if (!o.layers.isEnabled(LAYER)) { o.layers.enable(LAYER); restore.push(() => o.layers.disable(LAYER)); }
    }
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
    get pending() { return queue.length + uploads.length; },
    scan() {
      const seen = new Set<THREE.Material>();
      queue = [];
      scene.traverse(o => {
        const d = o as Drawable;
        if (!((d as THREE.Mesh).isMesh || (d as THREE.Points).isPoints || (d as THREE.Line).isLine)) return;
        // One object per uncompiled material is enough to compile it.
        if (tried.has(d)) return;
        const fresh = materials(d).filter(m => wanted(m) && !seen.has(m));
        if (!fresh.length) return;
        for (const m of fresh) seen.add(m);
        queue.push(d);
      });
    },
    step(maxObjects = 4) {
      const batch: Drawable[] = [];
      // Uploads first: a finished area waits on them to mount.
      while (uploads.length && batch.length < maxObjects) {
        const u = uploads[0];
        const o = u.left.shift();
        if (o) { if (o.parent) { tried.add(o); batch.push(o); } }
        if (!u.left.length) { uploads.shift(); u.done(); }
      }
      while (queue.length && batch.length < maxObjects) {
        const o = queue.shift()!;
        if (!o.parent || !materials(o).some(wanted)) continue;
        tried.add(o);
        for (const m of materials(o)) if (wanted(m)) attempts.set(m, (attempts.get(m) ?? 0) + 1);
        batch.push(o);
      }
      if (batch.length) draw(batch);
      return batch.length;
    },
    upload(group) {
      let inScene = false;
      for (let p: THREE.Object3D | null = group; p; p = p.parent) if (p === scene) inScene = true;
      if (!inScene) return Promise.reject(new Error('prewarmer.upload: add the group to the scene first (hidden is fine)'));
      const left: Drawable[] = [];
      group.traverse(o => {
        const d = o as Drawable;
        if ((d as THREE.Mesh).isMesh || (d as THREE.Points).isPoints || (d as THREE.Line).isLine) left.push(d);
      });
      if (!left.length) return Promise.resolve();
      return new Promise<void>(done => uploads.push({ left, done }));
    },
    dispose() {
      target.dispose();
      queue = [];
      // Nothing will draw them now; let waiters go on.
      for (const u of uploads.splice(0)) u.done();
    },
  };
}
