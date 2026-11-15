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
import { EXPLAIN, HELP, HELP_MIXER, parseCommand, voice, VOICE_SAY, type Command, type NumKey } from "./voice";
import { RECORD_INFO, recordName } from "./records";
import { TUTORIAL, TUTORIAL_SAY, type TutorialState } from "./tutorial";
import { kidDescribe, MISSIONS } from "./kids";
import { regionAt } from "./regions";
import { ZONES, zoneAt, zoneById } from "./zones";
import { Narrator } from "./narrator";
import { JukeboxEngine } from "./audio/engine";
import { getSpectrum } from "./audio/analysis";
import { describe, type MusicalFrame } from "./audio/mapping";
import { DEFAULT_CONTROLS, DEFAULT_LAYERS, energyForScenario, scenarioIndex, type Controls, type Layers, type Visualization } from "./types";
import "./App.css";

type Tab = "playing" | "news" | "stories";

const params = new URLSearchParams(location.search);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const INK = "#17233b";
const narrator = new Narrator();
const SAY = {
  off: "Narrator off.",
  onKids: "Narrator on. Point at something, or press Tab, and I will read it to you. Press R to hear it again.",
  on: "Narrator on. Move with the Tab key or the mouse and I will read what you land on. Press R to repeat, V to turn me off, and Space to play or pause the music.",
};
// What the welcome screen says by itself, in this order.
const WELCOME = [
  "Kasama for Earth.",
  "Press T for a spoken tutorial, made for people who cannot see the screen.",
  "Press V for the narrator, which reads this page aloud.",
  "Tap the space bar to play the music, or hold it down and speak to control the page with your voice.",
];
const missionToast = (m: { title: string; learned: string }) => `Mission complete: ${m.title}! ${m.learned}`;
// Phrases the narrator says that are not written on the page; pipeline/build_narrator.py records them too.
const HEARD = {
  playing: "Playing", paused: "Paused", kidsOn: "Kids mode on", kidsOff: "Normal mode", noStory: "There is no story for that yet.", stopped: "Stopped",
  dark: "Dark mode", light: "Light mode", mixerHidden: "Mixer hidden", mixerShown: "Mixer shown", panelHidden: "Panel hidden", panelShown: "Panel shown",
  nowPlaying: "Now playing", news: "News", stories: "Stories", noNews: "No headlines right now.", missionsReset: "Missions reset", muted: "muted", on: "on", solo: "solo",
  allOn: "All channels on", reset: "Mixer reset", whole: "Whole planet", followsData: "follows the data", off: "off", open: "open", closed: "closed", noSection: "That section is not on the page right now.",
};
// How each mixer control is called and read aloud, and the range a spoken amount moves it in.
const SPOKEN: Record<NumKey, { label: string; min: number; max: number; say: (v: number) => string }> = {
  energy: { label: "Energy", min: 0, max: 1, say: (v) => `${Math.round(v * 100)}%` },
  volume: { label: "Volume", min: 0, max: 1, say: (v) => `${Math.round(v * 100)}%` },
  chord: { label: "Colours", min: 0, max: 1, say: (v) => `${Math.round(v * 100)}%` },
  melody: { label: "Light", min: 0, max: 1, say: (v) => `${Math.round(v * 100)}%` },
  beat: { label: "Bright spots", min: 0, max: 1, say: (v) => `${Math.round(v * 100)}%` },
  space: { label: "Echo", min: 0, max: 1, say: (v) => `${Math.round(v * 100)}%` },
  density: { label: "Notes", min: 0, max: 1, say: (v) => `${Math.round(v * 100)}%` },
  tempo: { label: "Speed", min: 50, max: 160, say: (v) => `${Math.round(v)} beats per minute` },
  warmth: { label: "Mood", min: -1, max: 1, say: (v) => (v > 0.02 ? "major" : v < -0.02 ? "minor" : HEARD.followsData) },
  filter: { label: "Filter", min: -1, max: 1, say: (v) => (v < -0.02 ? "low-pass" : v > 0.02 ? "high-pass" : HEARD.off) },
};
const SHAPE_SAY = { sine: "Sine wave", triangle: "Triangle wave", square: "Square wave", sawtooth: "Saw wave" };
(window as unknown as { __ejExtra: string[] }).__ejExtra = [...Object.values(SAY), ...WELCOME, ...Object.values(EXPLAIN), ...Object.values(VOICE_SAY), ...Object.values(TUTORIAL_SAY), ...TUTORIAL.flatMap((t) => t.say), ...HELP, ...HELP_MIXER, ...Object.values(HEARD), ...Object.values(SHAPE_SAY), ...Object.values(SPOKEN).map((c) => c.label), "Warming since 1950",
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

  // The welcome screen speaks as soon as it appears: the name of the page, then T for the tutorial and V for the
  // narrator. Browsers only let a page make sound by itself where the visitor (or the site settings) allow it;
  // where they do not, the same words are said on the very first key press, click or touch anywhere.
  useEffect(() => {
    if (started) return;
    let armed = false;
    const first = (ev: Event) => {
      disarm();
      const key = ev instanceof KeyboardEvent ? ev.key.toLowerCase() : "";
      // A visitor who goes straight to a key or a button that does something is not interrupted.
      if (key === "t" || key === "v" || (ev.target as HTMLElement | null)?.closest?.("button, a")) return;
      narrator.say(WELCOME);
    };
    const disarm = () => {
      armed = false;
      window.removeEventListener("keydown", first, true);
      window.removeEventListener("pointerdown", first, true);
    };
    const timer = setTimeout(() => {
      // A silent sound tells whether the page may speak yet.
      const probe = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=");
      probe.volume = 0;
      probe.play().then(
        () => armed && (disarm(), narrator.say(WELCOME)),
        () => {},
      );
    }, 700); // the recorded clips are listed by then
    armed = true;
    window.addEventListener("keydown", first, true);
    window.addEventListener("pointerdown", first, true);
    return () => (clearTimeout(timer), disarm());
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

  // Keyboard: N/P = next/previous visualization. The space bar is handled with voice control, below.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
      // Narrator keys work from anywhere except fields where letters mean something.
      if (!(ev.target as HTMLElement).closest("select, textarea, input:not([type=range])")) {
        if (ev.key.toLowerCase() === "v") return toggleNarrator();
        if (ev.key.toLowerCase() === "r") return narrator.repeat();
      }
      if ((ev.target as HTMLElement).closest("input, select, textarea, button, [role=slider], summary, a")) return;
      if (ev.key === "n") selectTrack(track + 1);
      else if (ev.key === "p") selectTrack(track - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, selectTrack, track, toggleNarrator]);

  // Voice control: hold the space bar (or the Voice button), speak, let go. A short tap of the space bar still plays and pauses.
  const [listening, setListening] = useState(false);
  const [voiceCount, setVoiceCount] = useState(0); // orders given by voice (a kids mission and a tutorial step wait for one)
  const [spoken, setHeardText] = useState("");
  const runCommand = useRef<(c: Command) => void>(() => {});
  runCommand.current = (c: Command) => {
    const say = (t: string | string[]) => narrator.say(t);
    const start = async () => {
      setStarted(true);
      if (engine.current && !playing) {
        await engine.current.play();
        setPlaying(true);
      }
    };
    const name = viz ? recordName(viz) : "";
    const info = viz ? RECORD_INFO[viz.slug] : undefined;
    switch (c.do) {
      case "play":
        start();
        return say([HEARD.playing, name]);
      case "pause":
        if (playing) togglePlay();
        return say(HEARD.paused);
      case "stop":
        if (story) stopStory();
        else if (playing) togglePlay();
        return say(HEARD.stopped);
      case "next":
      case "previous": {
        const i = (track + (c.do === "next" ? 1 : -1) + catalog.length) % catalog.length;
        setTrack(i);
        start();
        return say([recordName(catalog[i]), RECORD_INFO[catalog[i].slug]?.kindLabel ?? ""]);
      }
      case "record": {
        const i = catalog.findIndex((v) => v.slug === c.slug);
        if (i < 0) return say(VOICE_SAY.unknown);
        setTrack(i);
        setTab("playing");
        start();
        return say([recordName(catalog[i]), RECORD_INFO[c.slug]?.kindLabel ?? ""]);
      }
      case "zone":
        setFocus(c.id);
        start();
        return say(c.id ? `Zone ${zoneById(c.id)?.label}` : "Back to the whole planet");
      case "story": {
        const s = STORIES.find((x) => x.id === c.id) ?? (c.id ? undefined : (STORIES.find((x) => x.record === viz?.slug) ?? STORIES[0]));
        if (!s) return say(HEARD.noStory);
        narrator.quiet();
        setTab("stories");
        setRightOpen(true);
        return void playStory(s, c.lang === "local" ? 0 : s.parts.length - 1);
      }
      case "explain":
        return say(EXPLAIN[c.topic]);
      case "explainRecord": {
        const r = RECORD_INFO[c.slug];
        return say(r ? [r.name, r.kindLabel, r.basis, `How to read it: ${r.read}`] : VOICE_SAY.unknown);
      }
      case "what":
        return say(info ? [name, info.kindLabel, info.basis] : name);
      case "read":
        return say(info ? `How to read it: ${info.read}` : name);
      case "narrator":
        setNarrating(c.on);
        return say(c.on ? SAY.on : SAY.off);
      case "kids":
        setKids(c.on);
        setTab("playing"); // same as the Kids mode switch
        setRightOpen(true);
        return say(c.on ? HEARD.kidsOn : HEARD.kidsOff);
      case "tutorial":
        return tutorialGo(c.on ? 0 : null, c.on ? undefined : TUTORIAL_SAY.left);
      case "help":
        return say(HELP);
      case "helpMixer":
        return say(HELP_MIXER);
      case "repeat":
        return narrator.repeat();
      case "where":
        return say(zone ? `Zone ${zone.label}` : HEARD.whole);
      case "theme": {
        const to = c.to === "toggle" ? (theme === "dark" ? "light" : "dark") : c.to;
        setTheme(to);
        return say(HEARD[to]);
      }
      case "panel":
        if (c.side !== "right") setLeftOpen(c.open);
        if (c.side !== "left") setRightOpen(c.open);
        return say(c.side === "left" ? (c.open ? HEARD.mixerShown : HEARD.mixerHidden) : c.open ? HEARD.panelShown : HEARD.panelHidden);
      case "tab":
        if (c.tab === "missions") {
          // The missions live on their own card in kids mode: say how many are done and which one is next.
          setKids(true);
          const next = MISSIONS.find((m) => !completed.includes(m.id));
          return say([`Missions: ${completed.length} of ${MISSIONS.length} stars`, ...(next ? [next.title, next.goal] : [])]);
        }
        setTab(c.tab);
        setRightOpen(true);
        return say( c.tab === "playing" ? HEARD.nowPlaying : c.tab === "news" ? HEARD.news : HEARD.stories);
      case "missions":
        setCompleted([]);
        return say(HEARD.missionsReset);
      case "section": {
        // The folding sections of both panels: found by their title, as a sighted visitor would.
        if (/channels|knobs|filter|wave/.test(c.name)) setLeftOpen(true);
        else (setTab("playing"), setRightOpen(true));
        const want = c.name === "filter" ? "knobs" : c.name;
        return void setTimeout(() => {
          const fold = [...document.querySelectorAll<HTMLDetailsElement>("details.fold")].find((d) => d.querySelector("summary b")?.textContent?.toLowerCase().includes(want));
          if (!fold) return say(HEARD.noSection);
          fold.open = c.open;
          say([fold.querySelector("summary b")?.textContent ?? "", c.open ? HEARD.open : HEARD.closed]);
        }, 120);
      }
      case "news": {
        setTab("news");
        setRightOpen(true);
        const region = c.zone ? news?.regions[c.zone === "arctic" ? "polar" : c.zone] : undefined;
        const items = (region ? region.items : (news?.global ?? [])).slice(0, 3);
        return say(items.length ? [region ? region.label : HEARD.news, ...items.map((i) => i.title)] : HEARD.noNews);
      }
      case "set": {
        const spec = SPOKEN[c.key];
        const span = spec.max - spec.min;
        const now = controls[c.key];
        const a = c.amount;
        let v = a.bpm !== undefined ? a.bpm : a.to !== undefined ? spec.min + a.to * span : a.by !== undefined ? now + a.by * span : now;
        v = Math.min(spec.max, Math.max(spec.min, v));
        if (c.key === "tempo") v = Math.round(v);
        if (v !== now) setControls({ ...controls, [c.key]: v });
        return say([spec.label, spec.say(v)]);
      }
      case "shape":
        setControls({ ...controls, shape: c.shape });
        return say(SHAPE_SAY[c.shape]);
      case "mute":
        setLayers({ ...layers, [c.channel]: !c.on });
        return say([SPOKEN[c.channel].label, c.on ? HEARD.muted : HEARD.on]);
      case "solo":
        setLayers({ chord: c.channel === "chord", melody: c.channel === "melody", beat: c.channel === "beat" });
        return say([SPOKEN[c.channel].label, HEARD.solo]);
      case "allChannels":
        setLayers(DEFAULT_LAYERS);
        return say(HEARD.allOn);
      case "reset":
        setControls(DEFAULT_CONTROLS);
        setLayers(DEFAULT_LAYERS);
        return say(HEARD.reset);
      case "scenario":
      case "year": {
        // Both belong to the Time Machine: go there first if another record is on.
        const i = catalog.findIndex((v) => v.scenarios);
        const machine = catalog[i];
        if (!machine?.scenarios || !machine.years) return say(VOICE_SAY.unknown);
        if (i !== track) setTrack(i);
        setTab("playing");
        start();
        if (c.do === "scenario") {
          const index = Math.min(c.index, machine.scenarios.length - 1);
          setControls({ ...controls, energy: energyForScenario(index, machine.scenarios.length) });
          return say(machine.scenarios[index].label);
        }
        const years = machine.years;
        const at = years.reduce((best, y, j) => (Math.abs(y - c.year) < Math.abs(years[best] - c.year) ? j : best), 0);
        setTimeout(() => engine.current?.seek(at), i !== track ? 400 : 0); // after the record has changed
        return say(String(years[at]));
      }
      case "frame": {
        const n = frames?.length ?? 0;
        if (!n) return say(VOICE_SAY.unknown);
        const at = c.to === "first" ? 0 : c.to === "last" ? n - 1 : c.to === "next" ? (frame + 1) % n : c.to === "previous" ? (frame - 1 + n) % n : Math.min(n, Math.max(1, c.to)) - 1;
        engine.current?.seek(at);
        const y = frames?.[at]?.year;
        return say(y !== undefined ? String(y) : `Picture ${at + 1} of ${n}`);
      }
      default:
        return say(VOICE_SAY.unknown);
    }
  };
  const tapPlay = useRef(togglePlay);
  tapPlay.current = togglePlay;
  useEffect(() => {
    let clear = 0;
    voice.onListening = (on, text) => {
      setListening(on);
      setHeardText(text);
      if (on) narrator.quiet(); // never talk over the listener
      engine.current?.duck(on || !!storyAudio.current);
      clearTimeout(clear);
      if (!on) clear = window.setTimeout(() => setHeardText(""), 5000);
    };
    voice.onHeard = (text) => (setVoiceCount((n) => n + 1), runCommand.current(parseCommand(text)));
    voice.onProblem = (problem) => {
      narrator.say(VOICE_SAY[problem]);
      setHeardText(`(${problem}) ${VOICE_SAY[problem]}`); // also on screen, so a sighted helper can see why it closed
      clearTimeout(clear);
      clear = window.setTimeout(() => setHeardText(""), 8000);
    };
    (window as unknown as { __ejVoice: (t: string) => void }).__ejVoice = (t) => (setHeardText(t), voice.onHeard(t)); // for tests: an order typed instead of spoken

    // Hold = talk, tap = play/pause. Works from anywhere on the page, also with the focus on a button.
    const HOLD = 350;
    let timer = 0;
    let down = false;
    let held = false;
    const typing = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest?.("select, textarea, input:not([type=range])");
    const control = (t: EventTarget | null) => !!(t as HTMLElement | null)?.closest?.("input, select, textarea, button, [role=slider], summary, a");
    const onDown = (ev: KeyboardEvent) => {
      if (ev.code !== "Space" || ev.metaKey || ev.ctrlKey || ev.altKey || typing(ev.target)) return;
      if (!control(ev.target) || held) ev.preventDefault(); // no page scroll; a held key must not press the button under the focus
      if (ev.repeat || down) return;
      down = true;
      timer = window.setTimeout(() => {
        held = true;
        voice.start();
      }, HOLD);
    };
    const onUp = (ev: KeyboardEvent) => {
      if (ev.code !== "Space" || !down) return;
      down = false;
      clearTimeout(timer);
      if (held) {
        held = false;
        ev.preventDefault(); // the button under the focus is not pressed
        ev.stopPropagation();
        voice.stop();
      } else if (!control(ev.target) && !typing(ev.target)) tapPlay.current();
    };
    const onBlur = () => {
      clearTimeout(timer);
      down = false;
      if (held) {
        held = false;
        voice.stop();
      }
    };
    window.addEventListener("keydown", onDown, true);
    window.addEventListener("keyup", onUp, true);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onDown, true);
      window.removeEventListener("keyup", onUp, true);
      window.removeEventListener("blur", onBlur);
      clearTimeout(timer);
      clearTimeout(clear);
    };
  }, []);

  // Spoken tutorial for blind and low-vision visitors: T starts it, Enter skips a step, Escape leaves.
  const [tutorial, setTutorial] = useState<number | null>(null);
  const tutorialNow: TutorialState = { playing, track, voice: voiceCount, zone: zone?.id ?? null, story: !!story, narrating };
  const tutorialStart = useRef(tutorialNow);
  const tutorialLive = useRef(tutorialNow);
  tutorialLive.current = tutorialNow;
  const tutorialSteps = useMemo(() => TUTORIAL.filter((t) => voice.supported || !t.needsVoice), []);
  const tutorialGo = useCallback(
    (to: number | null, why?: string) => {
      if (to !== null && to >= tutorialSteps.length) return (setTutorial(null), narrator.say(TUTORIAL_SAY.finished));
      setTutorial(to);
      if (to === null) return void (why && narrator.say(why));
      setStarted(true); // the welcome screen steps aside
      tutorialStart.current = { ...tutorialLive.current, story: false };
      const intro = to === 0 && !voice.supported ? [TUTORIAL_SAY.skipVoice] : [];
      narrator.say([...(why ? [why] : []), ...tutorialSteps[to].say.slice(0, to === 0 ? 2 : undefined), ...intro, ...(to === 0 ? tutorialSteps[0].say.slice(2) : [])]);
    },
    [tutorialSteps],
  );
  // A step that waits for something moves on by itself once the visitor has done it.
  const tutorialTimer = useRef(0);
  useEffect(() => {
    if (tutorial === null || tutorialTimer.current) return;
    if (tutorialNow.story) tutorialStart.current.story = true; // the story step ends when the story it started is over
    if (!tutorialSteps[tutorial].done?.(tutorialNow, tutorialStart.current)) return;
    // The page redraws many times a second while music plays, so the wait must survive a redraw.
    tutorialTimer.current = window.setTimeout(() => {
      tutorialTimer.current = 0;
      tutorialGo(tutorial + 1, TUTORIAL_SAY.good);
    }, 2600); // leaves room for the spoken answer to the order
  }); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      clearTimeout(tutorialTimer.current); // leaving or skipping a step cancels its pending move
      tutorialTimer.current = 0;
    },
    [tutorial],
  );
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey || (ev.target as HTMLElement).closest("select, textarea, input:not([type=range])")) return;
      if (ev.key.toLowerCase() === "t" && tutorial === null) return tutorialGo(0);
      if (tutorial === null) return;
      if (ev.key === "Escape") return tutorialGo(null, TUTORIAL_SAY.left);
      if (ev.key === "Enter" && !(ev.target as HTMLElement).closest("button, a, summary")) {
        ev.preventDefault();
        tutorialGo(tutorial + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tutorial, tutorialGo]);

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
    const state = { playing, slug: viz?.slug, controls, scenario, year: current?.year, heard: heard.length, zone: zone?.id ?? null, layers, story: !!story, voice: voiceCount };
    const won = MISSIONS.filter((m) => !completed.includes(m.id) && m.done(state));
    if (!won.length) return;
    setCompleted((c) => [...c, ...won.map((m) => m.id)]);
    setToast(missionToast(won[0]));
  }, [kids, playing, viz, controls, scenario, current, heard, completed, zone, layers, story, voiceCount]);

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
            KASAMA <span>for Earth</span>
          </h1>
        </div>
        <Ticker news={news} region={region} kids={kids} paused={reducedMotion} onOpen={() => (setTab("news"), setRightOpen(true))} />
        <button className="top-btn" role="switch" aria-checked={narrating} aria-label="Narrator: reads the page aloud. Shortcut: V" onClick={toggleNarrator}>
          Narrator <kbd aria-hidden="true">V</kbd>
          <span className="switch-track" aria-hidden="true" />
        </button>
        <button
          className={`top-btn voice-btn${listening ? " on" : ""}`}
          aria-label="Voice control: hold the space bar, or hold this button, and speak. Say help to hear what you can say."
          onPointerDown={() => voice.start()}
          onPointerUp={() => voice.stop()}
          onPointerLeave={() => voice.stop()}
          onContextMenu={(e) => e.preventDefault()}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V22h2v-3.1A7 7 0 0 0 19 12z" /></svg>
          Voice <kbd aria-hidden="true">hold Space</kbd>
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
            setTab("playing");
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
        </div>
          <button className="panel-hide" aria-label="Hide this panel" onClick={() => setRightOpen(false)}>
            Hide
          </button>
        </div>
        {tab === "news" ? (
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

      {(listening || spoken) && (
        <div className={`heard${listening ? " on" : ""}`} aria-hidden="true">
          <b>{listening ? "Listening…" : spoken.startsWith("(") ? "Voice:" : "Heard:"}</b> {spoken || (listening ? "speak, then let go" : "")}
        </div>
      )}

      {kids && started && <Missions completed={completed} onReset={() => setCompleted([])} />}

      {tutorial !== null && (
        <div className="tutorial" role="region" aria-label="Spoken tutorial">
          <p className="eyebrow">
            Spoken tutorial · step {tutorial + 1} of {tutorialSteps.length}
          </p>
          <h3>{tutorialSteps[tutorial].title}</h3>
          <p aria-hidden="true">{tutorialSteps[tutorial].say[tutorialSteps[tutorial].say.length - 1]}</p>
          <div>
            <button onClick={() => narrator.repeat()}>
              Repeat <kbd aria-hidden="true">R</kbd>
            </button>
            <button onClick={() => tutorialGo(tutorial + 1)}>
              {tutorialSteps[tutorial].done ? "Skip" : "Next"} <kbd aria-hidden="true">Enter</kbd>
            </button>
            <button onClick={() => tutorialGo(null, TUTORIAL_SAY.left)}>
              Leave <kbd aria-hidden="true">Esc</kbd>
            </button>
          </div>
        </div>
      )}

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
                togglePlay();
              }}
            >
              ★ Start in kids mode
            </button>
            <button className="cta ghost" onClick={() => tutorialGo(0)} aria-label="Spoken tutorial for blind and low-vision visitors. Shortcut: T">
              Spoken tutorial <span className="cta-note">for blind and low-vision visitors</span> <kbd aria-hidden="true">T</kbd>
            </button>
            <button className="cta ghost" role="switch" aria-checked={narrating} onClick={toggleNarrator}>
              Narrator: read the page aloud <kbd aria-hidden="true">V</kbd>
            </button>
          </div>
          <p className="keys" id="intro-keys">
            <kbd>T</kbd> spoken tutorial · <kbd>V</kbd> narrator: reads the page aloud · <kbd>Space</kbd> tap to play / pause, hold to talk · <kbd>N</kbd> <kbd>P</kbd> next / previous · works with screen readers
          </p>
        </div>
      )}
    </div>
  );
}
