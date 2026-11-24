import * as THREE from 'three';
import { SURFACE_GLSL } from '../materials/glsl';

/** Paint instanced trunks in tree-local metres, independent of their orientation and size class. */
export function treeBarkMaterial(key: string, paint: string) {
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBarkMetres;\nvarying float vBarkHeight;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vec3 barkScale = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
vBarkMetres = position * barkScale;
vBarkHeight = barkScale.y;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vBarkMetres;\nvarying float vBarkHeight;\n${SURFACE_GLSL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float barkPx = max(length(dFdx(vBarkMetres)), length(dFdy(vBarkMetres)));
${paint}`);
  };
  material.customProgramCacheKey = () => key;
  return material;
}
