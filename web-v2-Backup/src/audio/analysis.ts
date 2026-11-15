/**
 * Read-only taps on the master output, used by the visualizers
 * (sound ring around the planet, waveform in the modulator).
 */
import * as Tone from "tone";

let fft: Tone.FFT | null = null;
let wave: Tone.Waveform | null = null;
const spectrum = new Float32Array(64);

/** Spectrum normalised to 0..1 (low frequencies first). */
export function getSpectrum(): Float32Array {
  if (!fft) {
    fft = new Tone.FFT({ size: 64, smoothing: 0.75 });
    Tone.getDestination().connect(fft);
  }
  const db = fft.getValue();
  for (let i = 0; i < spectrum.length; i++) {
    const v = (db[i] + 95) / 75; // roughly -95 dB .. -20 dB
    spectrum[i] = v > 0 ? Math.min(1, v) : 0;
  }
  return spectrum;
}

/** Raw waveform samples, -1..1. */
export function getWaveform(): Float32Array {
  if (!wave) {
    wave = new Tone.Waveform(256);
    Tone.getDestination().connect(wave);
  }
  return wave.getValue();
}
