/**
 * Spoken tutorial for blind and low-vision visitors. Every step is said aloud and waits for the visitor to
 * do the thing it teaches; Enter skips a step, R repeats it, Escape leaves. Nothing in it needs the screen.
 */
export interface TutorialState {
  playing: boolean;
  track: number;
  voice: number; // orders given by voice so far
  zone: string | null;
  story: boolean;
  narrating: boolean;
}

export interface TutorialStep {
  title: string; // shown to a sighted helper
  say: string[];
  /** The step is over when this becomes true, compared with how things were when the step began. Without it, Enter moves on. */
  done?: (now: TutorialState, start: TutorialState) => boolean;
  needsVoice?: boolean; // skipped where the browser cannot recognise speech
}

export const TUTORIAL: TutorialStep[] = [
  {
    title: "Welcome",
    say: [
      "Welcome to Kasama for Earth. This page turns maps of the Earth, made from satellite data, into music.",
      "This tutorial has seven short steps. Press Enter to move on, R to hear a step again, and Escape to leave.",
      "Press Enter now to begin.",
    ],
  },
  {
    title: "Start the music",
    say: ["Step one. Tap the space bar once, quickly, to start the music."],
    done: (now) => now.playing,
  },
  {
    title: "Change the record",
    say: [
      "You are hearing a record. Each record is a different map of the Earth: temperature, forests, lightning, the sea, the air.",
      "The music reads the map from west to east: you hear the west in your left ear and the east in your right. Places in the north play higher notes, and brighter places play higher still.",
      "Step two. Press the letter N to move to the next record.",
    ],
    done: (now, start) => now.track !== start.track,
  },
  {
    title: "Use your voice",
    say: [
      "Step three. You can also talk to the jukebox.",
      "Hold the space bar down, wait for the rising tone, say: what is this. Then let go.",
    ],
    done: (now, start) => now.voice > start.voice,
    needsVoice: true,
  },
  {
    title: "Go to a place",
    say: ["Step four. The music can read one part of the world only.", "Hold the space bar and say: go to Africa."],
    done: (now, start) => now.zone !== null && now.zone !== start.zone,
    needsVoice: true,
  },
  {
    title: "Hear a story",
    say: [
      "Step five. Some real events are told as stories, with a voice over the music.",
      "Hold the space bar and say: tell me the story of Acapulco. To cut a story, hold the space bar and say stop.",
    ],
    done: (now, start) => !now.story && start.story, // set once the story has started, see App
    needsVoice: true,
  },
  {
    title: "The narrator",
    say: [
      "Step six. The narrator reads whatever you land on when you move with the Tab key.",
      "Press the letter V to turn the narrator on.",
    ],
    done: (now) => now.narrating,
  },
  {
    title: "You are ready",
    say: [
      "Step seven. That is all you need.",
      "At any time, hold the space bar and say help to hear everything you can say, or say help with the mixer to change the sound.",
      "Press Enter to finish. Enjoy listening to the Earth.",
    ],
  },
];

export const TUTORIAL_SAY = {
  offer: "Press T at any time for a spoken tutorial, made for people who cannot see the screen.",
  skipVoice: "This browser cannot hear you, so the steps that use your voice are skipped. For voice control, open this page in Chrome.",
  left: "Tutorial closed. Press T to start it again.",
  finished: "Tutorial finished.",
  good: "Good.",
};
