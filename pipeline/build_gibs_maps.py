"""
Gives each "camera view" record its own world map, so the 3D globe shows a different planet per record.

Five of the SVS visualizations are rendered camera shots, not maps, so they cannot be wrapped on the
globe. For each one this script downloads a world map of the same subject from NASA GIBS (Global
Imagery Browse Services) or, for carbon dioxide, from the European Copernicus Atmosphere Monitoring Service, lays it over a dimmed Blue Marble (the layers are transparent where there
is no data), extracts the sound features of the whole map and of each zone, and rewrites the record
in catalog.json as a map-shaped ("equirect") record. The SVS frames stay on disk; one is kept as
the record's `cover`.

Run it after build_dataset.py (which writes those records as camera views again):

    pipeline/.venv/bin/python pipeline/build_gibs_maps.py            # all five
    pipeline/.venv/bin/python pipeline/build_gibs_maps.py air-quality
"""

from __future__ import annotations

import io
import json
import sys
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

import numpy as np
import requests
from PIL import Image

from build_dataset import OUT, features
from zones import ZONES, crop

GIBS = "https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi"
# Copernicus Atmosphere Monitoring Service (CAMS) forecasts, drawn by ECMWF's public map server.
CAMS = "https://eccharts.ecmwf.int/wms/?token=public"
HEADERS = {"User-Agent": "earth-jukebox-hackathon/0.1"}
BASE = OUT.parent / "textures" / "blue-marble.jpg"
WIDTH, HEIGHT = 2048, 1024
DIM = 0.4  # how much of Blue Marble shows where the layer has no data


def monthly(start: date, n: int, step: float = 1.0) -> list[str]:
    out = []
    for i in range(n):
        m = start.year * 12 + start.month - 1 + round(i * step)
        out.append(f"{m // 12:04d}-{m % 12 + 1:02d}-01")
    return out


def daily(start: date, n: int, step: int = 1) -> list[str]:
    return [(start + timedelta(days=i * step)).isoformat() for i in range(n)]


@dataclass
class GibsMap:
    slug: str
    name: str  # what the map shows, in plain words
    layers: list[list[str]]  # one entry per frame: the GIBS layers drawn in that frame, bottom first
    times: list[str]  # one date per frame
    span: str  # the period the frames cover, for the description
    opacity: float = 1.0  # below 1 for layers that cover the whole planet, so the coastlines show through
    wms: str = GIBS
    style: str = ""
    provider: str = "NASA GIBS"
    credits: str = "NASA Global Imagery Browse Services (GIBS), part of NASA's Earth Science Data and Information System (ESDIS)"
    source_url: str = "https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api"


# The CAMS map server only keeps the last few days: 24 maps, 6 hours apart, ending tonight.
_cams_start = datetime.now(timezone.utc).replace(hour=6, minute=0, second=0, microsecond=0) - timedelta(days=5)
CAMS_TIMES = [(_cams_start + timedelta(hours=6 * i)).strftime("%Y-%m-%dT%H:%M:%SZ") for i in range(24)]

CANOPY = "GEDI_ISS_L3_Canopy_Height_Mean_RH100_201904-"
CANOPY_ENDS = ["202010", "202104", "202108", "202201", "202303"]
VAPOR = ["AMSRU2_Columnar_Water_Vapor_Night", "AMSRU2_Columnar_Water_Vapor_Day"]

MAPS: list[GibsMap] = [
    GibsMap(
        "forest-height",
        "mean forest canopy height measured by the GEDI laser on the Space Station",
        [[CANOPY + end] for end in CANOPY_ENDS],
        ["2019-04-18"] * len(CANOPY_ENDS),
        "five maps as the mission added data, from April 2019 to March 2023",
    ),
    GibsMap(
        "ocean-temperature",
        "sea surface temperature (GHRSST MUR analysis)",
        [["GHRSST_L4_MUR_Sea_Surface_Temperature"]] * 24,
        daily(date(2025, 11, 15), 24, 15),
        "one map every 15 days, November 2025 to October 2026",
    ),
    GibsMap(
        "atmospheric-river",
        "water vapour in the air over the oceans (AMSR2 on GCOM-W1), where atmospheric rivers show as long bright streams",
        [VAPOR] * 24,
        daily(date(2025, 1, 1), 24),
        "one map a day, 1 to 24 January 2025",
    ),
    GibsMap(
        "carbon-dioxide",
        "carbon dioxide in the whole column of air, from the Copernicus Atmosphere Monitoring Service (CAMS) global forecast",
        [["composition_co2_totalcolumn"]] * 24,
        CAMS_TIMES,
        f"one map every 6 hours, {CAMS_TIMES[0][:10]} to {CAMS_TIMES[-1][:10]}",
        opacity=0.8,
        wms=CAMS,
        style="sh_Spectral_r_co2_totalcolumn",
        provider="Copernicus (CAMS)",
        credits=f"Generated using Copernicus Atmosphere Monitoring Service information [{CAMS_TIMES[0][:4]}]; maps drawn by ECMWF",
        source_url="https://atmosphere.copernicus.eu/charts/packages/cams/",
    ),
    GibsMap(
        "air-quality",
        "particles in the air such as smoke, dust and haze (MERRA-2 total aerosol optical thickness)",
        [["MERRA2_Total_Aerosol_Optical_Thickness_550nm_Extinction_Monthly"]] * 24,
        monthly(date(2024, 9, 1), 24),
        "monthly maps from September 2024 to August 2026",
        opacity=0.8,
    ),
]


def fetch(m: GibsMap, layers: list[str], time: str) -> Image.Image:
    params = {
        "SERVICE": "WMS",
        "REQUEST": "GetMap",
        "VERSION": "1.3.0",
        "LAYERS": ",".join(layers),
        "STYLES": m.style,
        "CRS": "EPSG:4326",
        "BBOX": "-90,-180,90,180",
        "WIDTH": WIDTH,
        "HEIGHT": HEIGHT,
        "FORMAT": "image/png",
        "TRANSPARENT": "TRUE",
        "TIME": time,
    }
    for attempt in range(3):
        try:
            r = requests.get(m.wms, params=params, headers=HEADERS, timeout=180)
            r.raise_for_status()
            if not r.headers.get("content-type", "").startswith("image/"):
                raise RuntimeError(r.text[:200])
            return Image.open(io.BytesIO(r.content)).convert("RGBA")
        except Exception as exc:
            if attempt == 2:
                raise
            print(f"    retry {time}: {exc}")
    raise AssertionError


def coverage(img: Image.Image) -> float:
    return float((np.asarray(img)[..., 3] > 0).mean())


def build(m: GibsMap, entry: dict, base: Image.Image) -> None:
    print(f"== {m.slug}")
    folder = OUT / m.slug
    folder.mkdir(parents=True, exist_ok=True)
    for old in folder.glob("map_*.jpg"):
        old.unlink()
    if "cover" not in entry:  # first run: the frames are still the SVS camera views
        entry["cover"] = entry["frames"][len(entry["frames"]) // 2]["src"]
        entry["svsDescription"] = entry["description"]

    frames = []
    for layers, time in zip(m.layers, m.times):
        data = fetch(m, layers, time)
        cover = coverage(data)
        if cover < 0.05:  # a day or month with no data: leave it out rather than show an empty planet
            print(f"    {time}: no data, skipped")
            continue
        if m.opacity < 1:
            data.putalpha(data.getchannel("A").point(lambda a: round(a * m.opacity)))
        img = Image.alpha_composite(base, data).convert("RGB")
        name = f"map_{len(frames):03d}.jpg"
        img.save(folder / name, quality=82)
        print(f"    {time} {layers[-1][-24:]}  data on {cover:.0%} of the map")
        frame = {"src": f"data/{m.slug}/{name}", **features(img)}
        frame["zones"] = {zone: features(crop(img, zone)) for zone in ZONES}
        frames.append(frame)
    if not frames:
        raise RuntimeError("no frame had data")

    entry["projection"] = "equirect"
    entry["frames"] = frames
    entry["description"] = (
        f"{entry['svsDescription']} On the globe you see and hear a {m.provider} world map of the same subject: {m.name}; {m.span}."
    )
    entry["map"] = {
        "title": m.name[0].upper() + m.name[1:],
        "layers": sorted({layer for group in m.layers for layer in group}),
        "span": m.span,
        "provider": m.provider,
        "credits": m.credits,
        "sourceUrl": m.source_url,
    }


def main() -> None:
    wanted = set(sys.argv[1:])
    path = OUT / "catalog.json"
    catalog = json.loads(path.read_text())
    by_slug = {e["slug"]: e for e in catalog}
    marble = Image.open(BASE).convert("RGB").resize((WIDTH, HEIGHT), Image.LANCZOS)
    base = Image.eval(marble, lambda v: round(v * DIM)).convert("RGBA")
    for m in MAPS:
        if wanted and m.slug not in wanted:
            continue
        try:
            build(m, by_slug[m.slug], base)
        except Exception as exc:  # keep going; one broken layer should not block the rest
            print(f"!! {m.slug} failed: {exc}")
    path.write_text(json.dumps(catalog, separators=(",", ":")))
    print(f"wrote {path}")


if __name__ == "__main__":
    main()
