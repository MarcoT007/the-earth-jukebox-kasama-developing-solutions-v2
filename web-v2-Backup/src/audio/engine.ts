/**
 * Tone.js sound engine. One "bar" = 8 sixteenth-ish steps = one scan of a frame.
 * After every bar the engine advances to the next frame of the visualization.
 */
import * as Tone from "tone";
import type { Controls, FrameFeatures } from "../types";
import { toMusic, type MusicalFrame } from "./mapping";

export type FrameListener = (index: number, music: MusicalFrame) => void;

export class JukeboxEngine {
  private frames: FrameFeatures[] = [];
  private index = 0;
  private step = 0;
  private controls: Controls;
  private music: MusicalFrame | null = null;
  private listener: FrameListener | null = null;
  private loop: Tone.Loop | null = null;
  private ready = false;

  private master = new Tone.Volume(-6);
  private reverb = new Tone.Reverb({ decay: 6, wet: 0.4 });
  private filter = new Tone.Filter(2000, "lowpass");
  private meter = new Tone.Meter({ smoothing: 0.85, normalRange: true });
  private pad = new Tone.PolySynth(Tone.AMSynth, { volume: -16, envelope: { attack: 1.2, release: 3 } });
  private lead = new Tone.Synth({ oscillator: { type: "triangle" }, volume: -10, envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.8 } });
  private leadPan = new Tone.Panner(0);
  private kick = new Tone.MembraneSynth({ volume: -14 });
  private spark = new Tone.MetalSynth({ volume: -30, envelope: { decay: 0.15 } });

  constructor(controls: Controls) {
    this.controls = controls;
    this.pad.chain(this.filter, this.reverb, this.master);
    this.lead.chain(this.leadPan, this.reverb);
    this.kick.connect(this.master);
    this.spark.connect(this.reverb);
    this.master.connect(this.meter);
    this.master.toDestination();
  }

  onFrame(fn: FrameListener) {
    this.listener = fn;
  }

  setFrames(frames: FrameFeatures[], startAt = 0) {
    this.frames = frames;
    this.index = Math.min(startAt, frames.length - 1);
    this.step = 0;
    this.refreshFrame();
  }

  seek(index: number) {
    this.index = index;
    this.step = 0;
    this.refreshFrame();
  }

  setControls(c: Controls) {
    this.controls = c;
    Tone.getTransport().bpm.rampTo(c.tempo, 0.5);
    this.reverb.wet.rampTo(c.space, 0.5);
    this.lead.oscillator.type = c.shape;
    this.master.volume.rampTo(c.volume <= 0.01 ? -Infinity : Tone.gainToDb(c.volume), 0.2);
    this.refreshFrame();
  }

  /** 0..1 loudness, used to make the planet pulse with the music. */
  level(): number {
    const v = this.meter.getValue();
    return typeof v === "number" ? v : v[0];
  }

  /** Step of the bar that is currently sounding (0..7), for the visualizers. */
  currentStep(): number {
    return (this.step + 7) % 8;
  }

  async play() {
    if (!this.ready) {
      await Tone.start(); // browsers need a user gesture before audio
      this.ready = true;
    }
    if (!this.loop) {
      this.loop = new Tone.Loop((time) => this.tick(time), "8n").start(0);
    }
    this.setControls(this.controls);
    Tone.getTransport().start();
  }

  pause() {
    Tone.getTransport().pause();
    this.pad.releaseAll();
  }

  private refreshFrame() {
    const f = this.frames[this.index];
    if (!f) return;
    this.music = toMusic(f, this.controls);
    this.filter.frequency.rampTo(this.music.filterHz, 0.8);
    this.listener?.(this.index, this.music);
  }

  private tick(time: number) {
    const m = this.music;
    if (!m) return;

    if (this.step === 0) {
      this.pad.releaseAll(time);
      this.pad.triggerAttack(m.chord, time, 0.5);
      // Heat adds a dissonant note a semitone above the root: the hotter, the louder.
      if (m.tension > 0.5) this.pad.triggerAttack(Tone.Frequency(m.chord[0]).transpose(13).toNote(), time, (m.tension - 0.5) * 0.9);
      this.kick.triggerAttackRelease("C1", "8n", time, 0.4 + m.energy * 0.6);
    }

    const note = m.melody[this.step];
    if (note) {
      this.leadPan.pan.setValueAtTime(m.pans[this.step], time);
      this.lead.triggerAttackRelease(note, "8n", time, 0.5 + m.energy * 0.5);
    }
    if (Math.random() < m.percussion * 0.5) {
      this.spark.triggerAttackRelease("32n", time, 0.3 + Math.random() * 0.4);
    }

    this.step = (this.step + 1) % 8;
    if (this.step === 0 && this.frames.length) {
      // schedule the visual update in sync with the audio clock
      Tone.getDraw().schedule(() => {
        this.index = (this.index + 1) % this.frames.length;
        this.refreshFrame();
      }, time);
    }
  }

  dispose() {
    this.loop?.dispose();
    Tone.getTransport().stop();
    [this.pad, this.lead, this.kick, this.spark, this.filter, this.reverb, this.leadPan, this.master, this.meter].forEach((n) => n.dispose());
  }
}
