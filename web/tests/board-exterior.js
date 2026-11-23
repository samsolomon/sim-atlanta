// Run in the localhost Vite City view at the default morning camera:
// await (await import('/tests/board-exterior.js')).assertBoardExterior()
import { OrthographicCamera, Scene, WebGLRenderTarget } from 'three';

export async function assertBoardExterior() {
  if (document.querySelector('#city-info button:last-child')?.textContent !== 'Frame the full board') {
    throw Error('Open the full rectangle and wait for all twelve areas.');
  }

  // Capture the same scene, shadow map and materials that painted the City frame.
  const original = Scene.prototype.onBeforeRender;
  const own = Object.hasOwn(Scene.prototype, 'onBeforeRender');
  let timer;
  try {
    const [renderer, scene] = await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(Error('City did not render a frame')), 5000);
      Scene.prototype.onBeforeRender = function (renderer, ...args) {
        original.call(this, renderer, ...args);
        if (this.getObjectByName('Studio table')) resolve([renderer, this]);
      };
    });
    return compareExterior(renderer, scene);
  } finally {
    clearTimeout(timer);
    if (own) Scene.prototype.onBeforeRender = original;
    else delete Scene.prototype.onBeforeRender;
  }
}

function compareExterior(renderer, scene) {
  const table = scene.getObjectByName('Studio table');
  const margin = 200, step = 2, lip = 8;
  const width = (2800 + 2 * margin) / step, height = (6800 + 2 * margin) / step;
  // In plan view a tall building inside the board cannot occlude the exterior.
  const camera = new OrthographicCamera(-width, width, height, -height, 1, 8000);
  camera.up.set(0, 0, -1);
  camera.position.set(400, 4000, -2300);
  camera.lookAt(400, 0, -2300);

  const target = new WebGLRenderTarget(width, height);
  const previous = renderer.getRenderTarget();
  const objects = scene.children.filter(o => o !== table && !o.isLight && o.visible);
  const shadows = table.receiveShadow;
  function pixels() {
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    const rgba = new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(target, 0, 0, width, height, rgba);
    return rgba;
  }
  try {
    const city = pixels();
    for (const o of objects) o.visible = false;
    table.receiveShadow = false;
    const emptyTable = pixels();
    let outside = 0, inside = 0;
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const i = 4 * (row * width + col);
        if (city[i] === emptyTable[i] && city[i+1] === emptyTable[i+1] && city[i+2] === emptyTable[i+2]) continue;
        const x = -1000 - margin + (col + .5) * step, z = 1100 + margin - (row + .5) * step;
        if (x < -1000-lip || x > 1800+lip || z < -5700-lip || z > 1100+lip) outside++;
        else inside++;
      }
    }
    if (inside < 4500000) throw Error('Missing board in the control render');
    if (outside) throw Error(outside + ' scenery or shadow pixels outside the plinth');
    return { outside, inside };
  } finally {
    for (const o of objects) o.visible = true;
    table.receiveShadow = shadows;
    renderer.setRenderTarget(previous);
    target.dispose();
  }
}
