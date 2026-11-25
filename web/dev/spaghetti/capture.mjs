// Run inside the Studio window. Requires the dev fixture running on loopback.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { launchChrome } from "../../../scripts/chrome-cdp.mjs";
const [url, out] = process.argv.slice(2);
if (!out || new URL(url).hostname !== "127.0.0.1")
  throw Error("usage: capture.mjs <loopback fixture URL> <output directory>");
mkdirSync(out, { recursive: true });
const browser = await launchChrome("ramp-webgl-", [
  "--headless=new",
  "--ignore-gpu-blocklist",
  "--enable-unsafe-swiftshader",
]);
try {
  const socket = new WebSocket(browser.wsUrl);
  await new Promise((r) => socket.addEventListener("open", r, { once: true }));
  const pending = new Map();
  let id = 0;
  const errors = [];
  socket.addEventListener("message", (event) => {
    const m = JSON.parse(event.data);
    if (m.id) {
      pending.get(m.id)?.(m);
      pending.delete(m.id);
    }
    if (m.method === "Runtime.exceptionThrown")
      errors.push(
        m.params.exceptionDetails.exception?.description ??
          m.params.exceptionDetails.text,
      );
  });
  function send(method, params = {}) {
    return new Promise((res, rej) => {
      const key = ++id;
      pending.set(key, (m) =>
        m.error ? rej(Error(m.error.message)) : res(m.result),
      );
      socket.send(JSON.stringify({ id: key, method, params }));
    });
  }
  async function evaluate(expression) {
    const r = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails)
      throw Error(
        r.exceptionDetails.exception?.description ?? r.exceptionDetails.text,
      );
    return r.result.value;
  }
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 960,
    height: 540,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url });
  for (let i = 0; i < 120; i++) {
    if (errors.length) throw Error(errors.join("\n"));
    if (await evaluate("Boolean(window.rampFixture)")) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!(await evaluate("Boolean(window.rampFixture)")))
    throw Error(
      "Fixture did not start: " + (await evaluate("document.body.innerText")),
    );
  async function shot(path) {
    const { data } = await send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
    });
    writeFileSync(join(out, path), Buffer.from(data, "base64"));
  }
  const results = [];
  for (const [s, overhead] of [
    [899, false],
    [905, false],
    [983.2, false],
    [989.2, false],
    [985.204, false],
    [741.592, false],
    [741.592, true],
  ]) {
    const result = await evaluate(
      "window.rampFixture.check(" + s + "," + overhead + ")",
    );
    results.push(result);
    await shot("station-" + s + (overhead ? "-upper" : "") + ".png");
  }
  writeFileSync(
    join(out, "stations.json"),
    JSON.stringify(results, null, 2) + "\n",
  );
  for (let i = 0; i <= 132; i++) {
    await evaluate("window.rampFixture.place(" + (727 + (i * 25) / 12) + ")");
    await shot("drive-" + String(i).padStart(3, "0") + ".png");
  }
  console.log(JSON.stringify(results));
  socket.close();
} finally {
  await browser.close();
}
