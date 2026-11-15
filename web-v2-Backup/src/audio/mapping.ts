/**
 * Pure functions that translate visual features into musical decisions.
 * Kept separate from Tone.js so the rules are easy to read, test and explain
 * in the project write-up.
 */
import type { Controls, FrameFeatures } from "../types";

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const MAJOR_PENTA = [0, 2, 4, 7, 9];
const MINOR_PENTA = [0, 3, 5, 7, 10];

/**
 * Hue bin -> pitch class along the circle of fifths, so neighbouring colours
 * (e.g. blue and cyan) produce consonant neighbouring notes.
 */
export const hueBinToPitchClass = (bin: number) => (bin * 7) % 12;

/** Warm colours (reds/yellows) vs cool colours (blues/cyans): -1..1 */
export function colourTemperature(f: FrameFeatures): number {
  const c = f.chroma;
  const warm = c[0] + c[1] + c[2] + c[11]; // red, orange, yellow, magenta-red
  const cool = c[5] + c[6] + c[7] + c[8]; // cyan, azure, blue
  const total = warm + cool;
  return total > 0 ? (warm - cool) / total : 0;
}

export interface MusicalFrame {
  root: number; // pitch class 0..11
  mode: "major" | "minor";
  scale: number[]; // pitch classes
  chord: string[]; // notes with octave, e.g. "C3"
  melody: (string | null)[]; // 8 steps from scanning the 4x8 grid left -> right
  pans: number[]; // -1..1 per step
  percussion: number; // 0..1 probability of a hit per step
  filterHz: number;
  energy: number; // 0..1, also used to animate the planet
  tension: number; // 0..1, from the heat index (time machine); adds dissonance
}

export function toMusic(f: FrameFeatures, c: Controls): MusicalFrame {
  // Root note = strongest colour in the frame.
  const strongest = f.chroma.indexOf(Math.max(...f.chroma));
  const heat = f.heat; // only defined for the climate time machine
  // Time machine: pitch rises with temperature (up to a fifth), a classic sonification convention.
  const root = (hueBinToPitchClass(strongest < 0 ? 0 : strongest) + Math.round((heat ?? 0) * 7)) % 12;

  // Mode: warm imagery -> major, cool -> minor. The user's warmth slider pushes it.
  // Time machine: a hotter planet turns the music minor (tense) instead of "warm colours = happy".
  const base = heat === undefined ? colourTemperature(f) : (0.45 - heat) * 2;
  const temp = Math.max(-1, Math.min(1, base + c.warmth));
  const mode = temp >= 0 ? "major" : "minor";
  const scale = (mode === "major" ? MAJOR_PENTA : MINOR_PENTA).map((s) => (root + s) % 12);

  const name = (pc: number, octave: number) => `${NOTE_NAMES[pc]}${octave}`;
  const third = mode === "major" ? 4 : 3;
  const chord = [name(root, 2), name((root + 7) % 12, 3), name((root + third) % 12, 4)];

  // Melody: scan each of the 8 columns; brightest row sets the octave (north = high),
  // column brightness picks the scale degree. Dark columns become rests.
  // Brightness is normalised within the frame so dark maps still get a full melodic range.
  const colMax = f.grid[0].map((_, j) => Math.max(...f.grid.map((row) => row[j])));
  const lo = Math.min(...colMax);
  const span = Math.max(1e-3, Math.max(...colMax) - lo);
  const threshold = 1 - c.density; // more density -> more notes survive
  const melody: (string | null)[] = [];
  const pans: number[] = [];
  for (let col = 0; col < 8; col++) {
    const column = f.grid.map((row) => row[col]);
    const row = column.indexOf(colMax[col]);
    const rel = (colMax[col] - lo) / span; // 0..1 within this frame
    if (rel < threshold * 0.8) {
      melody.push(null);
    } else {
      // 5 scale degrees x 2 octaves of range from relative brightness, shifted by latitude band.
      const pos = Math.min(9, Math.floor(rel * 10));
      const degree = pos % scale.length;
      const octave = 3 + Math.floor(pos / scale.length) + (row <= 1 ? 1 : 0); // northern rows sound higher
      melody.push(name(scale[degree], octave));
    }
    pans.push(col / 3.5 - 1);
  }

  return {
    root,
    mode,
    scale,
    chord,
    melody,
    pans,
    percussion: Math.min(1, (f.hotspots * 12 + f.edges * 0.6 + (heat ?? 0) * 0.5) * (0.4 + c.energy * 1.2)),
    filterHz: (300 + f.brightness * 5000 + f.saturation * 2000) * (0.6 + c.energy * 0.9),
    energy: Math.min(1, (f.brightness * 0.6 + f.edges * 0.8 + f.hotspots * 4) * (0.5 + c.energy)),
    tension: heat ?? 0,
  };
}

/** Plain-language description of a frame, for screen readers and kids mode. */
export function describe(f: FrameFeatures, m: MusicalFrame): string {
  const temp = colourTemperature(f);
  const colours = temp > 0.2 ? "warm reds and yellows" : temp < -0.2 ? "cool blues and greens" : "a mix of warm and cool colours";
  const light = f.brightness > 0.45 ? "bright" : f.brightness > 0.2 ? "medium-lit" : "mostly dark";
  const cols = f.grid[0].map((_, j) => f.grid.reduce((s, row) => s + row[j], 0));
  const brightestCol = cols.indexOf(Math.max(...cols));
  const where = brightestCol < 3 ? "on the left (west)" : brightestCol > 4 ? "on the right (east)" : "in the centre";
  const busy = f.edges > 0.35 ? "lots of fine detail" : f.edges > 0.15 ? "some texture" : "smooth areas";
  return `A ${light} image with ${colours}, ${busy}, brightest ${where}. Playing in ${NOTE_NAMES[m.root]} ${m.mode}.`;
}
