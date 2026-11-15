import { useEffect, useRef } from "react";
import { getWaveform } from "../audio/analysis";
import type { Controls, WaveShape } from "../types";

interface Props {
  controls: Controls;
  onChange: (c: Controls) => void;
}

const TEMPO_MIN = 50;
const TEMPO_MAX = 160;

/** One cycle of each waveform, phase 0..1 -> -1..1. */
const SHAPES: Record<WaveShape, (p: number) => number> = {
  sine: (p) => Math.sin(p * Math.PI * 2),
  triangle: (p) => 1 - 4 * Math.abs(((p + 0.25) % 1) - 0.5),
  square: (p) => (p % 1 < 0.5 ? 1 : -1),
  sawtooth: (p) => 2 * (p % 1) - 1,
};

/**
 * The wave you can grab. Drag up/down to change its height (energy),
 * left/right to squeeze or stretch it (tempo). The thin line is the real sound.
 * The same values are available as knobs below for keyboard and screen-reader users.
 */
export default function WavePad({ controls, onChange }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const latest = useRef(controls);
  latest.current = controls;
  const dragging = useRef(false);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const css = getComputedStyle(canvas);
    const wave = css.getPropertyValue("--coral").trim() || "#e2542d";
    const ink = css.getPropertyValue("--ink").trim() || "#17233b";
    let raf = 0;
    let phase = 0;
    const draw = () => {
      const { width: w, height: h } = canvas;
      const c = latest.current;
      ctx.clearRect(0, 0, w, h);

      // the wave the user controls
      const cycles = 1.5 + ((c.tempo - TEMPO_MIN) / (TEMPO_MAX - TEMPO_MIN)) * 5;
      const amp = (0.08 + c.energy * 0.9) * (h / 2 - 8);
      phase += (c.tempo / 60) * 0.004;
      ctx.lineWidth = 6;
      ctx.lineJoin = "round";
      ctx.strokeStyle = wave;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 2) {
        const y = h / 2 - SHAPES[c.shape]((x / w) * cycles + phase) * amp;
        if (x) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();

      // the real audio signal
      const data = getWaveform();
      ctx.lineWidth = 2;
      ctx.strokeStyle = ink;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      for (let i = 0; i < data.length; i++) {
        const x = (i / (data.length - 1)) * w;
        const y = h / 2 - data[i] * h * 1.4;
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const update = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
    onChange({ ...latest.current, energy: Number(y.toFixed(2)), tempo: Math.round(TEMPO_MIN + x * (TEMPO_MAX - TEMPO_MIN)) });
  };

  return (
    <canvas
      ref={ref}
      className="wavepad"
      width={520}
      height={300}
      aria-hidden="true"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        dragging.current = true;
        update(e);
      }}
      onPointerMove={(e) => dragging.current && update(e)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    />
  );
}
