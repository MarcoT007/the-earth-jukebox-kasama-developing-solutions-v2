/**
 * Voice control: hold the space bar (or the Voice button) and speak; let go and the order runs.
 * There is no mode to switch on, so the microphone is only ever open while the key is held, and a
 * rising or falling tone says so without needing the screen.
 *
 * Speech is recognised by the browser (Web Speech API): it works in Chrome and Edge, needs a
 * connection, and is not available in every browser. Where it is missing the page says so aloud.
 */
import { RECORD_INFO } from "./records";
import { STORIES } from "./stories";
import { ZONES } from "./zones";

export type NumKey = "energy" | "volume" | "chord" | "melody" | "beat" | "tempo" | "space" | "density" | "warmth" | "filter";
export type Channel = "chord" | "melody" | "beat";
/** How far to move a control: `to` is a position from 0 (lowest) to 1 (highest), `by` a step, `bpm` an exact tempo. None of them: just say the value. */
export interface Amount {
  to?: number;
  by?: number;
  bpm?: number;
}

export type Command =
  | { do: "play" }
  | { do: "pause" }
  | { do: "stop" }
  | { do: "next" }
  | { do: "previous" }
  | { do: "record"; slug: string }
  | { do: "zone"; id: string | null }
  | { do: "where" }
  | { do: "story"; id: string | null; lang: "local" | "english" }
  | { do: "news"; zone: string | null }
  | { do: "what" }
  | { do: "explain"; topic: Topic }
  | { do: "explainRecord"; slug: string }
  | { do: "read" }
  | { do: "repeat" }
  | { do: "narrator"; on: boolean }
  | { do: "kids"; on: boolean }
  | { do: "theme"; to: "dark" | "light" | "toggle" }
  | { do: "panel"; side: "left" | "right" | "both"; open: boolean }
  | { do: "tab"; tab: "playing" | "news" | "stories" | "missions" }
  | { do: "section"; name: string; open: boolean }
  | { do: "missions"; reset: boolean }
  | { do: "set"; key: NumKey; amount: Amount }
  | { do: "shape"; shape: "sine" | "triangle" | "square" | "sawtooth" }
  | { do: "mute"; channel: Channel; on: boolean }
  | { do: "solo"; channel: Channel }
  | { do: "allChannels" }
  | { do: "reset" }
  | { do: "scenario"; index: number }
  | { do: "year"; year: number }
  | { do: "frame"; to: number | "first" | "last" | "next" | "previous" }
  | { do: "tutorial"; on: boolean }
  | { do: "help" }
  | { do: "helpMixer" }
  | { do: "unknown"; heard: string };

/** What each part of the page is, for "what is the mixer?" and the like. Kept true to what the page really does. */
export const EXPLAIN = {
  page: "Kasama for Earth turns maps of the Earth, made by NASA and other space agencies, into music, so the planet can be heard and not only seen.",
  mixer: "The mixer is the panel on the left. It changes how the map becomes music. It has an energy slider, three channels, five knobs, and the shape of the wave. Say help with the mixer to hear how to use it.",
  energy: "Energy is the big slider at the top of the mixer. It sets how intense the music is and how much the planet glows. In the Time Machine it chooses the emissions scenario, from low to very high.",
  channels: "The channels are the three voices of the music. Colours play the chord, light plays the melody, and bright spots play the sparkles. Each one has a level, a mute button and a solo button.",
  colours: "Colours is the first channel. The main colours of the map choose the chord you hear in the background.",
  light: "Light is the second channel. The brightest point of each strip of the map, read from west to east, plays the melody.",
  spots: "Bright spots is the third channel. Places that stand out from what is around them, like a lightning flash or a city, play the sparkles.",
  volume: "Volume is how loud everything is.",
  mute: "Mute silences one channel. Solo lets you hear only that channel, so you can tell where each sound comes from.",
  knobs: "The knobs are mood, notes, speed, echo and filter. They shape the sound. They do not change the data.",
  mood: "Mood pushes the chord toward major, which sounds brighter, or minor, which sounds darker. In the middle, the colours of the map decide.",
  notes: "Notes sets how many notes the melody plays. With fewer notes, the darker strips of the map stay silent.",
  speed: "Speed is the tempo: how fast the music reads the map. Faster music also spins the planet faster.",
  echo: "Echo is reverb: how big the room sounds.",
  filter: "The filter works like the one on a DJ mixer. Low pass muffles the sound, high pass thins it, and off leaves it as it is.",
  wave: "The wave shape is the tone of the melody. Sine is the softest, then triangle, then square, and saw is the roughest. In the wave section you can also drag the wave to change energy and speed.",
  playing: "Now playing is the first tab of the panel on the right. It shows the record that is on, its picture or year, the zone the music reads, how the picture becomes sound, and where the data comes from.",
  news: "News is the second tab on the right. It lists recent headlines about the Earth and the climate: worldwide from NASA Earth Observatory, and by region from news sites, gathered automatically. Say read the news to hear them.",
  stories: "Stories is the third tab on the right. It has four real events, each told by a voice over the record it belongs to, in the language of the place and in English. Say tell me the story of, and a place.",
  zone: "Zone lets the music read only one part of the world, like Africa or Europe, instead of the whole planet. Say go to, and a place.",
  picture: "Picture to sound shows the picture that is playing, and lights up the strip that is sounding right now.",
  about: "About says where the data of the record comes from, whether it is measured or modelled, and how to read its colours.",
  records: "The records are at the bottom of the page. Each record is a different map of the Earth, and there are eight. Say next, previous, or the name of a record.",
  emissions: "Emissions are the four futures of the Time Machine: low, intermediate, high and very high. They are scenarios used by climate scientists, not forecasts.",
  kids: "Kids mode makes the page simpler, with easier words and twelve missions. Say kids mode to turn it on, and normal mode to leave.",
  missions: "Missions are small challenges in kids mode. Each one you complete gives you a star and teaches something about the Earth.",
  narrator: "The narrator reads aloud whatever you point at with the mouse, or land on with the Tab key. Press V, or say narrator on.",
  voice: "Voice control lets you run the whole page by speaking. Hold the space bar, speak, and let go.",
  tutorial: "The tutorial is a spoken tour in eight steps, made for people who cannot see the screen. Press T, or say tutorial.",
  theme: "Dark mode and light mode change the colours of the page. Say dark mode, or light mode.",
};
export type Topic = keyof typeof EXPLAIN;
// The more specific words go first: "bright spots" before "light", "kids mode" before "mode".
const TOPIC_WORDS: [RegExp, Topic][] = [
  [/bright spots?|hot spots?|sparkles?/, "spots"],
  [/colou?rs?\b|chords?\b/, "colours"],
  [/\bmute\b|\bsolo\b/, "mute"],
  [/\bmood\b|major|minor/, "mood"],
  [/\bnotes\b|density/, "notes"],
  [/speed|tempo|\bbpm\b/, "speed"],
  [/echo|reverb/, "echo"],
  [/filter|low ?pass|high ?pass/, "filter"],
  [/\bwave\b|sine|triangle|square|\bsaw\b|shape/, "wave"],
  [/energy|power\b/, "energy"],
  [/volume/, "volume"],
  [/channels?/, "channels"],
  [/knobs?|dials?/, "knobs"],
  [/mixer|sound machine|mixing/, "mixer"],
  [/now playing|playing (tab|panel|section)|\bplaying$/, "playing"],
  [/\bnews\b|headlines?/, "news"],
  [/stor(y|ies)/, "stories"],
  [/\bzones?\b/, "zone"],
  [/picture to sound|picture|scan/, "picture"],
  [/\babout\b(?! (the|this|that|it)\b)|about (tab|section)/, "about"],
  [/emissions?|scenarios?/, "emissions"],
  [/\brecords?\b|\bdock\b|discs?\b|\btracks?\b/, "records"],
  [/missions?\b|\bstars?\b/, "missions"],
  [/kids?( mode)?\b|children/, "kids"],
  [/narrator/, "narrator"],
  [/voice|microphone|space ?bar/, "voice"],
  [/tutorial/, "tutorial"],
  [/dark mode|light mode|\btheme\b/, "theme"],
  [/\blight\b|melody/, "light"],
  [/kasama|this (page|site|website|app)|jukebox|the (page|site|website|app)\b/, "page"],
];

// Words that point at a record, a zone or a story. The first entry that matches wins, so the more specific words go first.
const RECORD_WORDS: [RegExp, string][] = [
  [/time machine|climate|future|projection/, "time-machine"],
  [/current/, "ocean-currents"],
  [/lightning|thunder|storms?\b/, "lightning"],
  [/forest|tree|canopy|jungle/, "forest-height"],
  [/temperature|warm (sea|ocean|water)|hot (sea|ocean|water)/, "ocean-temperature"],
  [/vapou?r|humid|moisture|atmospheric river|rain/, "atmospheric-river"],
  [/carbon|c ?o ?2|co two|c o two|dioxide/, "carbon-dioxide"],
  [/smoke|dust|haze|air quality|pollution|aerosol/, "air-quality"],
  [/sea|ocean/, "ocean-temperature"],
];
const ZONE_WORDS: [RegExp, string | null][] = [
  [/whole (planet|world|earth)|everywhere|all the (planet|world)|entire (planet|world)|zoom out/, null],
  [/north america|united states|canada|\busa?\b/, "north-america"],
  [/mexico|central america|caribbean/, "central-america"],
  [/south america|brazil|amazon|argentina/, "south-america"],
  [/europe/, "europe"],
  [/middle east|arabia/, "middle-east"],
  [/africa/, "africa"],
  [/south ?east asia|indonesia/, "southeast-asia"],
  [/south asia|india|pakistan/, "south-asia"],
  [/east asia|china|japan|korea/, "east-asia"],
  [/australia|oceania|pacific/, "oceania"],
  [/arctic|north pole/, "arctic"],
];
const STORY_WORDS: [RegExp, string][] = [
  [/otis|acapulco|hurricane|mexico/, "otis"],
  [/pakistan|flood/, "pakistan"],
  [/amazon|rainforest|drought|brazil/, "amazon"],
  [/1\.5|one point five|2024|twenty twenty.?four|warmest|hottest|paris|planet|earth|the year/, "one-point-five"],
];
const find = <T>(text: string, words: [RegExp, T][]) => words.find(([re]) => re.test(text));

const CHANNEL_WORDS: [RegExp, Channel][] = [
  [/bright spots?|hot spots?|\bspots\b|sparkles?|\bbeat\b|drums?|\bkick\b/, "beat"],
  [/colou?rs?\b|chords?|soft notes|\bheat\b/, "chord"],
  [/\blight\b|melody|\btune\b|warming/, "melody"],
];
const CONTROL_WORDS: [RegExp, NumKey][] = [
  [/volume|loud|quiet|softer/, "volume"],
  [/energy|power|intens|calmer|gentler|stronger|wave (height|size)|(taller|bigger|smaller|shorter) wave/, "energy"],
  [/tempo|speed|faster|slower|\bbpm\b|beats per minute/, "tempo"],
  [/echo|reverb/, "space"],
  [/\bnotes\b|density|busier|sparser/, "density"],
];
const TENS: Record<string, number> = { zero: 0, ten: 10, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100 };

/** "up", "a lot less", "80 percent", "half", "maximum"... as a position or a step. */
function amountOf(t: string, key: NumKey): Amount {
  const n = t.match(/\b(\d{1,3})\b/)?.[1] ?? Object.keys(TENS).find((w) => new RegExp(`\\b${w}\\b`).test(t));
  if (n !== undefined) {
    const value = Number.isNaN(Number(n)) ? TENS[n] : Number(n);
    return key === "tempo" ? { bpm: value } : { to: Math.min(100, value) / 100 };
  }
  if (/\bmax|\bfull|all the way up|highest|\btop\b/.test(t)) return { to: 1 };
  if (/\bmin\b|minimum|all the way down|lowest|\bbottom\b|\boff\b|\bno\b|\bnone\b|without/.test(t)) return { to: 0 };
  if (/\bhalf|middle|medium|halfway/.test(t)) return { to: 0.5 };
  const big = /a lot|much|way\b|far\b/.test(t) ? 2 : /a (little|bit)|slightly|a touch/.test(t) ? 0.5 : 1;
  if (/\bup\b|more|higher|increase|raise|louder|faster|stronger|bigger|taller|busier|\badd\b|boost/.test(t)) return { by: 0.15 * big };
  if (/\bdown\b|less|lower|decrease|reduce|quieter|softer|slower|calmer|gentler|fewer|smaller|shorter|sparser|\bcut\b/.test(t)) return { by: -0.15 * big };
  return {};
}

/** Turns what was heard into one order. Pure, so it can be tested without a microphone. */
export function parseCommand(heard: string): Command {
  const t = heard
    .toLowerCase()
    .replace(/%/g, " percent ")
    .replace(/[^a-z0-9. ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return { do: "unknown", heard };
  const has = (re: RegExp) => re.test(t);
  const zone = find(t, ZONE_WORDS);
  const channel = find(t, CHANNEL_WORDS)?.[1];
  const hide = has(/\bhide\b|\bclose\b|collapse|put away|get rid of/);
  const show = has(/\bshow\b|\bopen\b|expand|bring back|bring up|unhide/);

  if (has(/how (do|to|can) (i|you|we)? ?(read|understand)|what do the colou?rs mean|legend/)) return { do: "read" };
  // "What is the mixer?", "explain the news", "what does solo do?": say what that part of the page is, without touching it.
  if (has(/\bwhat\b|\bwhats\b|explain|tell me about|meaning of|how does|what s\b/) && !has(/what can (i|you)|what do the colou?rs mean|which zone|what zone|what part|what( is| s|s) (this|it)$|what( is| s|s) playing$|what am i/)) {
    const about = t.replace(/^.*?\b(about|what is|what s|whats|what are|what does|what do|explain|meaning of|how does)\b/, "").trim();
    const topic = find(about, TOPIC_WORDS)?.[1];
    const which = find(about, RECORD_WORDS)?.[1];
    if (which && (!topic || /time machine|temperature|currents|lightning|forest|vapou?r|carbon|smoke|dust|haze/.test(about))) return { do: "explainRecord", slug: which };
    if (topic) return { do: "explain", topic };
  }
  if (has(/tutorial|teach me|how does (this|it) work|guide me/)) return { do: "tutorial", on: !has(/\bexit\b|leave|close|stop|quit|\bend\b|skip/) };
  if (has(/\bhelp\b|what can (i|you) (say|do)|commands/)) return has(/mixer|sound|controls|more/) ? { do: "helpMixer" } : { do: "help" };
  if (has(/\brepeat\b|say (that|it) again|\bagain\b|pardon/)) return { do: "repeat" };
  if (has(/\bstory\b|tell me/)) {
    const local = has(/spanish|espa|urdu|portuguese|local|original/);
    return { do: "story", id: find(t, STORY_WORDS)?.[1] ?? null, lang: local ? "local" : "english" };
  }
  if (has(/\bnews\b|headlines?/)) return { do: "news", zone: zone?.[1] ?? null };

  // The look of the page, and who is talking.
  if (has(/dark (mode|theme)|night mode|\bdark\b$/)) return { do: "theme", to: "dark" };
  if (has(/light (mode|theme)|day mode|bright (mode|theme)/)) return { do: "theme", to: "light" };
  if (has(/(switch|change|toggle) (the )?(theme|colou?rs of the page)|\btheme\b/)) return { do: "theme", to: "toggle" };
  if (has(/narrator/)) return { do: "narrator", on: !has(/\boff\b|stop|disable|quiet/) };
  if (has(/normal|regular|standard|grown ?up|adult/)) return { do: "kids", on: false };
  if (has(/kids?( mode)?\b|children/)) return { do: "kids", on: !has(/\boff\b|stop|disable|exit|leave|quit|close/) };
  if (has(/\bmissions?\b|\bstars?\b/)) return has(/reset|clear|start over|erase/) ? { do: "missions", reset: true } : { do: "tab", tab: "missions" };

  // Panels, tabs and the folding sections inside them.
  if (hide || show) {
    if (has(/mixer|sound machine|controls|left/)) return { do: "panel", side: "left", open: show };
    if (has(/panels|everything|both|\ball\b|menus/)) return { do: "panel", side: "both", open: show };
    if (show && has(/stories/)) return { do: "tab", tab: "stories" };
    if (show && has(/now playing|playing|record info/)) return { do: "tab", tab: "playing" };
    const section = t.match(/channels|knobs|filter|\bwave\b|about|emissions|picture|\bzone\b/)?.[0];
    if (section) return { do: "section", name: section, open: show };
    if (has(/panel|right|info|menu/)) return { do: "panel", side: "right", open: show };
  }
  if (has(/^stories$|stories tab/)) return { do: "tab", tab: "stories" };

  // The mixer.
  if (has(/\breset\b|defaults?\b|start fresh|put (it|everything|them) back/)) return { do: "reset" };
  if (has(/all (the )?channels|everything on|unmute (all|everything)|un ?solo|all (the )?sounds/)) return { do: "allChannels" };
  if (channel) {
    if (has(/\bsolo\b|\bonly\b|\bjust\b|alone/)) return { do: "solo", channel };
    if (has(/unmute|turn on|bring back|\bwith\b/)) return { do: "mute", channel, on: false };
    if (has(/\bmute\b|turn off|silence|without|\bno\b|remove/)) return { do: "mute", channel, on: true };
    return { do: "set", key: channel, amount: amountOf(t, channel) };
  }
  if (has(/sine|smooth wave/)) return { do: "shape", shape: "sine" };
  if (has(/triangle/)) return { do: "shape", shape: "triangle" };
  if (has(/square/)) return { do: "shape", shape: "square" };
  if (has(/\bsaw\b|sawtooth|saw tooth/)) return { do: "shape", shape: "sawtooth" };
  if (has(/low ?pass|muffle/)) return { do: "set", key: "filter", amount: { to: 0.2 } };
  if (has(/high ?pass|\bthin\b/)) return { do: "set", key: "filter", amount: { to: 0.8 } };
  if (has(/filter/)) return { do: "set", key: "filter", amount: has(/\boff\b|\bno\b|remove|clear|cent(er|re)/) ? { to: 0.5 } : {} };
  if (has(/\bmajor\b|happy|happier|brighter|cheerful/)) return { do: "set", key: "warmth", amount: { to: 1 } };
  if (has(/\bminor\b|\bsad\b|sadder|darker|gloomy/)) return { do: "set", key: "warmth", amount: { to: 0 } };
  if (has(/\bmood\b/)) return { do: "set", key: "warmth", amount: has(/neutral|automatic|auto|data|follow|cent(er|re)|\boff\b/) ? { to: 0.5 } : {} };

  // The time machine: emissions scenario and year. Then the frames of any record.
  if (has(/emissions?|scenario/)) {
    const index = has(/very high|highest|worst/) ? 3 : has(/\bhigh\b/) ? 2 : has(/intermediate|medium|middle/) ? 1 : has(/\blow\b|lowest|best/) ? 0 : -1;
    if (index >= 0) return { do: "scenario", index };
  }
  const year = t.match(/\b(19[5-9]\d|20\d\d|2100)\b/)?.[1];
  if (year) return { do: "year", year: Number(year) };
  if (has(/frame|picture|image|\bmap\b/)) {
    const n = t.match(/\b(\d{1,2})\b/)?.[1];
    if (n) return { do: "frame", to: Number(n) };
    if (has(/first|start|beginning/)) return { do: "frame", to: "first" };
    if (has(/\blast\b|\bend\b|final/)) return { do: "frame", to: "last" };
    if (has(/next|forward|advance/)) return { do: "frame", to: "next" };
    if (has(/previous|back|before/)) return { do: "frame", to: "previous" };
  }
  if (has(/start over|from the (start|beginning|top)|restart|rewind/)) return { do: "frame", to: "first" };
  const control = find(t, CONTROL_WORDS)?.[1];
  if (control) return { do: "set", key: control, amount: amountOf(t, control) };

  // What is playing, and where.
  if (has(/which zone|what zone|where am i|where are we|what part/)) return { do: "where" };
  if (has(/what( is| s|s) (this|playing|it)|what am i (hearing|listening)|is (it|this) real|describe/)) return { do: "what" };
  if (has(/\bnext\b|skip/)) return { do: "next" };
  if (has(/previous|go back|\bback\b|\blast\b/) && !has(/back to the whole/)) return { do: "previous" };
  const record = find(t, RECORD_WORDS);
  // "go to Africa" is a zone; "play the forest" is a record; with both, the verb decides.
  if (zone && (!record || has(/go to|focus|zoom|show me|take me|turn to|only/))) return { do: "zone", id: zone[1] };
  if (record) return { do: "record", slug: record[1] };
  if (has(/\bstop\b|silence|shut up|enough|\bmute\b|turn (it )?off|be quiet/)) return { do: "stop" };
  if (has(/pause|hold on|wait/)) return { do: "pause" };
  if (has(/play|start|resume|continue|\bgo\b|music|unmute/)) return { do: "play" };
  return { do: "unknown", heard };
}

export const HELP = [
  "Hold the space bar, speak, and let go.",
  "You can say: play, pause, next, or previous.",
  `Say the name of a record: ${Object.values(RECORD_INFO)
    .map((r) => r.name)
    .join(", ")}.`,
  `Say go to, and a part of the world, like ${ZONES[3].label} or ${ZONES[4].label}. Say whole planet to hear it all.`,
  `Say tell me the story of ${STORIES.map((s) => s.place.split(",")[0]).join(", or ")}. Add in Spanish, Urdu or Portuguese to hear it in the language of the place.`,
  "Say read the news to hear the latest headlines.",
  "Say what is this, or how do I read it. Say stop to cut a story.",
  "Say what is, and the name of anything on the page, like what is the mixer, or what is the news, to hear what it is.",
  "Say help with the mixer to hear how to change the sound. Say tutorial for a guided tour.",
];
export const HELP_MIXER = [
  "The mixer. Say a control and where to put it: volume up, energy down, speed 120, echo 50 percent, more notes.",
  "The three channels are colours, light, and bright spots. Say mute colours, solo light, colours up, or all channels.",
  "Say major or minor for the mood. Say low pass, high pass, or filter off. Say sine, triangle, square or saw for the wave.",
  "In the Time Machine, say a year, like 2050, and low, intermediate, high or very high emissions.",
  "Say next picture, first picture or last picture to move inside a record. Say reset to put every control back.",
  "Say dark mode or light mode, kids mode or normal mode, hide the mixer or show the mixer.",
];

export const VOICE_SAY = {
  unsupported: "Voice control needs the Chrome or Edge browser. You can still use the keyboard: Space plays and pauses, N and P change the record.",
  blocked: "The microphone is blocked. Allow the microphone for this page, then hold the space bar again.",
  offline: "Voice control needs an internet connection.",
  silence: "I did not hear anything. Hold the space bar while you speak.",
  unknown: "I did not catch that. Say help to hear what you can say.",
};

interface Recognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}

export type VoiceProblem = keyof Pick<typeof VOICE_SAY, "unsupported" | "blocked" | "offline" | "silence">;

export class VoiceControl {
  /** Called while the microphone opens and closes, with what has been heard so far. */
  onListening: (on: boolean, heard: string) => void = () => {};
  /** Called once per press, with the whole sentence. */
  onHeard: (heard: string) => void = () => {};
  onProblem: (problem: VoiceProblem) => void = () => {};
  listening = false;
  private rec: Recognition | null = null;
  private text = "";
  private failed = false;
  private done = ""; // what earlier sessions of this press heard
  private restarts = 0;
  private problem: VoiceProblem = "silence";
  private tones: AudioContext | null = null;

  get supported() {
    const w = window as unknown as Record<string, unknown>;
    return !!(w.SpeechRecognition ?? w.webkitSpeechRecognition);
  }

  /** A short tone: rising when the microphone opens, falling when it closes. */
  private tone(up: boolean) {
    try {
      const ctx = (this.tones ??= new AudioContext());
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(up ? 520 : 780, now);
      osc.frequency.exponentialRampToValueAtTime(up ? 780 : 520, now + 0.12);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch {
      /* no sound card: the spoken answer still tells what happened */
    }
  }

  /** Opens the microphone. Call it when the key goes down. It stays open until stop(), whatever the browser does. */
  start() {
    if (this.listening) return;
    if (!this.supported) return this.onProblem("unsupported");
    this.text = "";
    this.done = "";
    this.failed = false;
    this.restarts = 0;
    this.listening = true;
    this.tone(true);
    this.onListening(true, "");
    this.open();
  }

  /**
   * One recognition session. Chrome closes a session by itself after a few seconds of silence, or as soon as it
   * decides a sentence is over; while the key is still down a new one is opened, and the words heard so far are kept.
   */
  private open() {
    const w = window as unknown as Record<string, new () => Recognition>;
    const rec = new (w.SpeechRecognition ?? w.webkitSpeechRecognition)();
    rec.lang = "en-US";
    rec.continuous = true; // a pause in the middle of a sentence must not close the microphone
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    this.rec = rec;
    let session = "";
    rec.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) session += `${e.results[i][0].transcript} `;
        else live += e.results[i][0].transcript;
      }
      this.text = `${this.done}${session}${live}`.trim();
      if (this.listening) this.onListening(true, this.text);
    };
    rec.onerror = (e) => {
      if (e.error === "aborted" || e.error === "no-speech") return; // silence is not a failure while the key is held
      this.failed = true;
      this.problem = e.error === "not-allowed" || e.error === "service-not-allowed" || e.error === "audio-capture" ? "blocked" : e.error === "network" ? "offline" : "silence";
    };
    rec.onend = () => {
      if (this.rec !== rec) return;
      this.rec = null;
      this.done = this.text ? `${this.text} ` : "";
      if (this.failed) {
        if (this.listening) {
          this.listening = false;
          this.tone(false);
          this.onListening(false, this.text);
        }
        return this.onProblem(this.problem);
      }
      if (this.listening && this.restarts++ < 40) return this.open(); // the key is still down: keep listening
      this.finish();
    };
    try {
      rec.start();
    } catch {
      this.rec = null;
      this.listening = false;
      this.onListening(false, "");
      this.onProblem("blocked");
    }
  }

  private finish() {
    if (this.text) this.onHeard(this.text);
    else this.onProblem("silence");
  }

  /** Closes the microphone and runs what was heard. Call it when the key comes up. */
  stop() {
    if (!this.listening) return;
    this.listening = false;
    this.tone(false);
    this.onListening(false, this.text);
    if (this.rec) this.rec.stop(); // the last words arrive just before onend, which then runs the order
    else this.finish();
  }
}

export const voice = new VoiceControl();
