import type { Visualization } from "../types";

interface Props {
  catalog: Visualization[];
  track: number;
  playing: boolean;
  onSelect: (i: number) => void;
  onToggle: () => void;
}

/** Transport buttons + the jukebox: every visualization is a record. */
export default function Dock({ catalog, track, playing, onSelect, onToggle }: Props) {
  return (
    <nav className="dock glass" aria-label="Jukebox">
      <div className="transport">
        <button className="icon" onClick={() => onSelect(track - 1)} aria-label="Previous visualization">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6zM20 5v14L9 12z" /></svg>
        </button>
        <button className="icon play" onClick={onToggle} aria-label={playing ? "Pause" : "Play"} aria-pressed={playing}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{playing ? <path d="M7 5h4v14H7zM13 5h4v14h-4z" /> : <path d="M7 4v16l13-8z" />}</svg>
        </button>
        <button className="icon" onClick={() => onSelect(track + 1)} aria-label="Next visualization">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5v14l11-7z" /></svg>
        </button>
      </div>
      <ol className="records">
        {catalog.map((v, i) => (
          <li key={v.slug}>
            <button className={`record${i === track && playing ? " spinning" : ""}`} aria-current={i === track} onClick={() => onSelect(i)} title={v.title}>
              <span className="disc">
                <img src={v.frames[Math.floor(v.frames.length / 2)]?.src} alt="" />
              </span>
              <span className="record-title">{v.title}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
