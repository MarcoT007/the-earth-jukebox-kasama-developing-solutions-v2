"""Records the narrator's fixed phrases with an ElevenLabs voice, once, as static MP3 files.

The site is static and public, so it cannot hold an API key: the clips are made here and shipped
in web/public/narrator. The page looks a phrase up in index.json and plays its clip; anything
without a clip (news headlines, tempo, frame numbers) is read by the browser's own voice.

    python pipeline/build_narrator.py            # record what is missing
    python pipeline/build_narrator.py --dry-run  # only count characters

The key is read from ~/.elevenlabs_key (never stored in the repository).
Phrases come from pipeline/narrator_phrases.json, collected from the running page (window.__ejHarvest).
"""
import argparse, hashlib, json, re, sys, time, urllib.error, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "web" / "public" / "narrator"
VOICE = "zs057lc0shdaAFXkm2Fm"  # "Patrick", chosen by the team
MODEL = "eleven_multilingual_v2"


def clip_key(text: str) -> str:
    """Must match clipKey() in web/src/narrator.ts."""
    return re.sub(r"[.!]+$", "", re.sub(r"\s+", " ", text).strip()).lower()


def spoken(text: str) -> str:
    """What the voice actually reads: no decorative symbols, units in words."""
    text = re.sub(r"[★☆✓♪›‹☀☾]", " ", text).replace("·", ",").replace("&", "and").replace("→", "to").replace(" / ", " or ")
    if text.isupper() and len(text) > 12:  # headings styled in capitals are not acronyms
        text = " ".join(w if w == "NASA" else w.capitalize() for w in text.split())
    text = re.sub(r"(\d)\s*%", r"\1 percent", text)
    return re.sub(r"\s+", " ", text).strip()


def phrases() -> list[str]:
    fixed = json.loads((Path(__file__).parent / "narrator_phrases.json").read_text())
    values = [f"{n}%" for n in range(101)] + [f"{n} of 100" for n in range(101)] + [str(y) for y in range(1950, 2101, 5)]
    return fixed + values


def record(text: str, key: str) -> bytes:
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_64",
        data=json.dumps({"text": text, "model_id": MODEL, "voice_settings": {"stability": 0.55, "similarity_boost": 0.75}}).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "audio/mpeg"},
    )
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503) or attempt == 3:
                sys.exit(f"ElevenLabs said {e.code}: {e.read().decode()[:300]}")
            time.sleep(3 * (attempt + 1))
    raise RuntimeError("unreachable")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--only", type=int, default=0, help="record at most this many new clips")
    args = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    index_path = OUT / "index.json"
    index: dict[str, str] = json.loads(index_path.read_text()) if index_path.exists() else {}
    todo: dict[str, str] = {}
    for p in phrases():
        k = clip_key(p)
        if k and re.search(r"[a-z0-9]", k) and not (k in index and (OUT / index[k]).exists()):
            todo.setdefault(k, spoken(p))
    chars = sum(len(t) for t in todo.values())
    print(f"{len(index)} clips ready, {len(todo)} to record, {chars} characters")
    if args.dry_run or not todo:
        return
    key = (Path.home() / ".elevenlabs_key").read_text().strip()
    for n, (k, text) in enumerate(todo.items(), 1):
        if args.only and n > args.only:
            break
        name = hashlib.sha1(k.encode()).hexdigest()[:12] + ".mp3"
        (OUT / name).write_bytes(record(text, key))
        index[k] = name
        index_path.write_text(json.dumps(dict(sorted(index.items())), ensure_ascii=False, indent=0))
        print(f"{n}/{len(todo)} {text[:70]}", flush=True)


if __name__ == "__main__":
    main()
