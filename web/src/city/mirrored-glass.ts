import * as THREE from 'three';

interface GlassOptions {
  /** Borrowed textures. A group of nearby facades can share one skyline panorama. */
  skyline: THREE.Texture;
  /** World Y in metres where the skyline panorama was sampled. */
  probeY: number;
  daylight: THREE.IUniform<number>;
  tint?: THREE.ColorRepresentation;
  /** An optional pane pattern. Its red channel controls how strongly each texel reflects. */
  map?: THREE.Texture;
  emissiveMap?: THREE.Texture;
}

/** Tint filters the glass and reflection. Interior lighting retains its own colour. */
export function mirroredGlass({ skyline, probeY, daylight, tint = 0xffffff, map, emissiveMap }: GlassOptions) {
  const glass = new THREE.MeshPhongMaterial({
    color: tint, map: map ?? null, emissiveMap: emissiveMap ?? null,
    emissive: emissiveMap ? 0xffffff : 0x000000, emissiveIntensity: 0,
    specular: 0xe1edf6, shininess: 85,
  });
  glass.onBeforeCompile = shader => {
    shader.uniforms.skyline = { value: skyline };
    shader.uniforms.probeY = { value: probeY };
    shader.uniforms.reflectedDaylight = daylight;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D skyline;\nuniform float probeY;\nuniform float reflectedDaylight;')
      .replace('#include <envmap_fragment>', `
        vec3 eye = normalize(vViewPosition);
        vec3 ray = inverseTransformDirection(reflect(-eye, normal), viewMatrix);
        // Convert the fragment-to-camera vector back to its world Y component.
        float paneY = cameraPosition.y - dot(viewMatrix[1].xyz, vViewPosition);
        ray.y += (paneY - probeY) / 120.0 * length(ray.xz);
        vec3 reflection = textureLod(skyline, equirectUv(normalize(ray)), 1.25).rgb;
        float grazing = pow(1.0 - clamp(dot(eye, normal), 0.0, 1.0), 3.0);
        float glazing = 1.0;
        #ifdef USE_MAP
          glazing = smoothstep(0.06, 0.34, sampledDiffuseColor.r);
        #endif
        reflection *= diffuse * mix(vec3(0.018, 0.027, 0.060), vec3(1.0), reflectedDaylight);
        float weight = glazing * (0.69 + 0.27 * grazing);
        outgoingLight = mix(reflectedLight.directDiffuse + reflectedLight.indirectDiffuse,
          reflection, weight) + reflectedLight.directSpecular + totalEmissiveRadiance;
      `);
  };
  return glass;
}
