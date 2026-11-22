import * as THREE from 'three';
import { Builder } from '../vignette/geom';
import type { GeorgiaStateScene } from './georgia-state-geometry';
import { ENTRY_DEPTH, type StationTrack } from './station-track';

/** Static batches for the structure, softly lit finishes and ceiling fixtures.
 * Heights above the bed, finish colours and fixture spacing are illustrative. */
export function createGeorgiaState(track: StationTrack, site: GeorgiaStateScene,
  face?: { soffitY: number; clearWidthM: number }) {
  const body = new Builder();
  const interior = new Builder();
  const lamps = new Builder();
  const frame = new THREE.Matrix4();
  const at = (d: number) => {
    const p = track.point(d);
    return frame.makeRotationY(Math.atan2(p.dx, p.dz)).setPosition(p.x, p.bedY, p.z);
  };
  const floor = 1.6;
  const soffit = 5.8;
  const lip = 3.83; // 2.1 m track offset + half a 3.2 m car and its boarding gap
  function platform(a: number, b: number, side: number, width: number, roof: boolean) {
    const mid = side * (lip + width / 2);
    const bays = Math.ceil((b - a) / 7.5);
    const bay = (b - a) / bays;
    for (let i = 0; i < bays; i++) {
      const d = a + (i + .5) * bay;
      const pose = at(d);
      body.box(width, 1.05, bay + .025, mid, floor - .525, 0, '#a89d90', pose);
      interior.box(width - .20, .09, bay + .02, mid + side * .10, floor + .045, 0, '#955f4d', pose);
      interior.box(.42, .105, bay + .025, side * (lip + .21), floor + .055, 0, '#dcd4b7', pose);
      if (roof) {
        body.box(width + .65, .36, bay + .035, mid, soffit + .18, 0, '#d2c8b7', pose);
        body.box(.16, .62, bay + .03, side * (lip - .30), soffit + .24, 0, '#867f74', pose);
        interior.box(width + .57, .055, bay + .025, mid, soffit - .0275, 0, '#e1d3bd', pose);
        body.box(.55, soffit - floor, .65, side * (lip + width - .75), (floor + soffit) / 2, 0, '#585854', pose);
      }
      if (roof) lamps.box(.62, .07, 1.1, mid, soffit - .045, 0, '#ffebbb', pose);
    }
  }
  for (const p of site.platforms) {
    const side = p.side === 'north' ? 1 : -1; // local box x points left of eastbound
    platform(p.u0 - site.westTip, track.canopyLength, side, Math.abs(p.outer) - lip, true);
  }
  // The first visible bays of the hall give depth to the view from the viaduct.
  // Keep the full width of both tracks clear through the east face.
  if (face) {
    const eastSoffit = face.soffitY;
    const halfWidth = face.clearWidthM / 2;
    const entrance = at(track.length);
    const head = eastSoffit - track.point(track.length).bedY;
    // R1 shows a broad wash of light across the concrete lintel above the two tracks.
    interior.box(face.clearWidthM + .65, 1.5, .30, 0, head + .8, .18, '#ccbc9c', entrance);
    body.box(face.clearWidthM + .95, .18, .55, 0, head + 1.62, .20, '#9b978b', entrance);
    for (const side of [-1, 1]) {
      lamps.box(.75, .18, .28, side * halfWidth * .65, head + 1.46, .46, '#ffebc1', entrance);
      interior.box(.40, head - floor, .40, side * (halfWidth + .15),
        (floor + head) / 2, .1, '#b4a990', entrance);
    }
    function entranceBays(start: number, end: number, back: number) {
      for (const p of site.platforms) {
        const side = p.side === 'north' ? 1 : -1;
        platform(start, end, side, Math.abs(p.outer) - lip, false);
      }
      for (let d = start + 2; d < end; d += 4) {
        const pose = at(d);
        const ceiling = eastSoffit - track.point(d).bedY;
        interior.box(halfWidth * 2 - .12, .09, 4.03, 0, ceiling - .05, 0, '#d6bea0', pose);
        for (const side of [-1, 1]) {
          interior.box(.19, ceiling - floor, 4.02, side * (halfWidth - .15),
            (floor + ceiling) / 2, 0, '#ad9176', pose);
          lamps.box(.95, .10, 1.05, side * 4.9, ceiling - .14, 0, '#ffebc1', pose);
        }
      }
      const h = eastSoffit - track.point(back).bedY;
      body.box(halfWidth * 2, h + .5, .20, 0, h / 2, 0, '#24232a', at(back));
    }
    entranceBays(track.canopyLength, track.canopyLength + ENTRY_DEPTH, track.canopyLength + ENTRY_DEPTH);
    entranceBays(track.length - ENTRY_DEPTH, track.length, track.length - ENTRY_DEPTH);
  }
  const group = new THREE.Group();
  group.name = 'Georgia State platforms';
  const structure = new THREE.Mesh(body.geometry(), new THREE.MeshLambertMaterial({ vertexColors: true }));
  structure.castShadow = true;
  structure.receiveShadow = true;
  const fixtureMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });
  const finish = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: '#e4bc88', emissiveIntensity: 0 });
  // Preserve the difference between warm brick underfoot and pale concrete overhead at dusk.
  finish.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n totalEmissiveRadiance *= vColor.rgb;');
  };
  const litSurfaces = new THREE.Mesh(interior.geometry(), finish);
  litSurfaces.receiveShadow = true;
  group.add(structure, litSurfaces, new THREE.Mesh(lamps.geometry(), fixtureMaterial));
  return { group, setNight(dark: number) {
    fixtureMaterial.color.setScalar(.9 + 1.7 * dark);
    finish.emissiveIntensity = .06 + 1.25 * dark;
  } };
}
