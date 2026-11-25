import type { CanvasTexture } from 'three';

/** Continue each row's filter footprint across the shared edge using the
 * neighbour's real painted pixels. Call once when both ground maps exist.
 * The original canvas stays available to restore the Station-only view. */
export function joinGroundMaps(north: CanvasTexture, south: CanvasTexture) {
  const a = north.image as HTMLCanvasElement, b = south.image as HTMLCanvasElement;
  if (!north.flipY || !south.flipY || a.width !== b.width || a.height !== b.height) {
    throw new Error('Expected aligned north and south ground maps');
  }
  const h = a.height, w = a.width, pad = Math.min(h, 16);
  function padded(own: HTMLCanvasElement, other: HTMLCanvasElement, isNorth: boolean) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h+pad;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(own, 0, isNorth ? 0 : pad);
    ctx.drawImage(other, 0, isNorth ? 0 : h-pad, w, pad, 0, isNorth ? h : 0, w, pad);
    return canvas;
  }
  const an = padded(a,b,true), bs = padded(b,a,false);
  function set(map: CanvasTexture, canvas: HTMLCanvasElement, yScale: number, yOffset: number) {
    // Station has already uploaded its original storage while the new row
    // may still be unrendered. Release that allocation before changing size.
    map.dispose();
    map.image = canvas;
    map.repeat.y = yScale;
    map.offset.y = yOffset;
    map.updateMatrix();
    map.needsUpdate = true;
  }
  const original = [north.repeat.y, north.offset.y, south.repeat.y, south.offset.y];
  set(north,an,original[0]*h/(h+pad),(original[1]*h+pad)/(h+pad));
  set(south,bs,original[2]*h/(h+pad),original[3]*h/(h+pad));
  return () => {
    set(north,a,original[0],original[1]);
    set(south,b,original[2],original[3]);
  };
}
