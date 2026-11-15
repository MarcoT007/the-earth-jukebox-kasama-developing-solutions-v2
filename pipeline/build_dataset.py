"""
Earth Jukebox data pipeline.

Downloads frames from NASA Scientific Visualization Studio (SVS) visualizations
used in the Earth Information Center (EIC), extracts visual features from each
frame, and writes them to web/public/data/ so the web app can sonify them.

Why a pipeline instead of fetching in the browser: SVS does not send CORS headers
for arbitrary origins, so a browser cannot read SVS pixels directly. We
pre-process once and serve the results as static files.

Usage:
    pipeline/.venv/bin/python pipeline/build_dataset.py            # all sources
    pipeline/.venv/bin/python pipeline/build_dataset.py ocean-currents
"""

from __future__ import annotations

import colorsys
import io
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import requests
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "web" / "public" / "data"
SVS = "https://svs.gsfc.nasa.gov"
HEADERS = {"User-Agent": "earth-jukebox-hackathon/0.1"}


@dataclass
class Source:
    slug: str
    svs_id: int
    kind: str  # "frames" (SVS frame directory) or "movie" (sample an mp4 with ffmpeg)
    match: str  # substring that identifies the asset URL inside the SVS API response
    projection: str  # "equirect" (can wrap the 3D globe) or "screen" (a rendered view)
    frames: int = 24
    width: int = 1024  # output width in px


# Visualizations listed in the challenge's NASA Data & Resources section.
SOURCES: list[Source] = [
    Source("ocean-currents", 3912, "frames", "2048x1024_1x1_30p/orig/", "equirect", width=2048),
    Source("lightning", 5011, "movie", "iss_lightning_sos_yearly_07312023_2048p60.mp4", "equirect", width=2048),
    Source("forest-height", 4950, "frames", "3840x2160_16x9_60p/GEDI_global/", "screen"),
    Source("ocean-temperature", 5425, "frames", "3840x2160_16x9_60p/temperature/", "screen"),
    Source("atmospheric-river", 4960, "frames", "3840x2160_16x9_60p/", "screen"),
    Source("carbon-dioxide", 5196, "frames", "dyamond_co2_anim_globe_orbit_3x3Hyperwall/", "screen"),
    Source("air-quality", 5533, "frames", "AirQuality_MapWithLabels/", "screen"),
]


def svs_page(svs_id: int) -> dict:
    r = requests.get(f"{SVS}/api/{svs_id}", headers=HEADERS, timeout=60)
    r.raise_for_status()
    return r.json()


def find_asset(page: dict, src: Source) -> str:
    wanted = "Frames" if src.kind == "frames" else "Movie"
    for group in page.get("media_groups", []):
        for item in group.get("items", []):
            inst = item.get("instance") or {}
            url = (inst.get("url") or "").replace("http://", "https://")
            if inst.get("media_type") == wanted and src.match in url:
                return url
    raise RuntimeError(f"{src.slug}: no {wanted} asset matching {src.match!r}")


def fallback_movie(page: dict) -> str:
    """Pick a ~1080p mp4 (small enough to seek quickly, big enough to analyse)."""
    movies = []
    for group in page.get("media_groups", []):
        for item in group.get("items", []):
            inst = item.get("instance") or {}
            url = (inst.get("url") or "").replace("http://", "https://")
            if inst.get("media_type") == "Movie" and url.endswith(".mp4"):
                movies.append((abs((inst.get("height") or 1080) - 1080), "1080" not in url, url))
    if not movies:
        raise RuntimeError("no mp4 movie on this SVS page")
    return sorted(movies)[0][2]


def evenly(items: list, n: int) -> list:
    if len(items) <= n:
        return items
    idx = np.linspace(0, len(items) - 1, n).round().astype(int)
    return [items[i] for i in idx]


def frames_from_directory(url: str, n: int) -> list[Image.Image]:
    html = requests.get(url, headers=HEADERS, timeout=60).text
    files = sorted(set(re.findall(r'href="([^"]+\.(?:png|jpg|jpeg|tif|tiff))"', html, re.I)))
    if not files:
        raise RuntimeError(f"no frames listed at {url}")
    images = []
    for f in evenly(files, n):
        full = f if f.startswith("http") else SVS + f
        print("   ", full.rsplit("/", 1)[-1])
        r = requests.get(full, headers=HEADERS, timeout=120)
        r.raise_for_status()
        images.append(Image.open(io.BytesIO(r.content)).convert("RGB"))
    return images


def frames_from_movie(url: str, n: int) -> list[Image.Image]:
    duration = float(
        subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", url],
            text=True,
        ).strip()
    )
    images = []
    for t in np.linspace(0, duration * 0.98, n):
        print(f"    t={t:6.1f}s")
        png = subprocess.check_output(
            ["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", url, "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"]
        )
        images.append(Image.open(io.BytesIO(png)).convert("RGB"))
    return images


def features(img: Image.Image) -> dict:
    """Visual features that drive the sonification (all values roughly 0..1)."""
    small = np.asarray(img.resize((256, max(1, round(256 * img.height / img.width)))), dtype=np.float32) / 255.0
    r, g, b = small[..., 0], small[..., 1], small[..., 2]
    mx, mn = small.max(-1), small.min(-1)
    value = mx
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b

    # Hue in [0,1); 12 bins map to the 12 pitch classes (chroma vector).
    hue = np.zeros_like(mx)
    d = np.maximum(mx - mn, 1e-6)
    hue = np.where(mx == r, ((g - b) / d) % 6, hue)
    hue = np.where(mx == g, (b - r) / d + 2, hue)
    hue = np.where(mx == b, (r - g) / d + 4, hue)
    hue = (hue / 6.0) % 1.0
    weight = sat * value * (sat > 0.15)
    chroma, _ = np.histogram(hue, bins=12, range=(0, 1), weights=weight)
    chroma = chroma / chroma.sum() if chroma.sum() > 0 else chroma

    # Edge density (texture / "busyness") -> rhythm density.
    gx = np.abs(np.diff(lum, axis=1)).mean()
    gy = np.abs(np.diff(lum, axis=0)).mean()

    # 4x8 grid of brightness -> spatial panning / register.
    h, w = lum.shape
    grid = [[float(lum[i * h // 4:(i + 1) * h // 4, j * w // 8:(j + 1) * w // 8].mean()) for j in range(8)] for i in range(4)]

    # Dominant colour (for UI + text description).
    mean_rgb = small.reshape(-1, 3).mean(0)
    dom_h, _, _ = colorsys.rgb_to_hsv(*mean_rgb)

    return {
        "brightness": round(float(lum.mean()), 4),
        "contrast": round(float(lum.std()), 4),
        "saturation": round(float(sat.mean()), 4),
        "edges": round(float(min(1.0, (gx + gy) * 8)), 4),
        "hotspots": round(float((value > 0.85).mean()), 4),
        "chroma": [round(float(c), 4) for c in chroma],
        "grid": [[round(v, 4) for v in row] for row in grid],
        "meanRgb": [round(float(c), 4) for c in mean_rgb],
        "dominantHue": round(float(dom_h), 4),
    }


def build(src: Source) -> dict:
    print(f"== {src.slug} (SVS {src.svs_id})")
    page = svs_page(src.svs_id)
    url = find_asset(page, src)
    try:
        images = frames_from_directory(url, src.frames) if src.kind == "frames" else frames_from_movie(url, src.frames)
    except RuntimeError as exc:
        # Many SVS frame folders are not browsable; fall back to sampling the page's movie.
        movie = fallback_movie(page)
        print(f"   {exc}; sampling movie {movie.rsplit('/', 1)[-1]}")
        images = frames_from_movie(movie, src.frames)

    folder = OUT / src.slug
    folder.mkdir(parents=True, exist_ok=True)
    frames = []
    for i, img in enumerate(images):
        h = round(src.width * img.height / img.width)
        out = img.resize((src.width, h), Image.LANCZOS)
        name = f"frame_{i:03d}.jpg"
        out.save(folder / name, quality=85)
        frames.append({"src": f"data/{src.slug}/{name}", **features(img)})

    description = re.sub(r"\s+", " ", re.sub(r"<[^>]+>|\[([^\]]+)\]\([^)]+\)", r"\1", page.get("description") or "")).strip()
    return {
        "slug": src.slug,
        "svsId": src.svs_id,
        "title": page.get("title"),
        "description": description[:600],
        "credits": f"NASA Scientific Visualization Studio - {SVS}/{src.svs_id}/",
        "sourceUrl": f"{SVS}/{src.svs_id}/",
        "projection": src.projection,
        "frames": frames,
    }


def main() -> None:
    wanted = set(sys.argv[1:])
    OUT.mkdir(parents=True, exist_ok=True)
    catalog_path = OUT / "catalog.json"
    catalog = {e["slug"]: e for e in json.loads(catalog_path.read_text())} if catalog_path.exists() else {}
    for src in SOURCES:
        if wanted and src.slug not in wanted:
            continue
        try:
            catalog[src.slug] = build(src)
        except Exception as exc:  # keep going; one broken source should not block the rest
            print(f"!! {src.slug} failed: {exc}")
    order = [s.slug for s in SOURCES]
    entries = sorted(catalog.values(), key=lambda e: order.index(e["slug"]) if e["slug"] in order else 99)
    catalog_path.write_text(json.dumps(entries, indent=1))
    print(f"wrote {catalog_path} ({len(entries)} visualizations)")


if __name__ == "__main__":
    main()
