import { useEffect, useRef } from "react";
import type { MusicalFrame } from "../audio/mapping";
import type { Layers } from "../types";
import { zoneBackground, type Zone } from "../zones";

interface Props {
  src: string;
  alt: string;
  music: MusicalFrame | null;
  layers: Layers;
  step: () => number; // step currently sounding, 0..7
  playing: boolean;
  equirect: boolean; // true when left/right and top/bottom are really west/east and north/south
  kids: boolean;
  zone: Zone | null; // show and play only this zone of the map
  heat: boolean; // time machine: the cells hold temperature data, not brightness
}

const ROWS = 4;
const COLS = 8;

/**
 * The "score": the picture that is playing, cut into the same 8 x 4 cells the music reads.
 * The cell that is sounding lights up, silent columns fade, and sparkle columns carry a dot,
 * so every change made to the sound is visible on the picture.
 */
export default function ScanView({ src, alt, music, layers, step, playing, equirect, kids, heat, zone }: Props) {
  const grid = useRef<HTMLDivElement>(null);
  const latest = useRef({ music, layers, playing });
  latest.current = { music, layers, playing };

  useEffect(() => {
    let raf = 0;
    let shown = -2;
    const draw = () => {
      const { music: m, layers: l, playing: p } = latest.current;
      const now = p && m && l.melody && m.melody[step()] ? step() * ROWS + m.rows[step()] : -1;
      if (now !== shown && grid.current) {
        grid.current.querySelector(".now")?.classList.remove("now");
        if (now >= 0) grid.current.children[Math.floor(now / ROWS)]?.children[now % ROWS]?.classList.add("now");
        shown = now;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [step]);

  return (
    <div className="scan">
      <div className="scan-picture">
        {zone ? <div className="scan-zone" role="img" aria-label={`${zone.label}. ${alt}`} style={zoneBackground(src, zone)} /> : <img src={src} alt={alt} />}
        <div className="scan-grid" ref={grid} aria-hidden="true">
          {Array.from({ length: COLS }, (_, col) => {
            const silent = !music || !layers.melody || !music.melody[col];
            return (
              <div key={col} className={`scan-col${silent ? " silent" : ""}`}>
                {Array.from({ length: ROWS }, (_, row) => (
                  <span key={row} className={music && music.rows[col] === row && !silent ? "sings" : ""} />
                ))}
                {music?.beats[col] && layers.beat && <i />}
              </div>
            );
          })}
        </div>
      </div>
      <p className="scan-help">
        {kids
          ? "The glowing square is the note you hear. Higher up means a higher note."
          : heat
            ? "Lit cell = the note you hear. The hottest land of each strip sings, higher as it warms; dots mark the fastest-warming strips."
            : `Lit cell = the note you hear: ${equirect ? "west to east" : "left to right"} in time, ${equirect ? "north" : "top"} is high. Faded strips are silent; dots are sparkles.`}
      </p>
    </div>
  );
}
