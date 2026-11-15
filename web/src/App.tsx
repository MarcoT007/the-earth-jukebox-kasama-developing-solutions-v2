import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Globe, { BASE_TEXTURE } from "./components/Globe";
import Modulator from "./components/Modulator";
import NowPlaying from "./components/NowPlaying";
import Dock from "./components/Dock";
import Missions from "./components/Missions";
import News, { type NewsData } from "./components/News";
import Ticker from "./components/Ticker";
import Stories, { StoryCaptions } from "./components/Stories";
import { STORIES, type Story } from "./stories";
import { kidDescribe, MISSIONS } from "./kids";
import { regionAt } from "./regions";
import { ZONES, zoneAt, zoneById } from "./zones";
import { Narrator } from "./narrator";
import { JukeboxEngine } from "./audio/engine";
import { getSpectrum } from "./audio/analysis";
import { describe, type MusicalFrame } from "./audio/mapping";
import { DEFAULT_CONTROLS, DEFAULT_LAYERS, energyForScenario, scenarioIndex, type Controls, type Layers, type Visualization } from "./types";
import "./App.css";

type Tab = "playing" | "news" | "stories" | "missions";

const params = new URLSearchParams(location.search);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const INK = "#17233b";
const narrator = new Narrator();
const SAY = {
  off: "Narrator off.",
  onKids: "Narrator on. Point at something, or press Tab, and I will read it to you. Press R to hear it again.",
  on: "Narrator on. Move with the Tab key or the mouse and I will read what you land on. Press R to repeat, V to turn me off, and Space to play or pause the music.",
  hint: "Earth Jukebox. Press V to turn on the narrator, which reads this page aloud. Press Space to play the music.",
};
const missionToast = (m: { title: string; learned: string }) => `Mission complete: ${m.title}! ${m.learned}`;
// Phrases the narrator says that are not written on the page; pipeline/build_narrator.py records them too.
(window as unknown as { __ejExtra: string[] }).__ejExtra = [...Object.values(SAY), "Warming since 1950",
  ...["major", "minor", "low-pass", "high-pass", "Back to the whole planet"],
  ...MISSIONS.map((_, i) => `Missions: ${i} of ${MISSIONS.length} stars`),
  `Missions: ${MISSIONS.length} of ${MISSIONS.length} stars`,
  ...ZONES.flatMap((z) => [z.label, `Zone ${z.label}`, `Focus on what I see: ${z.label}`]), ...MISSIONS.map(missionToast)];
const PANEL_LEFT = 316; // px the open panels cover on each side of the stage
const PANEL_RIGHT = 316;
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
  const [layers, setLayers] = useState<Layers>(DEFAULT_LAYERS);
  const [kids, setKids] = useState(() => params.has("kids") || localStorage.getItem("ej2-kids") === "1");
  const [completed, setCompleted] = useState<string[]>(() => JSON.parse(localStorage.getItem("ej2-missions") ?? "[]"));
  const [heard, setHeard] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const [tab, setTab] = useState<Tab>(() => (params.get("tab") === "news" ? "news" : params.get("tab") === "stories" ? "stories" : "playing"));
  const [region, setRegion] = useState<string | null>(null);
  const [inView, setInView] = useState<string | null>(null); // zone facing the viewer
  const [focus, setFocus] = useState<string | null>(() => params.get("zone")); // zone the music is limited to, or null for the whole planet
  const [theme, setTheme] = useState<"light" | "dark">(() => (params.get("theme") ?? localStorage.getItem("ej2-theme")) === "dark" ? "dark" : "light");
  const [narrating, setNarrating] = useState(() => localStorage.getItem("ej2-narrator") === "1");
  const [width, setWidth] = useState(() => window.innerWidth);
  const [leftOpen, setLeftOpen] = useState(true);
  // On mid-sized screens both panels would crowd the planet, so the right one starts folded.
  const [rightOpen, setRightOpen] = useState(() => true);
  const engine = useRef<JukeboxEngine | null>(null);
  const frameRef = useRef(0);
  const lastSlug = useRef<string | undefined>(undefined);

  // The globe reports which point faces the viewer (about twice a second).
  const onView = useCallback((lat: number, lon: number) => {
    setRegion(regionAt(lat, lon));
    setInView(zoneAt(lat, lon)?.id ?? null);
  }, []);

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
  const whole = viz?.scenarios ? viz.scenarios[scenario].frames : viz?.frames;
  // Focus: the music reads only one zone of the map. Only map-shaped records carry data per zone.
  const zone = whole?.[0]?.zones?.[focus ?? ""] ? zoneById(focus) : null;
  const frames = useMemo(() => (zone && whole ? whole.map((f) => ({ ...f, ...f.zones?.[zone.id] })) : whole), [whole, zone]);

  useEffect(() => {
    if (!frames || !viz) return;
    // Changing scenario keeps the current year; changing record starts from the beginning.
    engine.current?.setFrames(frames, lastSlug.current === viz.slug ? frameRef.current : 0);
    lastSlug.current = viz.slug;
  }, [frames, viz]);

  useEffect(() => {
    engine.current?.setControls(controls);
  }, [controls]);

  useEffect(() => {
    engine.current?.setLayers(layers);
  }, [layers]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("ej2-theme", theme);
  }, [theme]);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Narrator: follows mouse and keyboard; the music steps back while it speaks.
  useEffect(() => {
    narrator.simple = kids;
    narrator.onSpeaking = (on) => engine.current?.duck(on || !!storyAudio.current); // a story keeps the music low
    narrator.setEnabled(narrating);
    localStorage.setItem("ej2-narrator", narrating ? "1" : "0");
  }, [narrating, kids]);

  const toggleNarrator = useCallback(() => {
    setNarrating((on) => {
      narrator.say(
        on
          ? SAY.off
          : kids
            ? SAY.onKids
            : SAY.on,
      );
      return !on;
    });
  }, [kids]);

  // A page cannot speak before the first key press (a browser rule). So the first key a visitor presses
  // gets a spoken hint about the narrator, unless that key already turns it on.
  useEffect(() => {
    if (narrating) return;
    const hint = (ev: KeyboardEvent) => {
      window.removeEventListener("keydown", hint, true);
      if (ev.key.toLowerCase() !== "v") narrator.say(SAY.hint);
    };
    window.addEventListener("keydown", hint, true);
    return () => window.removeEventListener("keydown", hint, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = useCallback(async () => {
    if (!engine.current) return;
    if (playing) engine.current.pause();
    else await engine.current.play();
    setPlaying(!playing);
    setStarted(true);
  }, [playing]);

  // Voiced stories: the planet turns to the place, its record plays quietly underneath, and the clip of the chosen language plays.
  const [story, setStory] = useState<{ story: Story; part: number } | null>(null);
  const storyAudio = useRef<HTMLAudioElement | null>(null);
  const getStoryAudio = useCallback(() => storyAudio.current, []);
  const stopStory = useCallback(() => {
    if (storyAudio.current) {
      storyAudio.current.onended = null;
      storyAudio.current.pause();
      storyAudio.current = null;
    }
    engine.current?.duck(false);
    setStory(null);
  }, []);
  const playStory = useCallback(
    async (s: Story, part: number) => {
      stopStory();
      const i = catalog.findIndex((v) => v.slug === s.record); // each story plays over the record its last line talks about
      if (i >= 0) setTrack(i);
      setFocus(s.zone);
      setStarted(true);
      if (engine.current && !playing) {
        await engine.current.play();
        setPlaying(true);
      }
      // One language per press: the clip of the chosen part plays alone, then the music comes back up.
      const a = new Audio(s.parts[part].audio);
      storyAudio.current = a;
      a.onended = stopStory;
      a.onerror = stopStory;
      engine.current?.duck(true);
      setStory({ story: s, part });
      a.play().catch(stopStory);
    },
    [catalog, playing, stopStory],
  );
  useEffect(() => stopStory, [stopStory]);

  const selectTrack = useCallback((i: number) => catalog.length && setTrack((i + catalog.length) % catalog.length), [catalog.length]);

  // Keyboard: space = play/pause, N/P = next/previous visualization.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      // Narrator keys work from anywhere except fields where letters mean something.
      if (!(ev.target as HTMLElement).closest("select, textarea, input:not([type=range])")) {
        if (ev.key.toLowerCase() === "v") return toggleNarrator();
        if (ev.key.toLowerCase() === "r") return narrator.repeat();
      }
      if ((ev.target as HTMLElement).closest("input, select, textarea, button, [role=slider], summary, a")) return;
      if (ev.code === "Space") {
        ev.preventDefault();
        togglePlay();
      } else if (ev.key === "n") selectTrack(track + 1);
      else if (ev.key === "p") selectTrack(track - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, selectTrack, track, toggleNarrator]);

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
    setToast(missionToast(won[0]));
  }, [kids, playing, viz, controls, scenario, current, heard, completed]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  const textureUrl = viz?.projection === "equirect" && current ? current.src : BASE_TEXTURE;
  const level = useCallback(() => engine.current?.level() ?? 0, []);
  const step = useCallback(() => engine.current?.currentStep() ?? 0, []);
  const levels = useCallback(() => engine.current?.levels() ?? [0, 0, 0, 0], []);
  // Sound -> planet: the piece of the map that is singing right now (only when the map is wrapped on the globe).
  const cellState = useRef({ music, playing, on: false });
  cellState.current = { music, playing, on: layers.melody && viz?.projection === "equirect" };
  const cell = useCallback(() => {
    const { music: m, playing: p, on } = cellState.current;
    const s = engine.current?.currentStep() ?? 0;
    return on && p && m && m.melody[s] ? { col: s, row: m.rows[s] } : null;
  }, []);

  // Narrator: pointing at the planet says which zone is under the mouse, with its warming in the time machine.
  const hoverState = useRef({ whole, frame });
  hoverState.current = { whole, frame };
  const onHoverZone = useCallback((id: string | null) => {
    const z = zoneById(id);
    if (!z || !narrator.enabled) return;
    const heat = hoverState.current.whole?.[hoverState.current.frame]?.zones?.[z.id]?.heat;
    narrator.sayLater(heat === undefined ? [z.label] : [z.label, "Warming since 1950", `${Math.round(heat * 100)} of 100`]);
  }, []);

  useEffect(() => {
    if (toast && narrator.enabled) narrator.say(toast);
  }, [toast]);

  const stacked = width <= 1040;
  const sides: [number, number] = stacked ? [0, 0] : [leftOpen ? PANEL_LEFT : 0, rightOpen ? PANEL_RIGHT : 0];

  let description = "";
  if (current && music) {
    if (kids) description = kidDescribe(current, music);
    else if (active && current.year !== undefined)
      description = `Year ${current.year}, ${active.label.toLowerCase()} scenario (${active.code}). ${zone ? `Warming of ${zone.label} since 1950:` : "Land heat index"} ${Math.round((current.heat ?? 0) * 100)} of 100. Playing in ${NOTE_NAMES[music.root]} ${music.mode}: the pitch rises and the harmony gets tenser as the land heats up.`;
    else description = describe(current, music);
  }

  const energyMeaning = active
    ? kids
      ? `Wave height = pollution: ${active.label.replace(" emissions", "")}`
      : `The planet shows ${active.label.toLowerCase()} (${active.code}).`
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
          cell={cell}
          melody={layers.melody ? (music?.melody ?? []) : []}
          playing={playing}
          zone={zone}
          accent={theme === "dark" ? "#c9d6f2" : INK}
          sides={sides}
          onHoverZone={onHoverZone}
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
        <Ticker news={news} region={region} kids={kids} paused={reducedMotion} onOpen={() => (setTab("news"), setRightOpen(true))} />
        <button className="top-btn" role="switch" aria-checked={narrating} aria-label="Narrator: reads the page aloud. Shortcut: V" onClick={toggleNarrator}>
          Narrator <kbd aria-hidden="true">V</kbd>
          <span className="switch-track" aria-hidden="true" />
        </button>
        <button className="top-btn" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`} onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span> {theme === "dark" ? "Light" : "Dark"}
        </button>
        <button
          className="kids-toggle"
          role="switch"
          aria-checked={kids}
          onClick={() => {
            setKids(!kids);
            setTab(kids ? "playing" : "missions");
            setRightOpen(true);
          }}
        >
          <span aria-hidden="true">★</span> Kids mode
          <span className="switch-track" aria-hidden="true" />
        </button>
      </header>

      {!leftOpen && (
        <button className="panel-show left" onClick={() => setLeftOpen(true)}>
          {kids ? "Sound machine" : "Mixer"} ›
        </button>
      )}
      {!rightOpen && (
        <button className="panel-show right" onClick={() => setRightOpen(true)}>
          ‹ Now playing, news &amp; stories
        </button>
      )}
      <aside className="panel card left" aria-label="Mixer" hidden={!leftOpen}>
        <Modulator
          key={theme}
          onHide={() => setLeftOpen(false)}
          controls={controls}
          onChange={setControls}
          layers={layers}
          onLayers={setLayers}
          levels={levels}
          music={music}
          kids={kids}
          energyMeaning={energyMeaning}
          value={active ? active.label.replace(" emissions", "") : `${Math.round(controls.energy * 100)}%`}
          ends={active && viz?.scenarios ? [viz.scenarios[0].label, viz.scenarios[viz.scenarios.length - 1].label] : null}
        />
      </aside>

      <aside className="panel card right" aria-label="Now playing, news and missions" hidden={!rightOpen}>
        <div className="panel-head">
        <div className="tabs" role="tablist">
          <button role="tab" className="t-playing" aria-selected={tab === "playing"} onClick={() => setTab("playing")}>
            ♪ Playing
          </button>
          <button role="tab" className="t-news" aria-selected={tab === "news"} onClick={() => setTab("news")}>
            <span className="dot" aria-hidden="true" /> News
          </button>
          <button role="tab" className="t-stories" aria-selected={tab === "stories"} onClick={() => setTab("stories")}>
            Stories
          </button>
          {kids && (
            <button role="tab" className="t-missions" aria-label={`Missions: ${completed.length} of ${MISSIONS.length} stars`} aria-selected={tab === "missions"} onClick={() => setTab("missions")}>
              ★ {completed.length}/{MISSIONS.length}
            </button>
          )}
        </div>
          <button className="panel-hide" aria-label="Hide this panel" onClick={() => setRightOpen(false)}>
            Hide
          </button>
        </div>
        {kids && tab === "missions" ? (
          <Missions completed={completed} onReset={() => setCompleted([])} />
        ) : tab === "news" ? (
          <News data={news} regionInView={region} kids={kids} />
        ) : tab === "stories" ? (
          <Stories stories={STORIES} playing={story ? { id: story.story.id, part: story.part } : null} onPlay={playStory} onStop={stopStory} />
        ) : (
          <NowPlaying
            viz={viz}
            frame={frame}
            scenario={scenario}
            kids={kids}
            onSeek={(i) => engine.current?.seek(i)}
            onScenario={(i) => setControls((c) => ({ ...c, energy: energyForScenario(i, viz?.scenarios?.length) }))}
            description={description}
            frames={frames}
            zone={zone}
            focus={focus}
            inView={inView}
            onFocus={setFocus}
            music={music}
            layers={layers}
            step={step}
            playing={playing}
          />
        )}
      </aside>

      <div className="toast" role="status" aria-live="polite">
        {toast && <span>★ {toast}</span>}
      </div>

      {story && <StoryCaptions story={story.story} part={story.part} audio={getStoryAudio} onStop={stopStory} />}

      <Dock catalog={catalog} track={track} playing={playing} onSelect={selectTrack} onToggle={togglePlay} />

      <footer className="credits">
        Imagery and data: NASA Scientific Visualization Studio, NEX-GDDP-CMIP6 &amp; GIBS; CO₂ map: Copernicus Atmosphere Monitoring Service. Independent Space Apps project, not endorsed by NASA.
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
            <button className="cta" onClick={togglePlay} autoFocus aria-describedby="intro-keys">
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
            <button className="cta ghost" role="switch" aria-checked={narrating} onClick={toggleNarrator}>
              Narrator: read the page aloud <kbd aria-hidden="true">V</kbd>
            </button>
          </div>
          <p className="keys" id="intro-keys">
            <kbd>V</kbd> narrator: reads the page aloud · <kbd>Space</kbd> play / pause · <kbd>N</kbd> <kbd>P</kbd> next / previous · works with screen readers
          </p>
        </div>
      )}
    </div>
  );
}
