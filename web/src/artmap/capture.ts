// Offline only. glTF cannot carry the vignette's onBeforeCompile shaders.
import * as T from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Builder, Line } from "../vignette/geom";
import type { World } from "../vignette/world";
import type { Traffic } from "../vignette/traffic";
import type { Train } from "../vignette/train";
import { vehicleGeometry, vehicleMaterial } from "../vignette/vehicles";
import spec from "./camera.json";

function camera(width: number, height: number, target: T.Vector3) {
  const w = (width * spec.metresPerPixel) / 2,
    h = (height * spec.metresPerPixel) / 2;
  const c = new T.OrthographicCamera(-w, w, h, -h, 1, 4000);
  c.position
    .setFromSphericalCoords(
      1800,
      T.MathUtils.degToRad(90 - spec.elevation),
      T.MathUtils.degToRad(spec.azimuth),
    )
    .add(target);
  c.lookAt(target);
  return c;
}

function flatMesh(mesh: T.Mesh) {
  const material = mesh.material as T.MeshLambertMaterial;
  const source = mesh.geometry;
  const base = source.index ? source.toNonIndexed() : source.clone();
  for (const k of Object.keys(base.attributes))
    if (!["position", "normal", "color"].includes(k)) base.deleteAttribute(k);
  if (!base.attributes.normal) base.computeVertexNormals();
  const n = base.attributes.position.count;
  if (!base.attributes.color)
    base.setAttribute(
      "color",
      new T.Float32BufferAttribute(new Float32Array(3 * n).fill(1), 3),
    );
  const instances = mesh instanceof T.InstancedMesh ? mesh : null;
  const batch: T.BufferGeometry[] = [];
  for (let i = 0; i < (instances?.count ?? 1); i++) {
    const m = new T.Matrix4(),
      tint = new T.Color(1, 1, 1);
    if (instances) {
      instances.getMatrixAt(i, m);
      if (Math.abs(m.determinant()) < 1e-9) continue;
      if (instances.instanceColor) instances.getColorAt(i, tint);
    }
    tint.multiply(material.color);
    const g = base.clone().applyMatrix4(m.premultiply(mesh.matrixWorld));
    const a = g.attributes.color;
    for (let v = 0; v < n; v++)
      a.setXYZ(v, a.getX(v) * tint.r, a.getY(v) * tint.g, a.getZ(v) * tint.b);
    batch.push(g);
  }
  return batch.length ? mergeGeometries(batch) : null;
}

// Each facade in World.buildBuildings is one vertical quad (two triangles).
// Bake pane geometry for the exported illustration at the same floor/window spacing.
function panes(g: T.BufferGeometry) {
  const b = new Builder(),
    p = g.attributes.position,
    style = g.attributes.aStyle;
  for (let i = 0; i + 5 < p.count; i += 1) {
    const kind = style.getX(i);
    if (kind < 0) continue;
    const x = p.getX(i),
      z = p.getZ(i),
      dx = p.getX(i + 1) - x,
      dz = p.getZ(i + 1) - z;
    const len = Math.hypot(dx, dz),
      roof = p.getY(i + 2);
    const base = g.attributes.aBase.getX(i);
    for (let y = base + 0.55; y + 2 < roof; y += 3.55) {
      const spacing = kind === 0 ? 2.6 : 2;
      const count = Math.floor(len / spacing);
      for (let j = 0; j < count; j++) {
        const a = (j + 0.12) / count,
          c = (j + (kind === 0 ? 0.68 : 0.95)) / count;
        // Double-sided walls can wind either way. Offset both faces a few cm.
        for (const side of [-0.025, 0.025]) {
          const point = (s: number, h: number) => [
            x + s * dx - (side * dz) / len,
            h,
            z + s * dz + (side * dx) / len,
          ];
          b.quad(
            point(a, y),
            point(c, y),
            point(c, y + 2),
            point(a, y + 2),
            kind === 2 ? "#819caf" : "#546779",
          );
        }
      }
    }
    i += 5;
  }
  return b.geometry();
}

function routes(world: World) {
  const { line, elev } = world.marta;
  const train = [];
  for (let s = 0; s <= line.length; s += 2) {
    const p = line.at(s);
    train.push([p.x - p.nx * 2.1, elev(s) + 0.55, p.z - p.nz * 2.1]);
  }
  const roads = world.data.roads
    .filter((r) => r.cls === "motorway" && r.sub !== "link")
    .map((r) => {
      const path = new Line(r.pts).offset(1.6, 2);
      return path.pts.map(([x, z]) => [
        x,
        (r.bridge ? Math.max(0, world.ground(x, z)) : world.ground(x, z)) + 0.2,
        z,
      ]);
    })
    .sort((a, b) => b.length - a.length);
  return { train, roads: roads.slice(0, 4), bounds: world.b };
}

export function installCapture(
  world: World,
  train: Train,
  traffic: Traffic,
  scene: T.Scene,
) {
  Object.assign(window, {
    captureArt: async (kind: string): Promise<Blob> => {
      if (kind === "routes") return new Blob([JSON.stringify(routes(world))]);
      const center = new T.Vector3().fromArray(spec.target);
      if (kind === "reference") {
        const r = new T.WebGLRenderer({
          antialias: true,
          preserveDrawingBuffer: true,
        });
        r.setSize(spec.width, spec.height);
        r.shadowMap.enabled = true;
        r.toneMapping = T.NeutralToneMapping;
        r.render(scene, camera(spec.width, spec.height, center));
        const blob = await new Promise<Blob>((resolve) =>
          r.domElement.toBlob((b) => resolve(b!), "image/jpeg", 0.92),
        );
        r.dispose();
        return blob;
      }
      if (kind === "world") {
        const out = new T.Group(),
          mat = new T.MeshStandardMaterial({
            vertexColors: true,
            roughness: 1,
            side: T.DoubleSide,
          });
        const add = (mesh: T.Object3D) => {
          if (!(mesh instanceof T.Mesh) || !mesh.visible) return;
          const g = flatMesh(mesh);
          if (g) out.add(new T.Mesh(g, mat));
          if (mesh.geometry.attributes.aStyle)
            out.add(new T.Mesh(panes(mesh.geometry), mat));
        };
        world.group.updateMatrixWorld(true);
        world.group.traverseVisible(add);
        // Traffic owns the lane dashes. Its moving vehicles and headlights are instanced.
        traffic.group.children
          .filter((o) => o instanceof T.Mesh && !(o instanceof T.InstancedMesh))
          .forEach(add);
        const bytes = await new GLTFExporter().parseAsync(out, {
          binary: true,
        });
        return new Blob([bytes as ArrayBuffer]);
      }
      return spriteSheet(kind, train);
    },
  });
}

async function spriteSheet(kind: string, train: Train) {
  const tile = 128,
    headings = 32;
  const atlas = document.createElement("canvas");
  atlas.width = tile * 8;
  atlas.height = tile * 4 * 5;
  const ctx = atlas.getContext("2d")!;
  const r = new T.WebGLRenderer({
    alpha: true,
    antialias: false,
    preserveDrawingBuffer: true,
  });
  r.setSize(tile, tile);
  r.setClearColor(0, 0);
  const c = camera(tile, tile, new T.Vector3());
  const stage = new T.Scene();
  const night = { value: kind === "night" ? 1 : 0 };
  const light = new T.DirectionalLight(0xffeed8, night.value ? 0.5 : 2.1);
  light.position.set(-3, 5, 2);
  stage.add(
    light,
    new T.HemisphereLight(0xd6e6f8, 0x907562, night.value ? 0.6 : 1.5),
  );
  const trainNight = train.night.value;
  train.night.value = night.value;
  const models = [0, 1].map(
    (i) =>
      new T.Mesh(
        (train.group.children[i] as T.Mesh).geometry,
        (train.group.children[i] as T.Mesh).material,
      ),
  );
  for (const [i, type] of (["sedan", "pickup", "box"] as const).entries()) {
    const mat = vehicleMaterial(night);
    mat.color.set(["#a84237", "#507584", "#e6cc98"][i]);
    models.push(new T.Mesh(vehicleGeometry(type), mat));
  }
  const height = new T.ShaderMaterial({
    vertexShader:
      "varying float h; void main(){vec4 p=modelMatrix*vec4(position,1.); h=p.y; gl_Position=projectionMatrix*viewMatrix*p;}",
    fragmentShader:
      "varying float h; void main(){gl_FragColor=vec4(vec3(clamp(h/10.,0.,1.)),1.);}",
  });
  if (kind === "height") stage.overrideMaterial = height;
  models.forEach((m, row) => {
    stage.add(m);
    for (let i = 0; i < headings; i++) {
      m.rotation.y = (i * 2 * Math.PI) / headings;
      r.render(stage, c);
      ctx.drawImage(
        r.domElement,
        (i % 8) * tile,
        (row * 4 + Math.floor(i / 8)) * tile,
      );
    }
    stage.remove(m);
  });
  train.night.value = trainNight;
  r.dispose();
  return await new Promise<Blob>((resolve) => atlas.toBlob((b) => resolve(b!)));
}
