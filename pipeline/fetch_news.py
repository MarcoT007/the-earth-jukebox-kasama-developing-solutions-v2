"""
Fetches climate / Earth-science headlines and writes web/public/data/news.json.

Runs in GitHub Actions on a schedule (see .github/workflows/deploy.yml), so the
web app never calls a news service live: if a source is down, the previously
saved headlines are kept. Standard library only.

    python3 pipeline/fetch_news.py
"""

from __future__ import annotations

import json
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "web" / "public" / "data" / "news.json"
UA = {"User-Agent": "Mozilla/5.0 (compatible; earth-jukebox/0.1)"}

# Global tab: NASA only (also the only source shown in kids mode).
NASA_FEEDS = [
    ("NASA Earth Observatory", "https://earthobservatory.nasa.gov/feeds/earth-observatory.rss"),
]

# Regional tab: region id -> (label, search terms). Ids must match web/src/regions.ts.
REGIONS = {
    "north-america": ("North America", '("United States" OR Canada)'),
    "central-america": ("Mexico, Central America & Caribbean", '(Mexico OR "Central America" OR Caribbean)'),
    "south-america": ("South America", '(Brazil OR Amazon OR Argentina OR Colombia OR Chile OR Peru)'),
    "europe": ("Europe", "(Europe OR European)"),
    "africa": ("Africa", "(Africa OR African)"),
    "middle-east": ("Middle East", '("Middle East" OR Gulf OR Iran OR Turkey OR Egypt)'),
    "south-asia": ("South Asia", "(India OR Pakistan OR Bangladesh)"),
    "east-asia": ("East Asia", '(China OR Japan OR "South Korea")'),
    "southeast-asia": ("Southeast Asia", '(Indonesia OR Philippines OR Vietnam OR Thailand OR "Southeast Asia")'),
    "oceania": ("Australia & Pacific", '(Australia OR "New Zealand" OR "Pacific Islands")'),
    "polar": ("Arctic & Antarctica", "(Arctic OR Antarctica OR Greenland)"),
}


def get(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return r.read()


def parse_rss(raw: bytes, default_source: str, limit: int) -> list[dict]:
    text = raw.decode("utf-8", "replace")
    text = re.sub(r'"(xmlns:)', r'" \1', text)  # NASA feeds miss a space between attributes
    items = []
    for it in ET.fromstring(text).iter("item"):
        title = (it.findtext("title") or "").strip()
        link = (it.findtext("link") or "").strip()
        if not title or not link.startswith("http"):
            continue
        source = (it.findtext("source") or default_source).strip()
        if title.endswith(f" - {source}"):  # Google News appends the outlet to the title
            title = title[: -len(source) - 3]
        try:
            date = parsedate_to_datetime(it.findtext("pubDate") or "").astimezone(timezone.utc).isoformat()
        except (TypeError, ValueError):
            date = ""
        items.append({"title": title, "url": link, "source": source, "date": date})
    items.sort(key=lambda i: i["date"], reverse=True)
    return items[:limit]


def main() -> None:
    old = json.loads(OUT.read_text()) if OUT.exists() else {"global": [], "regions": {}}

    world: list[dict] = []
    for name, url in NASA_FEEDS:
        try:
            world += parse_rss(get(url), name, 8)
        except Exception as exc:
            print(f"!! {name}: {exc}")
    world.sort(key=lambda i: i["date"], reverse=True)

    regions = {}
    for rid, (label, terms) in REGIONS.items():
        query = urllib.parse.quote(f'"climate change" {terms} when:7d')
        url = f"https://news.google.com/rss/search?q={query}&hl=en-US&gl=US&ceid=US:en"
        try:
            items = parse_rss(get(url), "Google News", 8)
        except Exception as exc:
            print(f"!! {rid}: {exc}")
            items = []
        # keep the previous headlines if a source fails or returns nothing
        regions[rid] = {"label": label, "items": items or old.get("regions", {}).get(rid, {}).get("items", [])}
        print(f"{rid}: {len(regions[rid]['items'])}")
        time.sleep(1)

    data = {
        "updated": datetime.now(timezone.utc).isoformat(timespec="minutes"),
        "global": world[:12] or old.get("global", []),
        "regions": regions,
    }
    OUT.write_text(json.dumps(data, indent=1, ensure_ascii=False))
    print(f"global: {len(data['global'])} -> {OUT}")


if __name__ == "__main__":
    main()
