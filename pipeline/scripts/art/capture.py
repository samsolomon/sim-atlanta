"""Capture the opt-in vignette export from a running pnpm dev on localhost."""

from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "data/raw/art"
OUT.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(channel="chrome", args=["--ignore-gpu-blocklist"])
    page = browser.new_page(
        viewport={"width": 1200, "height": 800}, accept_downloads=True
    )
    page.on("pageerror", lambda e: print(e, flush=True))
    page.goto(
        "http://localhost:5173/vignette.html?export=glb&at=2026-11-20T13:00:00-05:00&speed=0&weather=clear&clean"
    )
    page.wait_for_function("window.captureArt !== undefined", timeout=120000)
    page.evaluate(
        "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
    )
    for kind, ext in [
        ("world", "glb"),
        ("reference", "jpg"),
        ("routes", "json"),
        ("day", "png"),
        ("night", "png"),
        ("height", "png"),
    ]:
        with page.expect_download(timeout=180000) as download:
            page.evaluate(
                """async kind => {
                const url=URL.createObjectURL(await window.captureArt(kind));
                const a=document.createElement('a'); a.href=url; a.download=kind; a.click();
                setTimeout(()=>URL.revokeObjectURL(url),3000);
            }""",
                kind,
            )
        dest = OUT / f"{kind}.{ext}"
        download.value.save_as(dest)
        print(dest.name, dest.stat().st_size, flush=True)
    browser.close()
