import * as THREE from 'three';
import { Builder, rng } from '../vignette/geom';

const swatches = {
  skin: ['#6a412e', '#88583e', '#a76f50', '#c78d69', '#dfa988', '#f2c6a4'],
  top: ['#ebb94c', '#b74f45', '#327a74', '#538ab5', '#9f6d99', '#e7dcc1', '#576c55'],
  trousers: ['#364052', '#495549', '#735451', '#506178', '#6f6250'],
  pack: ['#41525b', '#b46143', '#5b7051', '#6a557c', '#d8a850'],
  frame: ['#de753e', '#378992', '#c65360', '#8da14b', '#5376b4', '#d6c6a7'],
} as const;

const random = rng(0xaca723);
function pick(colors: readonly string[]) { return colors[Math.floor(random() * colors.length)]; }

// A row describes one person's look. Each attribute gets its own draw, including
// whether the bag is worn. City and both inspectors address the same rows.
export const figureLooks = Array.from({ length: 64 }, () => {
  const skin = pick(swatches.skin), top = pick(swatches.top), trousers = pick(swatches.trousers);
  const bag = pick(swatches.pack), frame = pick(swatches.frame);
  return { skin, top, trousers, pack: random() < .55 ? bag : null, frame };
});
const columns = ['fixed', 'skin', 'top', 'trousers', 'pack', 'frame'] as const;
type Column = typeof columns[number];

// All vertices of a triangle sample one swatch. Fixed details such as hair,
// tires and shoes retain their baked vertex colour in the white first column.
export class FigureBuilder extends Builder {
  private readonly uv: number[] = [];

  override addGeometry(g: THREE.BufferGeometry, color: THREE.ColorRepresentation) {
    const column = columns.indexOf(color as Column);
    const first = this.pos.length;
    super.addGeometry(g, column < 0 ? color : '#ffffff');
    const u = (Math.max(0, column) + .5) / columns.length;
    for (let i = first; i < this.pos.length; i += 3) this.uv.push(u, .5 / figureLooks.length);
  }

  override geometry() {
    const g = super.geometry();
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    return g;
  }
}

export function figureMaterial(instanced: boolean) {
  const pixels = new Uint8Array(columns.length * figureLooks.length * 4);
  figureLooks.forEach((look, row) => {
    columns.forEach((key, col) => {
      const swatch = key === 'fixed' ? '#ffffff' : look[key];
      const rgb = parseInt((swatch ?? '#ffffff').slice(1), 16);
      pixels.set([rgb >> 16, (rgb >> 8) & 255, rgb & 255, swatch ? 255 : 0], 4 * (row * columns.length + col));
    });
  });
  const map = new THREE.DataTexture(pixels, columns.length, figureLooks.length);
  map.colorSpace = THREE.SRGBColorSpace;
  map.needsUpdate = true;
  const material = new THREE.MeshLambertMaterial({ map, vertexColors: true, alphaTest: .5 });
  if (instanced) {
    // The Lab changes the map offset for one model. City selects the same row
    // per instance so different outfits still share a single draw per batch.
    material.onBeforeCompile = shader => {
      shader.vertexShader = 'attribute float lookOffset;\n' + shader.vertexShader.replace(
        '#include <uv_vertex>', '#include <uv_vertex>\nvMapUv.y += lookOffset;');
    };
  }
  material.addEventListener('dispose', () => map.dispose());
  return material;
}
