import { KID_STORIES } from "../kids";
import type { Visualization } from "../types";

interface Props {
  viz: Visualization | undefined;
  frame: number;
  scenario: number;
  onSeek: (i: number) => void;
  onScenario: (i: number) => void;
  description: string;
  kids: boolean;
}

export default function NowPlaying({ viz, frame, scenario, onSeek, onScenario, description, kids }: Props) {
  if (!viz) return <p>Loading visualizations…</p>;
  const frames = viz.scenarios ? viz.scenarios[scenario].frames : viz.frames;
  const f = frames[frame];
  const year = f?.year;
  const active = viz.scenarios?.[scenario];

  return (
    <div className="now-playing">
      {viz.scenarios && <span className="tag real">Real NASA climate data</span>}
      <h3>{viz.title}</h3>

      {active && year !== undefined ? (
        <div className="machine">
          <div className="year" aria-live="off">
            <strong>{year}</strong>
            <span>{year <= 2014 ? "Model reconstruction of the past" : "Model projection"}</span>
          </div>
          <div className="heat" aria-hidden="true">
            <div style={{ width: `${(f.heat ?? 0) * 100}%` }} />
          </div>
          <p className="heat-label">
            Land heat index: <b>{Math.round((f.heat ?? 0) * 100)}</b> / 100
          </p>
          <div className="scenarios" role="radiogroup" aria-label="Emissions scenario">
            {viz.scenarios!.map((s, i) => (
              <button key={s.id} role="radio" aria-checked={i === scenario} onClick={() => onScenario(i)} className={`s${i}`}>
                <b>{kids ? s.label.replace(" emissions", "") : s.label}</b>
                {!kids && <small>{s.code}</small>}
              </button>
            ))}
          </div>
          <p className="blurb">{active.blurb}</p>
        </div>
      ) : (
        f && <img className="cover" src={f.src} alt={`Frame ${frame + 1} of ${viz.title}. ${description}`} />
      )}

      {kids && KID_STORIES[viz.slug] && (
        <div className="story">
          <span className="eyebrow">What am I hearing?</span>
          <p>{KID_STORIES[viz.slug]}</p>
        </div>
      )}
      <p className="live" aria-live="polite">
        {description}
      </p>
      <label className="scrub">
        <span>
          <span className="eyebrow">{year !== undefined ? "Year" : kids ? "Picture" : "Frame"}</span>
          <output>{year !== undefined ? year : `${String(frame + 1).padStart(2, "0")} / ${frames.length}`}</output>
        </span>
        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={frame}
          aria-valuetext={year !== undefined ? String(year) : undefined}
          onChange={(e) => onSeek(Number(e.target.value))}
        />
      </label>
      <details open={!!viz.scenarios && !kids}>
        <summary>{viz.scenarios ? "Is this a real prediction?" : "About this visualization"}</summary>
        <p>{viz.description}</p>
        <a href={viz.sourceUrl} target="_blank" rel="noreferrer">
          Source: NASA Scientific Visualization Studio #{viz.svsId}
        </a>
      </details>
    </div>
  );
}
