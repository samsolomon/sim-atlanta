import { CanvasTexture, Group, Mesh, MeshLambertMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import { bethelSign, bigBethelId, heritageId } from './auburn-sanctuaries';

// A mask keeps the bright tubes separate from the dark sign face at night.
function signFace(heritage: boolean) {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 192;
  const ctx = canvas.getContext('2d')!;
  if (heritage) {
    ctx.fillStyle = '#1b3555';
    ctx.fillRect(5, 56, 246, 53);
    ctx.fillRect(48, 96, 160, 78);
  }
  const lettering = document.createElement('canvas');
  lettering.width = 256; lettering.height = 192;
  const ink = lettering.getContext('2d')!;
  ink.fillStyle = heritage ? '#dfedfc' : '#6ca7ff';
  ink.textAlign = 'center';
  if (heritage) {
    ink.fillRect(123, 4, 10, 52); ink.fillRect(104, 19, 48, 8);
    ink.font = 'bold 42px sans-serif'; ink.fillText('EBENEZER', 128, 99, 228);
    ink.font = 'bold 30px sans-serif'; ink.fillText('BAPTIST', 128, 132, 148);
    ink.fillText('CHURCH', 128, 165, 148);
  } else {
    ink.font = 'bold 67px sans-serif';
    ink.fillText('JESUS', 128, 87, 245); ink.fillText('SAVES', 128, 152, 245);
  }
  ctx.drawImage(lettering, 0, 0);
  const map = new CanvasTexture(canvas), glow = new CanvasTexture(lettering);
  map.colorSpace = glow.colorSpace = SRGBColorSpace;
  return new MeshLambertMaterial({ map, emissiveMap: glow, emissive: '#ffffff', emissiveIntensity: 0, alphaTest: .28 });
}

export function auburnSigns(ids: Set<string>, zero: number) {
  const group = new Group();
  const signs: Mesh<PlaneGeometry, MeshLambertMaterial>[] = [];
  function face(x: number, y: number, z: number, yaw: number, w: number, h: number, mat: MeshLambertMaterial) {
    const mesh = new Mesh(new PlaneGeometry(w, h), mat);
    mesh.position.set(x, y - zero, z); mesh.rotation.y = yaw;
    signs.push(mesh); group.add(mesh);
  }
  if (ids.has(heritageId)) {
    const mat = signFace(true);
    face(1608.43, 308.2, -168.77, Math.PI / 2, 2.55, 2.17, mat);
    face(1608.37, 308.2, -168.77, -Math.PI / 2, 2.55, 2.17, mat);
  }
  if (ids.has(bigBethelId)) {
    const mat = signFace(false);
    const { x, y, z, width, height, offset } = bethelSign;
    for (const side of [-1, 1]) {
      face(x + side * (offset + .035), y, z, side * Math.PI / 2, width, height, mat);
    }
  }
  const materials = new Set(signs.map(s => s.material));
  return {
    group,
    setNight(n: number) { for (const m of materials) m.emissiveIntensity = n * 1.45; },
    dispose() {
      for (const s of signs) s.geometry.dispose();
      for (const m of materials) { m.map?.dispose(); m.emissiveMap?.dispose(); m.dispose(); }
      group.removeFromParent();
    },
  };
}
