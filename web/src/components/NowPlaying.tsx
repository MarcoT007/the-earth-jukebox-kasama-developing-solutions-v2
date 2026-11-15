import { KID_STORIES } from "../kids";
import type { MusicalFrame } from "../audio/mapping";
import type { FrameFeatures, Layers, Visualization } from "../types";
import { ZONES, zoneById, type Zone } from "../zones";
import ScanView from "./ScanView";

interface Props {
  viz: Visualization | undefined;
  frame: number;
  scenario: number;
  onSeek: (i: number) => void;
  onScenario: (i: number) => void;
  description: string;
  kids: boolean;
  music: MusicalFrame | null;
  layers: Layers;
  onLayers: (l: Layers) => void;
  step: () => number;
  playing: boolean;
  frames: FrameFeatures[] | undefined; // what is playing: the whole map, or the zone in focus
  zone: Zone | null; // zone in focus, when this record supports it
  focus: string | null; // zone the listener asked for
  inView: string | null; // zone facing the viewer on the globe
  onFocus: (id: string | null) => void;
}

export default function NowPlaying({ viz, frame, scenario, onSeek, onScenario, description, kids, music, layers, onLayers, step, playing, frames: live, zone, focus, inView, onFocus }: Props) {
  if (!viz) return <p>Loading visualizations…</p>;
  const frames = live ?? (viz.scenarios ? viz.scenarios[scenario].frames : viz.frames);
  const canFocus = viz.projection === "equirect";
  const seen = zoneById(inView);
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
            {zone ? `Warming of ${zone.label} since 1950` : "Land heat index"}: <b>{Math.round((f.heat ?? 0) * 100)}</b> / 100
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
      ) : null}
      <div className={`zone-pick${zone ? " on" : ""}`}>
        <label htmlFor="zone">
          <b className="control-title">Zone</b>
          <span>{kids ? "Which part of Earth makes the music" : "Part of the planet the music reads"}</span>
        </label>
        {canFocus ? (
          <>
            <select id="zone" value={zone?.id ?? ""} onChange={(e) => onFocus(e.target.value || null)}>
              <option value="">Whole planet</option>
              {ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
            {seen && seen.id !== zone?.id && (
              <button className="zone-here" onClick={() => onFocus(seen.id)}>
                Focus on what I see: {seen.label}
              </button>
            )}
            {zone && (
              <button className="zone-here back" onClick={() => onFocus(null)}>
                Back to the whole planet
              </button>
            )}
          </>
        ) : (
          <p className="empty">
            {focus ? "Your zone is kept for the map records. " : ""}This record is a camera view, not a map, so it cannot be cut into zones. Zones work in the Time Machine, the
            sea surface currents and the lightning records.
          </p>
        )}
      </div>
      {f && (
        <ScanView
          zone={zone}
          src={f.src}
          alt={`Frame ${frame + 1} of ${viz.title}. ${description}`}
          music={music}
          layers={layers}
          onLayers={onLayers}
          step={step}
          playing={playing}
          equirect={viz.projection === "equirect"}
          kids={kids}
          heat={!!f.warmGrid}
        />
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
