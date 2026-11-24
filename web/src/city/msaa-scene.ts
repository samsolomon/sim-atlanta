import * as THREE from 'three';
import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';

/**
 * The scene pass with multisampling, for High. Window floor lines and mullions are a few tenths of
 * a metre tall, under one device pixel at city range, so the unsampled scene target caught some
 * rows and missed others: moiré bands that crawl across façades whenever the camera moves.
 *
 * Only the scene draw is multisampled. The composer's ping-pong targets stay single-sampled, so
 * the post passes (full-screen quads) don't pay for four samples each. The resolved colour is
 * blitted into the composer's read buffer (a framebuffer copy, no shader program), and the
 * resolved depth is the depth post reads (ink, ambient occlusion, the foliage mask).
 */
export class MsaaScenePass extends Pass {
  readonly target: THREE.WebGLRenderTarget;
  constructor(private readonly scene: THREE.Scene, private readonly camera: THREE.Camera, samples = 2) {
    super();
    this.needsSwap = false;
    this.target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples });
    this.target.depthTexture = new THREE.DepthTexture(1, 1);
  }

  get depthTexture(): THREE.DepthTexture { return this.target.depthTexture!; }

  setSize(width: number, height: number) { this.target.setSize(width, height); }

  render(renderer: THREE.WebGLRenderer, _write: THREE.WebGLRenderTarget, read: THREE.WebGLRenderTarget) {
    const autoClear = renderer.autoClear;
    renderer.autoClear = true;
    renderer.setRenderTarget(this.target);
    renderer.render(this.scene, this.camera);
    // render() resolves the multisampled target into its colour and depth textures as it ends.
    renderer.copyTextureToTexture(this.target.texture, read.texture);
    renderer.autoClear = autoClear;
  }

  dispose() { this.target.dispose(); }
}
