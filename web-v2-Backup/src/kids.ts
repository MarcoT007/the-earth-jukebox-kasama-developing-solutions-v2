/**
 * Kids mode: plain-language labels, explanations and learning missions.
 * Everything here is content, so it is easy to edit or translate.
 */
import { colourTemperature, type MusicalFrame } from "./audio/mapping";
import type { Controls, FrameFeatures, WaveShape } from "./types";

export const KID_KNOBS: Record<Exclude<keyof Controls, "shape">, { label: string; hint: string }> = {
  energy: { label: "Power", hint: "Makes the wave taller. More power changes the planet!" },
  tempo: { label: "Speed", hint: "Faster music makes the planet spin faster" },
  warmth: { label: "Mood", hint: "Makes the music brighter or darker" },
  density: { label: "Notes", hint: "More notes or fewer notes" },
  space: { label: "Echo", hint: "Makes the sound feel big, like in a cave" },
  volume: { label: "Loud", hint: "How loud the music is" },
};

export const KID_SHAPES: Record<WaveShape, string> = { sine: "Smooth", triangle: "Soft", square: "Blocky", sawtooth: "Buzzy" };

/** "What am I hearing?" text for each record, keyed by visualization slug. */
export const KID_STORIES: Record<string, string> = {
  "time-machine":
    "This is a time machine! It shows how hot the land gets each year, from 1950 to 2100. Darker red means hotter. Make the wave taller to add more pollution and see what scientists think could happen. As the land gets hotter, the notes climb higher and the music sounds more worried.",
  "ocean-currents":
    "The ocean never stops moving! Red and orange mean warm water. Blue means cold water. Warm colours make the music sound bright. Cold colours make it sound calm and deep.",
  lightning: "Each tiny flash is lightning seen from the Space Station. Bright flashes turn into sparkly, crackly sounds. Can you hear them?",
  "forest-height": "A laser on the Space Station measured how tall Earth’s forests are. Trees store carbon and help keep our planet cool.",
  "ocean-temperature": "These swirls are giant rivers inside the ocean, called currents. They carry heat around the world like a moving belt.",
  "atmospheric-river": "An atmospheric river is a river in the sky made of water vapour. It can bring lots of rain when it reaches land.",
  "carbon-dioxide": "This is carbon dioxide, a gas that comes from cars, factories and fires. Too much of it makes Earth warmer.",
  "air-quality": "This shows what floats in the air we breathe, like smoke and dust. Cleaner air is healthier for everyone.",
};

export function kidDescribe(f: FrameFeatures, m: MusicalFrame): string {
  if (f.heat !== undefined) {
    const how = f.heat > 0.66 ? "very hot" : f.heat > 0.33 ? "getting hotter" : "cooler";
    return `The land is ${how} here, so the notes are ${f.heat > 0.5 ? "high and worried" : "lower and calmer"}.`;
  }
  const t = colourTemperature(f);
  const colours = t > 0.2 ? "Lots of warm colours here" : t < -0.2 ? "Lots of cool colours here" : "Warm and cool colours are mixed here";
  const mood = m.mode === "major" ? "bright" : "calm and deep";
  const sparkle = m.percussion > 0.35 ? " Listen for the sparkles: they are the brightest spots." : "";
  return `${colours}, so the music sounds ${mood}.${sparkle}`;
}

export interface MissionState {
  playing: boolean;
  slug: string | undefined;
  controls: Controls;
  scenario: number; // 0 (low emissions) .. 3 (very high)
  year: number | undefined;
  heard: number; // how many different records were played
}

export interface Mission {
  id: string;
  title: string;
  goal: string;
  learned: string; // shown when the mission is complete
  done: (s: MissionState) => boolean;
}

export const MISSIONS: Mission[] = [
  {
    id: "future",
    title: "Visit the future",
    goal: "Play the Time Machine record and travel to a year after 2050.",
    learned: "Scientists use computer models to explore what the future could look like.",
    done: (s) => s.playing && s.slug === "time-machine" && (s.year ?? 0) > 2050,
  },
  {
    id: "cool",
    title: "Choose a cooler future",
    goal: "In the Time Machine, make the wave small until it says “Low emissions”.",
    learned: "Less pollution means a cooler planet. The future depends on what we choose!",
    done: (s) => s.playing && s.slug === "time-machine" && s.scenario === 0,
  },
  {
    id: "storm",
    title: "Find the storm",
    goal: "Find the lightning record and play it.",
    learned: "Every flash of lightning becomes a sparkly sound.",
    done: (s) => s.playing && s.slug === "lightning",
  },
  {
    id: "explorer",
    title: "Sound explorer",
    goal: "Play three different records.",
    learned: "Different pictures of Earth make different music.",
    done: (s) => s.heard >= 3,
  },
];

export const ACTIONS = [
  "Turn off lights and screens you are not using.",
  "Walk, bike or share a ride when you can.",
  "Tell someone what you learned about Earth today.",
];

export const KIDS_LINK = { href: "https://science.nasa.gov/kids/earth/", label: "Explore more at NASA Science for Kids" };
