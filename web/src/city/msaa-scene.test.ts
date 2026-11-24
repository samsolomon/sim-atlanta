import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { MsaaScenePass } from './msaa-scene';

describe('MsaaScenePass', () => {
  it('allocates the read target before copying the resolved scene into it', () => {
    const calls: string[] = [];
    const renderer = {
      autoClear: false,
      setRenderTarget: (t: unknown) => calls.push(t ? 'target' : 'screen'),
      render: () => calls.push('render'),
      initRenderTarget: () => calls.push('init'),
      copyTextureToTexture: () => calls.push('copy'),
    } as unknown as THREE.WebGLRenderer;
    const pass = new MsaaScenePass(new THREE.Scene(), new THREE.PerspectiveCamera());
    const read = new THREE.WebGLRenderTarget(4, 4);
    pass.render(renderer, read, read);
    expect(calls).toEqual(['target', 'render', 'init', 'copy']);
    expect(renderer.autoClear).toBe(false);
    expect(pass.target.samples).toBe(2);
    expect(pass.needsSwap).toBe(false);
  });

  it('resizes its multisampled target with the composer', () => {
    const pass = new MsaaScenePass(new THREE.Scene(), new THREE.PerspectiveCamera(), 4);
    pass.setSize(320, 200);
    expect([pass.target.width, pass.target.height, pass.target.samples]).toEqual([320, 200, 4]);
    expect(pass.depthTexture).toBe(pass.target.depthTexture);
  });
});
