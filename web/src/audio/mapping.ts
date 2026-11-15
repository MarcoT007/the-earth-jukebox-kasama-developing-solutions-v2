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
  rows: number[]; // row (0 = top / north) of the cell that sings at each step
  pans: number[]; // -1..1 per step
  beats: boolean[]; // steps that carry a sparkle
  percussion: number; // 0..1 how much sparkle this frame has
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

  // Melody: scan the 8 columns left -> right. In each column the brightest cell sings.
  // Where it is decides the register (top row / north = high, bottom row / south = low) and how
  // bright it is, relative to the rest of the frame, picks the note inside that register.
  // Columns that are dark compared with the rest of the frame are rests.
  //
  // Time machine: the grid holds the data itself instead of brightness. The hottest land cell of each column
  // sings, and its note climbs with how much that place has warmed since 1950, so every year starts from the
  // same low tune and rises with the warming. Columns without land are silent: the dataset has no ocean.
  const cells = f.heatGrid ?? f.grid;
  const colMax = cells[0].map((_, j) => Math.max(...cells.map((row) => row[j])));
  const lo = Math.min(...colMax.filter((v) => v >= 0));
  const span = Math.max(1e-3, Math.max(...colMax) - lo);
  const threshold = 1 - c.density; // more density -> more notes survive
  const lastRow = cells.length - 1;
  const melody: (string | null)[] = [];
  const rows: number[] = [];
  const pans: number[] = [];
  const standout: number[] = [];
  for (let col = 0; col < 8; col++) {
    const column = cells.map((row) => row[col]);
    const row = column.indexOf(colMax[col]);
    const rel = (colMax[col] - lo) / span; // 0..1 within this frame
    const warmed = f.warmGrid?.[row][col];
    if (colMax[col] < 0 || rel < threshold * 0.8) {
      melody.push(null);
    } else {
      // A ladder of pentatonic notes starting at octave 3: each row up adds 3 rungs, brightness adds up to 4 more.
      const rung = (lastRow - row) * 3 + Math.min(4, Math.floor(warmed === undefined ? rel * 5 : warmed * 10));
      melody.push(name(scale[rung % scale.length], 3 + Math.floor(rung / scale.length)));
    }
    rows.push(row);
    pans.push(col / 3.5 - 1);
    standout.push(f.warmGrid ? Math.max(...f.warmGrid.map((r) => r[col])) : colMax[col] - column.reduce((a, b) => a + b, 0) / column.length);
  }

  // Time machine: the sparkles mark the columns that have warmed the most, and there are more of them as the land heats up.
  // Everywhere else:
  // Sparkles: no dice. They land on the columns where one spot stands out most from its surroundings
  // (a lightning flash, a city, a plume); the amount of fine detail and bright points sets how many.
  const percussion = heat !== undefined ? heat * 0.8 : Math.min(1, (f.hotspots * 12 + f.edges * 0.6) * (0.4 + c.energy * 1.2));
  const hits = Math.round(percussion * 5);
  const ranked = standout.map((v, i) => [v, i]).sort((x, y) => y[0] - x[0] || x[1] - y[1]);
  const beats = standout.map((_, i) => ranked.slice(0, hits).some(([, j]) => j === i));

  return {
    root,
    mode,
    scale,
    chord,
    melody,
    rows,
    pans,
    beats,
    percussion,
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
