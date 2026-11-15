"""
Adds per-zone features to the map-shaped (equirectangular) records in catalog.json, so the app can
play one zone of the planet instead of the whole map. It works on the frames already saved by
build_dataset.py, so nothing is downloaded.

    pipeline/.venv/bin/python pipeline/build_zones.py
"""

from __future__ import annotations

import json

from PIL import Image

from build_dataset import OUT, features
from zones import ZONES, crop


def main() -> None:
    path = OUT / "catalog.json"
    catalog = json.loads(path.read_text())
    for entry in catalog:
        if entry["projection"] != "equirect":
            continue
        print("==", entry["slug"])
        for frame in entry["frames"]:
            img = Image.open(OUT.parent / frame["src"]).convert("RGB")
            frame["zones"] = {zone: features(crop(img, zone)) for zone in ZONES}
    path.write_text(json.dumps(catalog, separators=(",", ":")))
    print(f"wrote {path}")


if __name__ == "__main__":
    main()
