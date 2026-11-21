import "./style.css";
import spec from "./camera.json";
import { SimClock, sunPosition } from "../vignette/time";

type Point = [number, number, number];
type Routes = {
  train: Point[];
  roads: Point[][];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
};
const root = import.meta.env.BASE_URL + "art/";
const el = <T extends HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const canvas = document.querySelector("canvas")!;
const ctx = canvas.getContext("2d")!;
const status = el("status");
const style = el<HTMLSelectElement>("style");
const light = el<HTMLSelectElement>("light");
const tileSize = 512,
  cell = 128;
const maxLevel = Math.ceil(
  Math.log2(Math.max(spec.width, spec.height) / tileSize),
);
const az = (spec.azimuth * Math.PI) / 180,
  tilt = (spec.elevation * Math.PI) / 180;
const ca = Math.cos(az),
  sa = Math.sin(az),
  ce = Math.cos(tilt),
  se = Math.sin(tilt);

function project([x, y, z]: Point) {
  x -= spec.target[0];
  y -= spec.target[1];
  z -= spec.target[2];
  const forward = x * sa + z * ca;
  return {
    x: spec.width / 2 + (ca * x - sa * z) / spec.metresPerPixel,
    y: spec.height / 2 + (se * forward - ce * y) / spec.metresPerPixel,
    depth: ce * forward + se * y,
  };
}
function path(points: Point[]) {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    const [x, y, z] = points[i],
      p = points[i - 1];
    cum.push(cum[i - 1] + Math.hypot(x - p[0], y - p[1], z - p[2]));
  }
  return { points, cum, length: cum[cum.length - 1] };
}
type Path = ReturnType<typeof path>;
function sample(p: Path, s: number) {
  let lo = 0,
    hi = p.points.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (p.cum[mid] <= s) lo = mid;
    else hi = mid;
  }
  const a = p.points[lo],
    b = p.points[hi],
    t = (s - p.cum[lo]) / (p.cum[hi] - p.cum[lo] || 1);
  const point: Point = [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
  return { point, heading: Math.atan2(b[0] - a[0], b[2] - a[2]) };
}
async function bitmap(name: string) {
  const response = await fetch(root + name);
  if (!response.ok) throw Error(name);
  return createImageBitmap(await response.blob(), {
    colorSpaceConversion: "none",
  });
}
function pixels(im: ImageBitmap) {
  const c = document.createElement("canvas");
  c.width = im.width;
  c.height = im.height;
  const g = c.getContext("2d")!;
  g.drawImage(im, 0, 0);
  const data = g.getImageData(0, 0, c.width, c.height).data;
  im.close();
  return data;
}

async function main() {
  const [routes, surface, heights, day, night, layers] = await Promise.all([
    fetch(root + "routes.json").then((r) => r.json()) as Promise<Routes>,
    bitmap("surface.png").then(pixels),
    bitmap("height.png").then(pixels),
    bitmap("day.png").then(pixels),
    bitmap("night.png").then(pixels),
    fetch(root + "layers.json").then((r) => r.json()) as Promise<string[]>,
  ]);
  if (layers.includes("ai")) style.add(new Option("AI redraw", "ai"));
  const params = new URLSearchParams(location.search);
  const initial =
    params.get("base") ?? (layers.includes("ai") ? "ai" : "blender");
  const clock = new SimClock(params.get("at"));
  light.value = sunPosition(clock.now()).elevation < 0 ? "night" : "day";
  if (initial && layers.includes(initial)) style.value = initial;
  const train = path(routes.train),
    roads = routes.roads.map(path).filter((r) => r.length > 4);
  const atlasWidth = cell * 8,
    stamps = document.createElement("canvas");
  stamps.width = cell;
  stamps.height = cell;
  const brush = stamps.getContext("2d")!;
  const stamp = brush.createImageData(cell, cell);
  const tiles = new Map<string, ImageBitmap | null>();
  let width = 0,
    height = 0,
    zoom = 1,
    cx = spec.width / 2,
    cy = spec.height / 2;
  let paused = matchMedia("(prefers-reduced-motion: reduce)").matches,
    dirty = true;
  function fit() {
    cx = spec.width / 2;
    cy = spec.height / 2;
    zoom = Math.min(width / spec.width, height / spec.height) * 0.98;
    dirty = true;
  }
  function resize() {
    const rect = canvas.getBoundingClientRect(),
      ratio = Math.min(devicePixelRatio, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    fit();
  }
  new ResizeObserver(resize).observe(canvas);
  resize();
  function magnify(f: number, x = width / 2, y = height / 2) {
    const prev = zoom;
    zoom = Math.min(
      5,
      Math.max(
        Math.min(width / spec.width, height / spec.height) / 2,
        prev * f,
      ),
    );
    cx += (x - width / 2) * (1 / prev - 1 / zoom);
    cy += (y - height / 2) * (1 / prev - 1 / zoom);
    dirty = true;
  }
  canvas.onwheel = (e) => {
    e.preventDefault();
    magnify(Math.exp(-e.deltaY * 0.002), e.offsetX, e.offsetY);
  };
  let drag: { x: number; y: number } | undefined;
  canvas.onpointerdown = (e) => {
    canvas.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY };
  };
  canvas.onpointermove = (e) => {
    if (drag) {
      cx -= (e.clientX - drag.x) / zoom;
      cy -= (e.clientY - drag.y) / zoom;
      drag = { x: e.clientX, y: e.clientY };
      dirty = true;
    }
  };
  canvas.onlostpointercapture = () => {
    drag = undefined;
  };
  canvas.onkeydown = (e) => {
    if (e.key === "+") magnify(1.5);
    else if (e.key === "-") magnify(1 / 1.5);
    else if (e.key === "ArrowLeft") cx -= 80 / zoom;
    else if (e.key === "ArrowRight") cx += 80 / zoom;
    else if (e.key === "ArrowUp") cy -= 80 / zoom;
    else if (e.key === "ArrowDown") cy += 80 / zoom;
    else return;
    e.preventDefault();
    dirty = true;
  };
  el("in").onclick = () => magnify(1.5);
  el("out").onclick = () => magnify(1 / 1.5);
  el("fit").onclick = fit;
  const motion = el("motion");
  motion.textContent = paused ? "Play" : "Pause";
  motion.onclick = () => {
    paused = !paused;
    motion.textContent = paused ? "Play" : "Pause";
    dirty = true;
  };
  light.onchange = style.onchange = () => {
    dirty = true;
  };
  const { bounds } = routes;
  function actors(time: number) {
    const list: {
      point: Point;
      heading: number;
      row: number;
      screen: ReturnType<typeof project>;
    }[] = [];
    function add(p: Path, s: number, row: number, reverse = false) {
      if (s < 0 || s >= p.length) return;
      const { point, heading } = sample(p, s),
        [x, y, z] = point;
      if (
        x < bounds.minX ||
        x > bounds.maxX ||
        z < bounds.minZ ||
        z > bounds.maxZ ||
        (row < 2 && y < -7.5)
      )
        return;
      list.push({
        point,
        heading: heading + (reverse ? Math.PI : 0),
        row,
        screen: project(point),
      });
    }
    const head = (time * 16 + train.length * 0.57) % (train.length + 155);
    for (let i = 0; i < 6; i++)
      add(train, head - i * 23.9, i === 0 || i === 5 ? 0 : 1, i === 5);
    roads.forEach((r, i) => {
      for (let j = 0; j < 3; j++)
        add(
          r,
          (time * (15 + i) + (r.length * (j + 0.15 * i)) / 3) % r.length,
          2 + ((i + j) % 3),
        );
    });
    return list.sort((a, b) => a.screen.depth - b.screen.depth);
  }
  function draw(time: number) {
    const left = cx - width / (2 * zoom),
      top = cy - height / (2 * zoom);
    ctx.fillStyle = "#e4dfcf";
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    const ratio = Math.min(devicePixelRatio, 2);
    const snap = (n: number) => Math.round(n * ratio) / ratio;
    const level = Math.max(
      0,
      Math.min(
        maxLevel,
        Math.ceil(maxLevel + Math.log2(zoom * Math.min(devicePixelRatio, 2))),
      ),
    );
    const scale = 2 ** (maxLevel - level),
      span = tileSize * scale;
    ctx.imageSmoothingEnabled = zoom < 1;
    for (
      let y = Math.max(0, Math.floor(top / span));
      y * span < Math.min(spec.height, top + height / zoom);
      y++
    ) {
      for (
        let x = Math.max(0, Math.floor(left / span));
        x * span < Math.min(spec.width, left + width / zoom);
        x++
      ) {
        const key = style.value + "/" + level + "/" + x + "-" + y + ".png";
        if (!tiles.has(key)) {
          tiles.set(key, null);
          bitmap(key)
            .then((im) => {
              tiles.set(key, im);
              dirty = true;
            })
            .catch(() => {
              status.hidden = false;
              status.textContent =
                "A map tile could not load. Reload to retry.";
            });
        }
        const img = tiles.get(key);
        if (img) {
          // Adjacent tiles must share a device-pixel edge at fractional zoom.
          const x0 = snap((x * span - left) * zoom),
            y0 = snap((y * span - top) * zoom);
          const x1 = snap((x * span + img.width * scale - left) * zoom),
            y1 = snap((y * span + img.height * scale - top) * zoom);
          ctx.drawImage(img, x0, y0, x1 - x0, y1 - y0);
        }
      }
    }
    ctx.scale(zoom, zoom);
    ctx.translate(-left, -top);
    const colors = light.value === "night" ? night : day;
    for (const a of actors(time)) {
      const x = Math.round(a.screen.x) - cell / 2,
        y = Math.round(a.screen.y) - cell / 2;
      if (
        x + cell < left ||
        x > left + width / zoom ||
        y + cell < top ||
        y > top + height / zoom
      )
        continue;
      const h = (Math.round((a.heading * 32) / (2 * Math.PI)) + 64) % 32;
      const sx = (h % 8) * cell,
        sy = (a.row * 4 + Math.floor(h / 8)) * cell;
      for (let py = 0; py < cell; py++) {
        const start = ((sy + py) * atlasWidth + sx) * 4;
        stamp.data.set(colors.subarray(start, start + 4 * cell), py * cell * 4);
        for (let px = 0; px < cell; px++) {
          const idx = (py * cell + px) * 4;
          if (!stamp.data[idx + 3]) continue;
          const off = ((y + py) * spec.width + x + px) * 4;
          const ground = ((surface[off] << 8) + surface[off + 1] - 32768) / 100;
          if (ground > a.point[1] + heights[start + px * 4] / 25.5 + 0.2)
            stamp.data[idx + 3] = 0;
        }
      }
      brush.putImageData(stamp, 0, 0);
      ctx.drawImage(stamps, x, y);
    }
    ctx.restore();
  }
  status.hidden = true;
  let time = 0,
    previous = performance.now();
  function frame(now: number) {
    if (now - previous >= 40) {
      if (!paused) time += Math.min((now - previous) / 1000, 0.2);
      previous = now;
      if (dirty || !paused) {
        dirty = false;
        draw(time);
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
main().catch(() => {
  status.textContent =
    "East Portal artwork is unavailable. Generate the art assets and reload.";
});
