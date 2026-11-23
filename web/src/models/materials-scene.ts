import * as THREE from 'three';
import { applySurfaces, catalogue, SurfacePainter, type Surface, type SurfaceTier } from '../materials';
import { Builder } from '../vignette/geom';

export const MATERIAL_KINDS = {
  swatches: 'Library swatches',
} as const;
export type MaterialKind = keyof typeof MATERIAL_KINDS;

const ROOFS = new Set(['slate', 'terracotta-tile', 'asphalt-roof', 'aged-copper']);
const COLUMNS = 6, PITCH = 7, W = 5, H = 6, RISE = 2.5;

/** The catalogue in swatch order, row by row from the back, left to right. */
export function swatchList() {
  return catalogue();
}

export const MATERIAL_NOTES: Record<MaterialKind, string> = {
  swatches: `Every material in web/src/materials, drawn as City draws a painted landmark: high tier on the left block, low tier on the right. Wall materials paint the walls; roofing paints the gable roof. Rows from the back, left to right: ${swatchList().map(s => s.name).join(', ')}. Views: ¾ front and Side are close-ups of the high and low blocks; Rear uses the City's 22° lens from about 200 m, where each material fades towards its flat colour. `,
};

/** One small gabled block per material, for both tiers side by side. */
export function createMaterialScene() {
  const group = new THREE.Group();
  const list = swatchList(), rows = Math.ceil(list.length / COLUMNS);
  let triangles = 0;
  const disposers: (() => void)[] = [];
  for (const tier of ['high', 'low'] as SurfaceTier[]) {
    const body = new Builder(), painter = new SurfacePainter(body);
    const x0 = tier === 'high' ? -(COLUMNS * PITCH) - 2 : 4;
    list.forEach((s: Surface, i) => {
      const x = x0 + (i % COLUMNS) * PITCH, z = (Math.floor(i / COLUMNS) - rows / 2) * PITCH * 1.4;
      const roof = ROOFS.has(s.kind);
      const wallColour = roof ? '#c9c4b8' : s.colour, roofColour = roof ? s.colour : '#8d8a84';
      const p = (u: number, y: number, v: number) => [x + u, y, z + v];
      const walls = () => {
        body.quad(p(0, 0, W), p(W, 0, W), p(W, H, W), p(0, H, W), wallColour);
        body.quad(p(W, 0, W), p(W, 0, 0), p(W, H, 0), p(W, H, W), wallColour);
        body.quad(p(W, 0, 0), p(0, 0, 0), p(0, H, 0), p(W, H, 0), wallColour);
        body.quad(p(0, 0, 0), p(0, 0, W), p(0, H, W), p(0, H, 0), wallColour);
        body.tri(p(0, H, W), p(W, H, W), p(W / 2, H + RISE, W), wallColour);
        body.tri(p(W, H, 0), p(0, H, 0), p(W / 2, H + RISE, 0), wallColour);
      };
      const top = () => {
        body.quad(p(0, H, W), p(W / 2, H + RISE, W), p(W / 2, H + RISE, 0), p(0, H, 0), roofColour);
        body.quad(p(W, H, 0), p(W / 2, H + RISE, 0), p(W / 2, H + RISE, W), p(W, H, W), roofColour);
      };
      if (roof) { walls(); painter.paint(s, top); } else { painter.paint(s, walls); top(); }
    });
    const geometry = body.geometry();
    geometry.setAttribute('aSurface', painter.attribute());
    const material = applySurfaces(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), { tier });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `material swatches (${tier})`;
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    triangles += geometry.getAttribute('position').count / 3;
    disposers.push(() => { geometry.dispose(); material.dispose(); });
  }
  return {
    group, triangles, draws: 2, swatches: list.length,
    dispose: () => { group.removeFromParent(); disposers.forEach(d => d()); },
  };
}
