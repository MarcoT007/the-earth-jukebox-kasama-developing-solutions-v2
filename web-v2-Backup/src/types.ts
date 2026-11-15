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
}

export const DEFAULT_CONTROLS: Controls = { tempo: 84, warmth: 0, density: 0.6, space: 0.4, volume: 0.8, energy: 0.4, shape: "triangle" };

/** Energy (wave amplitude) picks one of the four emissions scenarios. */
export const scenarioIndex = (energy: number, count = 4) => Math.min(count - 1, Math.floor(energy * count));
export const energyForScenario = (index: number, count = 4) => (index + 0.5) / count;
