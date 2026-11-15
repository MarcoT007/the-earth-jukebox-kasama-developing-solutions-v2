import type { MusicalFrame } from "../audio/mapping";
import { KID_KNOBS, KID_SHAPES } from "../kids";
import { DEFAULT_CONTROLS, type Controls, type WaveShape } from "../types";
import Knob from "./Knob";
import WavePad from "./WavePad";

interface Props {
  controls: Controls;
  onChange: (c: Controls) => void;
  music: MusicalFrame | null;
  kids: boolean;
  /** What the energy control currently does on the planet (e.g. the emissions scenario). */
  energyMeaning: string;
}

export type NumKey = Exclude<keyof Controls, "shape">;

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const pct = (v: number) => `${Math.round(v * 100)}%`;

const KNOBS: { key: NumKey; label: string; hint: string; min: number; max: number; step: number; format?: (v: number) => string }[] = [
  { key: "energy", label: "Energy", hint: "Height of the wave. More energy makes the sound more intense and changes the planet.", min: 0, max: 1, step: 0.05, format: pct },
  { key: "tempo", label: "Tempo", hint: "Length of the wave. Faster music spins the planet faster.", min: 50, max: 160, step: 1, format: (v) => `${v} bpm` },
  { key: "warmth", label: "Mood", hint: "Pushes the music toward major (brighter) or minor (darker)", min: -1, max: 1, step: 0.05, format: (v) => (v > 0 ? `+${v.toFixed(2)}` : v.toFixed(2)) },
  { key: "density", label: "Density", hint: "How many notes the scanner plays", min: 0, max: 1, step: 0.05, format: pct },
  { key: "space", label: "Space", hint: "Reverb: how big the sound feels", min: 0, max: 1, step: 0.05, format: pct },
  { key: "volume", label: "Volume", hint: "Master volume", min: 0, max: 1, step: 0.05, format: pct },
];

const SHAPES: { id: WaveShape; label: string; path: string }[] = [
  { id: "sine", label: "Sine", path: "M2 12 C6 0, 10 0, 14 12 S22 24, 26 12" },
  { id: "triangle", label: "Triangle", path: "M2 12 L8 3 L20 21 L26 12" },
  { id: "square", label: "Square", path: "M2 20 V4 H14 V20 H26 V4" },
  { id: "sawtooth", label: "Saw", path: "M2 20 L14 4 V20 L26 4" },
];

export default function Modulator({ controls, onChange, music, kids, energyMeaning }: Props) {
  return (
    <div className="modulator">
      <h2>{kids ? "Sound machine" : "Shape the wave"}</h2>
      <WavePad controls={controls} onChange={onChange} />
      <p className="pad-help">
        <span>↕ {kids ? "Power" : "Energy"}</span>
        <span>↔ {kids ? "Speed" : "Tempo"}</span>
      </p>
      <p className="energy-meaning" aria-live="polite">
        {energyMeaning}
      </p>

      <div className="shapes" role="radiogroup" aria-label="Wave shape">
        {SHAPES.map((s) => (
          <button key={s.id} role="radio" aria-checked={controls.shape === s.id} onClick={() => onChange({ ...controls, shape: s.id })}>
            <svg viewBox="0 0 28 24" aria-hidden="true">
              <path d={s.path} />
            </svg>
            {kids ? KID_SHAPES[s.id] : s.label}
          </button>
        ))}
      </div>

      <div className="knobs">
        {KNOBS.map((k) => (
          <Knob
            key={k.key}
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
        ))}
      </div>

      <div className="readout">
        <span className="eyebrow">{kids ? "Mood" : "Key"}</span>
        <strong>{!music ? "—" : kids ? (music.mode === "major" ? "Bright" : "Dark") : `${NOTE_NAMES[music.root]} ${music.mode}`}</strong>
      </div>
    </div>
  );
}
