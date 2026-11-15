import { useEffect, useRef } from "react";
import type { MusicalFrame } from "../audio/mapping";
import { KID_KNOBS, KID_SHAPES } from "../kids";
import { DEFAULT_CONTROLS, DEFAULT_LAYERS, type Controls, type Layers, type WaveShape } from "../types";
import Knob from "./Knob";
import WavePad from "./WavePad";

interface Props {
  controls: Controls;
  onChange: (c: Controls) => void;
  layers: Layers;
  onLayers: (l: Layers) => void;
  /** Live level of chord, melody, beat and master, 0..1. */
  levels: () => number[];
  music: MusicalFrame | null;
  kids: boolean;
  /** What the energy control currently does on the planet (e.g. the emissions scenario). */
  energyMeaning: string;
  /** Time machine: names of the two ends of the crossfader (lowest and highest emissions). */
  ends: [string, string] | null;
}

export type NumKey = Exclude<keyof Controls, "shape">;

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const pct = (v: number) => `${Math.round(v * 100)}%`;

interface KnobSpec {
  key: NumKey;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
}

const MOOD: KnobSpec = { key: "warmth", label: "Mood", hint: "Pushes the chord toward major (brighter) or minor (darker)", min: -1, max: 1, step: 0.05, format: (v) => (v > 0.02 ? "major" : v < -0.02 ? "minor" : "data") };
const NOTES: KnobSpec = { key: "density", label: "Notes", hint: "How many notes the scanner plays. Columns that go silent fade in the picture.", min: 0, max: 1, step: 0.05, format: pct };
const TEMPO: KnobSpec = { key: "tempo", label: "Tempo", hint: "Speed of the scan. Faster music spins the planet faster.", min: 50, max: 160, step: 1, format: (v) => `${v} bpm` };
const ECHO: KnobSpec = { key: "space", label: "Echo", hint: "Reverb: how big the room sounds", min: 0, max: 1, step: 0.05, format: pct };
const FILTER: KnobSpec = {
  key: "filter",
  label: "Filter",
  hint: "DJ filter. Left muffles the sound (cuts the highs), right thins it (cuts the lows), centre is off.",
  min: -1,
  max: 1,
  step: 0.05,
  format: (v) => (v < -0.02 ? "low-pass" : v > 0.02 ? "high-pass" : "off"),
};

/** One strip per voice of the music, plus the master. `source` says what in the picture feeds the channel. */
const STRIPS: { id: "chord" | "melody" | "beat" | "volume"; name: string; source: string; kidSource: string; knob: KnobSpec }[] = [
  { id: "chord", name: "Chord", source: "colours", kidSource: "colours", knob: MOOD },
  { id: "melody", name: "Melody", source: "light", kidSource: "bright places", knob: NOTES },
  { id: "beat", name: "Beat", source: "spots", kidSource: "tiny spots", knob: TEMPO },
  { id: "volume", name: "Master", source: "all", kidSource: "everything", knob: ECHO },
];

const SHAPES: { id: WaveShape; label: string; path: string }[] = [
  { id: "sine", label: "Sine", path: "M2 12 C6 0, 10 0, 14 12 S22 24, 26 12" },
  { id: "triangle", label: "Triangle", path: "M2 12 L8 3 L20 21 L26 12" },
  { id: "square", label: "Square", path: "M2 20 V4 H14 V20 H26 V4" },
  { id: "sawtooth", label: "Saw", path: "M2 20 L14 4 V20 L26 4" },
];

/** The mixing desk: every voice of the music has its own channel, like on a DJ mixer. */
export default function Modulator({ controls, onChange, layers, onLayers, levels, music, kids, energyMeaning, ends }: Props) {
  const meters = useRef<(HTMLSpanElement | null)[]>([]);

  // LED meters follow the real level of each channel.
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const v = levels();
      meters.current.forEach((el, i) => {
        if (el) el.style.transform = `scaleY(${Math.min(1, Math.sqrt(v[i] ?? 0) * 1.6).toFixed(3)})`;
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [levels]);

  const knob = (k: KnobSpec) => (
    <Knob
      label={kids ? KID_KNOBS[k.key].label : k.label}
      hint={kids ? KID_KNOBS[k.key].hint : k.hint}
      min={k.min}
      max={k.max}
      step={k.step}
      format={k.format}
      value={controls[k.key]}
      defaultValue={DEFAULT_CONTROLS[k.key]}
      onChange={(v) => onChange({ ...controls, [k.key]: v })}
    />
  );

  const voices = Object.keys(DEFAULT_LAYERS) as (keyof Layers)[];
  const soloed = (id: keyof Layers) => layers[id] && voices.every((v) => v === id || !layers[v]);

  return (
    <div className="modulator mixer">
      <h2>{kids ? "Sound machine" : "Mixer"}</h2>
      <WavePad controls={controls} onChange={onChange} />

      <div className="strips">
        {STRIPS.map((s, i) => {
          const voice = s.id === "volume" ? null : s.id;
          const name = kids && voice ? KID_KNOBS[s.id].label : s.name;
          const off = voice ? !layers[voice] : false;
          return (
            <section key={s.id} className={`strip ch-${s.id}${off ? " off" : ""}`} aria-label={`${name} channel`}>
              <header>
                <b>{name}</b>
                <small>{kids ? s.kidSource : s.source}</small>
              </header>
              {knob(s.knob)}
              <div className="fader">
                <span className="meter" aria-hidden="true">
                  <span
                    ref={(el) => {
                      meters.current[i] = el;
                    }}
                  />
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={controls[s.id]}
                  aria-label={`${name} level`}
                  aria-valuetext={pct(controls[s.id])}
                  title={kids ? KID_KNOBS[s.id].hint : `${name} level. Double-click to reset.`}
                  onChange={(e) => onChange({ ...controls, [s.id]: Number(e.target.value) })}
                  onDoubleClick={() => onChange({ ...controls, [s.id]: DEFAULT_CONTROLS[s.id] })}
                />
              </div>
              <output>{pct(controls[s.id])}</output>
              {voice ? (
                <div className="strip-buttons">
                  <button className="mute" aria-pressed={!layers[voice]} title={`Mute ${name}`} onClick={() => onLayers({ ...layers, [voice]: !layers[voice] })}>
                    {kids ? "Off" : "Mute"}
                  </button>
                  <button
                    className="solo"
                    aria-pressed={soloed(voice)}
                    title={`Hear only ${name}`}
                    onClick={() => onLayers(soloed(voice) ? DEFAULT_LAYERS : { chord: voice === "chord", melody: voice === "melody", beat: voice === "beat" })}
                  >
                    {kids ? "Only" : "Solo"}
                  </button>
                </div>
              ) : (
                <div className="strip-buttons">
                  <button className="reset" title="Put every control back" onClick={() => (onChange(DEFAULT_CONTROLS), onLayers(DEFAULT_LAYERS))}>
                    Reset
                  </button>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="fx">
        <div className="big-knob">{knob(FILTER)}</div>
        <div className="shapes" role="radiogroup" aria-label="Wave shape of the melody">
          {SHAPES.map((s) => (
            <button key={s.id} role="radio" aria-checked={controls.shape === s.id} onClick={() => onChange({ ...controls, shape: s.id })}>
              <svg viewBox="0 0 28 24" aria-hidden="true">
                <path d={s.path} />
              </svg>
              {kids ? KID_SHAPES[s.id] : s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="crossfader">
        <label htmlFor="xfade">
          <span>{ends ? ends[0].replace(" emissions", "") : kids ? "Gentle" : "Calm"}</span>
          <b>{kids ? "Power" : "Energy"}</b>
          <span>{ends ? ends[1].replace(" emissions", "") : kids ? "Strong" : "Intense"}</span>
        </label>
        <input
          id="xfade"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={controls.energy}
          aria-valuetext={energyMeaning}
          onChange={(e) => onChange({ ...controls, energy: Number(e.target.value) })}
        />
      </div>
      <p className="energy-meaning" aria-live="polite">
        {energyMeaning}
      </p>

      <div className="readout">
        <span className="eyebrow">{kids ? "Mood" : "Key"}</span>
        <strong>{!music ? "—" : kids ? (music.mode === "major" ? "Bright" : "Dark") : `${NOTE_NAMES[music.root]} ${music.mode}`}</strong>
      </div>
    </div>
  );
}
