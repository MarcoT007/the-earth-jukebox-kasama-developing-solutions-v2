import { useRef } from "react";

interface Props {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}

const SWEEP = 270; // degrees of travel
const R = 26;
const C = 2 * Math.PI * R;

/** Rotary control. Drag up/down, use arrow keys, or double-click to reset. */
export default function Knob({ label, hint, value, min, max, step, defaultValue, format, onChange }: Props) {
  const drag = useRef<{ y: number; start: number } | null>(null);
  const t = (value - min) / (max - min);
  const text = format ? format(value) : value.toFixed(step < 1 ? 2 : 0);
  const id = `knob-${label.toLowerCase().replace(/\W+/g, "-")}`;

  const set = (v: number) => {
    const snapped = Math.round(v / step) * step;
    onChange(Math.min(max, Math.max(min, Number(snapped.toFixed(4)))));
  };

  const onKey = (e: React.KeyboardEvent) => {
    const big = (max - min) / 10;
    const moves: Record<string, number> = {
      ArrowUp: value + step,
      ArrowRight: value + step,
      ArrowDown: value - step,
      ArrowLeft: value - step,
      PageUp: value + big,
      PageDown: value - big,
      Home: min,
      End: max,
    };
    if (e.key in moves) {
      e.preventDefault();
      set(moves[e.key]);
    }
  };

  return (
    <div className="knob">
      <div
        className="knob-dial"
        role="slider"
        tabIndex={0}
        aria-labelledby={`${id}-label`}
        aria-describedby={hint ? `${id}-hint` : undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={text}
        onKeyDown={onKey}
        onDoubleClick={() => set(defaultValue)}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { y: e.clientY, start: value };
        }}
        onPointerMove={(e) => {
          if (drag.current) set(drag.current.start + ((drag.current.y - e.clientY) / 140) * (max - min));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <g transform="rotate(135 32 32)">
            <circle className="knob-track" cx="32" cy="32" r={R} strokeDasharray={`${(C * SWEEP) / 360} ${C}`} />
            <circle className="knob-value" cx="32" cy="32" r={R} strokeDasharray={`${(C * SWEEP * t) / 360} ${C}`} />
          </g>
          <g transform={`rotate(${-135 + t * SWEEP} 32 32)`}>
            <circle className="knob-cap" cx="32" cy="32" r="18" />
            <line className="knob-pointer" x1="32" y1="18" x2="32" y2="25" />
          </g>
        </svg>
      </div>
      <span className="knob-label" id={`${id}-label`}>
        {label}
      </span>
      <output className="knob-output">{text}</output>
      {hint && (
        <span className="sr-only" id={`${id}-hint`}>
          {hint}
        </span>
      )}
    </div>
  );
}
