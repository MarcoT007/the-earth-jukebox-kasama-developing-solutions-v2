export interface FrameFeatures {
  src: string;
  brightness: number;
  contrast: number;
  saturation: number;
  edges: number;
  hotspots: number;
  chroma: number[]; // 12 hue bins
  grid: number[][]; // 4 rows x 8 cols of brightness
  meanRgb: number[];
  dominantHue: number;
  year?: number; // time machine only
  heat?: number; // time machine only: 0..1 land heat index across all years and scenarios
  heatGrid?: number[][]; // time machine only: 4 x 8 heat of the land in each cell, 0..1 (-1 = no land)
  /** Map-shaped records only: the same features computed inside each zone the listener can focus on. In the time machine the heat of a zone is how much it has warmed since 1950 (0..1 of the largest warming of any zone). */
  zones?: Record<string, Partial<FrameFeatures>>;
  warmGrid?: number[][]; // time machine only: 4 x 8 warming of each cell since 1950, 0..1 (-1 = no land)
}

export interface Visualization {
  slug: string;
  svsId: number;
  title: string;
  description: string;
  credits: string;
  sourceUrl: string;
  projection: "equirect" | "screen";
  frames: FrameFeatures[];
  /** Time machine only: one frame list per emissions scenario, same years in each. */
  scenarios?: Scenario[];
  years?: number[];
}

export interface Scenario {
  id: string;
  code: string; // e.g. "SSP2-4.5"
  label: string;
  blurb: string;
  frames: FrameFeatures[];
}

export type WaveShape = "sine" | "triangle" | "square" | "sawtooth";

/** User-controlled "modulator" settings. They change the sound AND the planet. */
export interface Controls {
  tempo: number; // BPM
  warmth: number; // -1 (cool / minor) .. 1 (warm / major); 0 = follow the data
  density: number; // 0..1 how many notes the scanner plays
  space: number; // 0..1 reverb amount
  volume: number; // 0..1
  energy: number; // 0..1 wave amplitude: intensity of the sound, and the emissions scenario in the time machine
  shape: WaveShape; // waveform of the melody
  chord: number; // 0..1 channel fader: colours -> chord
  melody: number; // 0..1 channel fader: light -> melody
  beat: number; // 0..1 channel fader: standout spots -> sparkles and kick
  filter: number; // -1..1 DJ filter: left cuts the highs, right cuts the lows, 0 = off
}

export const DEFAULT_CONTROLS: Controls = { tempo: 84, warmth: 0, density: 0.6, space: 0.25, volume: 0.8, energy: 0.4, shape: "triangle", chord: 0.75, melody: 0.75, beat: 0.75, filter: 0 };

/** Energy (wave amplitude) picks one of the four emissions scenarios. */
export const scenarioIndex = (energy: number, count = 4) => Math.min(count - 1, Math.floor(energy * count));
export const energyForScenario = (index: number, count = 4) => (index + 0.5) / count;

/** The three voices of the music. Each one comes from one thing in the picture and can be muted. */
export interface Layers {
  chord: boolean; // colours -> chord
  melody: boolean; // light, scanned left to right -> melody
  beat: boolean; // spots that stand out -> sparkles (plus a kick on every new picture)
}
export const DEFAULT_LAYERS: Layers = { chord: true, melody: true, beat: true };
