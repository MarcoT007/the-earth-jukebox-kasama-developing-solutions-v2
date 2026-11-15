"""
Zones the listener can focus on. Each is one latitude/longitude box, so it can be cut out of any
equirectangular map (-180..180 across, 90..-90 down). Ids and boxes must match web/src/zones.ts.
"""

from __future__ import annotations

from PIL import Image

# id: (label, lat_min, lat_max, lon_min, lon_max)
# Antarctica is left out: the temperature maps paint it at the cold end of the colour scale in every year,
# so its warming cannot be read from them.
ZONES: dict[str, tuple[str, float, float, float, float]] = {
    "north-america": ("North America", 24, 72, -168, -52),
    "central-america": ("Mexico, Central America & Caribbean", 7, 32, -118, -59),
    "south-america": ("South America", -56, 13, -82, -34),
    "europe": ("Europe", 36, 71, -11, 40),
    "africa": ("Africa", -35, 37, -18, 52),
    "middle-east": ("Middle East", 12, 42, 34, 63),
    "south-asia": ("South Asia", 5, 37, 60, 92),
    "east-asia": ("East Asia", 20, 54, 92, 146),
    "southeast-asia": ("Southeast Asia", -11, 20, 92, 141),
    "oceania": ("Australia & Pacific", -48, -10, 110, 180),
    "arctic": ("Arctic", 60, 90, -180, 180),
}


def pixel_box(zone: str, width: int, height: int) -> tuple[int, int, int, int]:
    """(left, top, right, bottom) of the zone in an equirectangular image of this size."""
    _, lat0, lat1, lon0, lon1 = ZONES[zone]
    return (
        round((lon0 + 180) / 360 * width),
        round((90 - lat1) / 180 * height),
        round((lon1 + 180) / 360 * width),
        round((90 - lat0) / 180 * height),
    )


def crop(img: Image.Image, zone: str) -> Image.Image:
    return img.crop(pixel_box(zone, img.width, img.height))
