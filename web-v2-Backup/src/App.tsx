import { useCallback, useEffect, useRef, useState } from "react";
import Globe, { BASE_TEXTURE } from "./components/Globe";
import Modulator from "./components/Modulator";
import NowPlaying from "./components/NowPlaying";
import Dock from "./components/Dock";
import Missions from "./components/Missions";
import News, { type NewsData } from "./components/News";
import Ticker from "./components/Ticker";
import { kidDescribe, MISSIONS } from "./kids";
import { regionAt } from "./regions";
import { JukeboxEngine } from "./audio/engine";
import { getSpectrum } from "./audio/analysis";
import { describe, type MusicalFrame } from "./audio/mapping";
import { DEFAULT_CONTROLS, energyForScenario, scenarioIndex, type Controls, type Visualization } from "./types";
import "./App.css";

type Tab = "playing" | "news" | "missions";

const params = new URLSearchParams(location.search);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const INK = "#17233b";
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export default function App() {
  const [catalog, setCatalog] = useState<Visualization[]>([]);
  const [news, setNews] = useState<NewsData | null>(null);
  const [track, setTrack] = useState(0);
  const [frame, setFrame] = useState(0);
  const [music, setMusic] = useState<MusicalFrame | null>(null);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(() => params.has("nointro"));
  const [controls, setControls] = useState<Controls>(DEFAULT_CONTROLS);
  const [kids, setKids] = useState(() => params.has("kids") || localStorage.getItem("ej2-kids") === "1");
  const [completed, setCompleted] = useState<string[]>(() => JSON.parse(localStorage.getItem("ej2-missions") ?? "[]"));
  const [heard, setHeard] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [tab, setTab] = useState<Tab>(() => (params.get("tab") === "news" ? "news" : "playing"));
  const [region, setRegion] = useState<string | null>(null);
  const engine = useRef<JukeboxEngine | null>(null);
  const frameRef = useRef(0);
  const lastSlug = useRef<string | undefined>(undefined);

  // The globe reports which point faces the viewer (about twice a second).
  const onView = useCallback((lat: number, lon: number) => setRegion(regionAt(lat, lon)), []);

  useEffect(() => {
    const json = (url: string) => fetch(url).then((r) => r.json());
    // The climate time machine is the first record; the EIC visualizations follow.
    Promise.all([json("data/time-machine.json").catch(() => null), json("data/catalog.json").catch(() => [])]).then(([machine, rest]) =>
      setCatalog(machine ? [machine, ...rest] : rest),
    );
    json("data/news.json")
      .then(setNews)
      .catch(() => setNews({ updated: "", global: [], regions: {} }));
  }, []);

  useEffect(() => {
    const e = new JukeboxEngine(DEFAULT_CONTROLS);
    e.onFrame((i, m) => {
      frameRef.current = i;
      setFrame(i);
      setMusic(m);
    });
    engine.current = e;
    return () => e.dispose();
  }, []);

  // In the time machine, the height of the wave (energy) selects the emissions scenario.
  const viz = catalog[track];
  const scenario = viz?.scenarios ? scenarioIndex(controls.energy, viz.scenarios.length) : 0;
  const frames = viz?.scenarios ? viz.scenarios[scenario].frames : viz?.frames;

  useEffect(() => {
    if (!frames || !viz) return;
    // Changing scenario keeps the current year; changing record starts from the beginning.
    engine.current?.setFrames(frames, lastSlug.current === viz.slug ? frameRef.current : 0);
    lastSlug.current = viz.slug;
  }, [frames, viz]);

  useEffect(() => {
    engine.current?.setControls(controls);
  }, [controls]);

  const togglePlay = useCallback(async () => {
    if (!engine.current) return;
    if (playing) engine.current.pause();
    else await engine.current.play();
    setPlaying(!playing);
    setStarted(true);
  }, [playing]);

  const selectTrack = useCallback((i: number) => catalog.length && setTrack((i + catalog.length) % catalog.length), [catalog.length]);

  // Keyboard: space = play/pause, N/P = next/previous visualization.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if ((ev.target as HTMLElement).closest("input, select, textarea, button, [role=slider], summary, a")) return;
      if (ev.code === "Space") {
        ev.preventDefault();
        togglePlay();
      } else if (ev.key === "n") selectTrack(track + 1);
      else if (ev.key === "p") selectTrack(track - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, selectTrack, track]);

  const current = frames?.[frame];
  const active = viz?.scenarios?.[scenario];

  useEffect(() => localStorage.setItem("ej2-kids", kids ? "1" : "0"), [kids]);
  useEffect(() => localStorage.setItem("ej2-missions", JSON.stringify(completed)), [completed]);

  // Remember which records were played (for the "Sound explorer" mission).
  useEffect(() => {
    if (playing && viz) setHeard((h) => (h.includes(viz.slug) ? h : [...h, viz.slug]));
  }, [playing, viz]);

  // Kids mode: check the missions whenever something changes.
  useEffect(() => {
    if (!kids) return;
    const state = { playing, slug: viz?.slug, controls, scenario, year: current?.year, heard: heard.length };
    const won = MISSIONS.filter((m) => !completed.includes(m.id) && m.done(state));
    if (!won.length) return;
    setCompleted((c) => [...c, ...won.map((m) => m.id)]);
    setToast(`Mission complete: ${won[0].title}! ${won[0].learned}`);
  }, [kids, playing, viz, controls, scenario, current, heard, completed]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const textureUrl = viz?.projection === "equirect" && current ? current.src : BASE_TEXTURE;
  const level = useCallback(() => engine.current?.level() ?? 0, []);
  const step = useCallback(() => engine.current?.currentStep() ?? 0, []);

  let description = "";
  if (current && music) {
    if (kids) description = kidDescribe(current, music);
    else if (active && current.year !== undefined)
      description = `Year ${current.year}, ${active.label.toLowerCase()} scenario (${active.code}). Land heat index ${Math.round((current.heat ?? 0) * 100)} of 100. Playing in ${NOTE_NAMES[music.root]} ${music.mode}: the pitch rises and the harmony gets tenser as the land heats up.`;
    else description = describe(current, music);
  }

  const energyMeaning = active
    ? kids
      ? `Wave height = pollution: ${active.label.replace(" emissions", "")}`
      : `Energy ${Math.round(controls.energy * 100)}% = ${active.label} (${active.code})`
    : kids
      ? "A taller wave makes the music stronger and the planet glow."
      : "Energy drives the intensity of the sound and the planet's glow. Play the Time Machine to change the climate itself.";

  return (
    <div className={`app${kids ? " kids" : ""}`}>
      <div className="stage">
        <Globe
          textureUrl={textureUrl}
          controls={controls}
          energy={music?.energy ?? 0}
          level={level}
          spectrum={getSpectrum}
          step={step}
          melody={music?.melody ?? []}
          playing={playing}
          accent={INK}
          reducedMotion={reducedMotion}
          onView={onView}
        />
      </div>

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <h1>
            Earth <span>Jukebox</span>
          </h1>
        </div>
        <Ticker news={news} region={region} kids={kids} paused={reducedMotion} onOpen={() => setTab("news")} />
        <button
          className="kids-toggle"
          role="switch"
          aria-checked={kids}
          onClick={() => {
            setKids(!kids);
            setTab(kids ? "playing" : "missions");
          }}
        >
          <span aria-hidden="true">★</span> Kids mode
          <span className="switch-track" aria-hidden="true" />
        </button>
      </header>

      <aside className="panel card left" aria-label="Sound modulator">
        <Modulator controls={controls} onChange={setControls} music={music} kids={kids} energyMeaning={energyMeaning} />
      </aside>

      <aside className="panel card right" aria-label="Now playing, news and missions">
        <div className="tabs" role="tablist">
          <button role="tab" className="t-playing" aria-selected={tab === "playing"} onClick={() => setTab("playing")}>
            ♪ Playing
          </button>
          <button role="tab" className="t-news" aria-selected={tab === "news"} onClick={() => setTab("news")}>
            <span className="dot" aria-hidden="true" /> News
          </button>
          {kids && (
            <button role="tab" className="t-missions" aria-selected={tab === "missions"} onClick={() => setTab("missions")}>
              ★ Missions {completed.length}/{MISSIONS.length}
            </button>
          )}
        </div>
        {kids && tab === "missions" ? (
          <Missions completed={completed} onReset={() => setCompleted([])} />
        ) : tab === "news" ? (
          <News data={news} regionInView={region} kids={kids} />
        ) : (
          <NowPlaying
            viz={viz}
            frame={frame}
            scenario={scenario}
            kids={kids}
            onSeek={(i) => engine.current?.seek(i)}
            onScenario={(i) => setControls((c) => ({ ...c, energy: energyForScenario(i, viz?.scenarios?.length) }))}
            description={description}
          />
        )}
      </aside>

      <div className="toast" role="status" aria-live="polite">
        {toast && <span>★ {toast}</span>}
      </div>

      <Dock catalog={catalog} track={track} playing={playing} onSelect={selectTrack} onToggle={togglePlay} />

      <footer className="credits">
        Imagery and data: NASA Scientific Visualization Studio, NEX-GDDP-CMIP6 &amp; GIBS. Independent Space Apps project, not endorsed by NASA.
      </footer>

      {!started && (
        <div className="intro" role="dialog" aria-modal="true" aria-labelledby="intro-title">
          <p className="eyebrow">NASA Space Apps Challenge 2026 · The Earth Information Jukebox</p>
          <h2 id="intro-title">
            What does our planet <em>sound</em> like?
          </h2>
          <p>
            NASA’s views of Earth become music you can play. Grab the wave, change its energy, and hear and see how the climate could change from 1950 to
            2100.
          </p>
          <div className="intro-actions">
            <button className="cta" onClick={togglePlay} autoFocus>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z" /></svg>
              Press play to hear the Earth
            </button>
            <button
              className="cta alt"
              onClick={() => {
                setKids(true);
                setTab("missions");
                togglePlay();
              }}
            >
              ★ Start in kids mode
            </button>
          </div>
          <p className="keys">
            <kbd>Space</kbd> play / pause · <kbd>N</kbd> <kbd>P</kbd> next / previous · works with screen readers
          </p>
        </div>
      )}
    </div>
  );
}
