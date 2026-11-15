"""
Builds the "Climate Time Machine" record for Earth Jukebox v2.

Source: NASA SVS #5343, "NEX GDDP CMIP6 Historical and Predicted Global Maximum
Monthly Temperature from 1950 - 2100". Each movie has one frame per year
(151 frames, 1950..2100) for one emissions scenario (SSP). We sample every
5 years for the four scenarios, compute the same visual features as
build_dataset.py, and write web/public/data/time-machine.json.

The source maps only cover land (oceans are black), so for display we fill the
oceans with a NASA Blue Marble. Features are computed on the original
frame, so the music is driven by the data only.

    pipeline/.venv/bin/python pipeline/build_time_machine.py
"""

from __future__ import annotations

import io
import json
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import requests
from PIL import Image

from build_dataset import HEADERS, ROOT, features

SVS_ID = 5343
BASE = "https://svs.gsfc.nasa.gov/vis/a000000/a005300/a005343"
OUT = ROOT / "web" / "public" / "data"
YEARS = list(range(1950, 2101, 5))
WIDTH = 1024

SCENARIOS = [
    ("ssp126", "SSP1-2.6", "Low emissions", "The world cuts greenhouse gas emissions quickly and reaches net zero after 2050."),
    ("ssp245", "SSP2-4.5", "Intermediate emissions", "Emissions stay near today's levels until mid-century, then slowly fall."),
    ("ssp370", "SSP3-7.0", "High emissions", "Emissions keep rising and roughly double by 2100."),
    ("ssp585", "SSP5-8.5", "Very high emissions", "Fossil fuel use grows fast; emissions roughly double by 2050."),
]


def main() -> None:
    ocean = Image.open(ROOT / "web" / "public" / "textures" / "blue-marble.jpg").convert("RGB").resize((WIDTH, WIDTH // 2), Image.LANCZOS)
    ocean = (np.asarray(ocean, dtype=np.float32) * 0.95).astype(np.float32)
    folder = OUT / "time-machine"
    folder.mkdir(parents=True, exist_ok=True)

    scenarios = []
    with tempfile.TemporaryDirectory() as tmp:
        for sid, code, label, blurb in SCENARIOS:
            print(f"== {sid}")
            movie = Path(tmp) / f"{sid}.mp4"
            movie.write_bytes(requests.get(f"{BASE}/monthly_max_{sid}_max12_8192_1024x512.mp4", headers=HEADERS, timeout=300).content)
            frames = []
            for year in YEARS:
                png = subprocess.check_output(
                    ["ffmpeg", "-v", "error", "-i", str(movie), "-vf", f"select=eq(n\\,{year - 1950})", "-frames:v", "1", "-f", "image2pipe", "-vcodec", "png", "-"]
                )
                img = Image.open(io.BytesIO(png)).convert("RGB").resize((WIDTH, WIDTH // 2), Image.LANCZOS)
                data = np.asarray(img, dtype=np.float32)
                land = (data.max(-1, keepdims=True) > 28).astype(np.float32)  # near-black = no data (ocean)
                shown = Image.fromarray((data * land + ocean * (1 - land)).astype(np.uint8))
                name = f"{sid}_{year}.jpg"
                shown.save(folder / name, quality=82)
                lum = data @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
                mask = land[..., 0] > 0
                # darker red = hotter, white = snow/cold: invert land luminance to get a raw heat value
                raw_heat = float(255 - lum[mask].mean())
                # Same 4 x 8 grid the melody scans, but holding the data itself: mean heat of the land in each cell
                # (-1 where the cell has almost no land, because this dataset does not cover the oceans).
                h, w = mask.shape
                cells = []
                for i in range(4):
                    row = []
                    for j in range(8):
                        m = mask[i * h // 4:(i + 1) * h // 4, j * w // 8:(j + 1) * w // 8]
                        v = lum[i * h // 4:(i + 1) * h // 4, j * w // 8:(j + 1) * w // 8]
                        row.append(float(255 - v[m].mean()) if m.mean() > 0.04 else -1.0)
                    cells.append(row)
                frames.append({"src": f"data/time-machine/{name}", "year": year, "heat": raw_heat, "heatGrid": cells, **features(img)})
            scenarios.append({"id": sid, "code": code, "label": label, "blurb": blurb, "frames": frames})

    # Normalise heat to 0..1 across every year and scenario, so it is comparable between them.
    heats = [f["heat"] for s in scenarios for f in s["frames"]]
    lo, hi = min(heats), max(heats)
    for s in scenarios:
        for f in s["frames"]:
            f["heat"] = round((f["heat"] - lo) / (hi - lo), 4)

    # Per cell: heat on one 0..1 scale, and how much the cell has warmed since 1950 (0..1 of the largest warming
    # found in any cell, year or scenario). The melody uses the first to choose where to sing and the second for the note.
    cells = [v for s in scenarios for f in s["frames"] for row in f["heatGrid"] for v in row if v >= 0]
    clo, chi = min(cells), max(cells)
    top = 1e-6
    for s in scenarios:
        start = s["frames"][0]["heatGrid"]
        for f in s["frames"]:
            f["_warm"] = [[max(0.0, v - start[i][j]) if v >= 0 and start[i][j] >= 0 else -1.0 for j, v in enumerate(row)] for i, row in enumerate(f["heatGrid"])]
            top = max(top, max(v for row in f["_warm"] for v in row))
    for s in scenarios:
        for f in s["frames"]:
            f["heatGrid"] = [[round((v - clo) / (chi - clo), 4) if v >= 0 else -1 for v in row] for row in f["heatGrid"]]
            f["warmGrid"] = [[round(v / top, 4) if v >= 0 else -1 for v in row] for row in f.pop("_warm")]

    entry = {
        "slug": "time-machine",
        "svsId": SVS_ID,
        "title": "Climate Time Machine: 1950 – 2100",
        "description": (
            "Yearly maximum of monthly maximum temperature over land, 1950-2100, from NASA's NEX-GDDP-CMIP6 dataset: "
            "downscaled results of the CMIP6 global climate models used in the IPCC Sixth Assessment Report. "
            "Years up to 2014 are the models' historical runs; later years follow one of four emissions scenarios (SSPs). "
            "These are scenario-based model projections, not forecasts."
        ),
        "credits": f"NASA Scientific Visualization Studio - https://svs.gsfc.nasa.gov/{SVS_ID}/",
        "sourceUrl": f"https://svs.gsfc.nasa.gov/{SVS_ID}/",
        "projection": "equirect",
        "years": YEARS,
        "scenarios": scenarios,
        "frames": scenarios[1]["frames"],
    }
    (OUT / "time-machine.json").write_text(json.dumps(entry, indent=1))
    print(f"wrote {OUT / 'time-machine.json'}")


if __name__ == "__main__":
    main()
