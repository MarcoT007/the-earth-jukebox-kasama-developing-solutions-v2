import { KID_STORIES } from "../kids";
import { KIND_HELP, RECORD_INFO, recordName } from "../records";
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
  step: () => number;
  playing: boolean;
  frames: FrameFeatures[] | undefined; // what is playing: the whole map, or the zone in focus
  zone: Zone | null; // zone in focus, when this record supports it
  focus: string | null; // zone the listener asked for
  inView: string | null; // zone facing the viewer on the globe
  onFocus: (id: string | null) => void;
}

/** Only one section is open at a time, so the panel never needs to scroll. */
function Fold({ title, value, open, children }: { title: string; value?: string; open?: boolean; children: React.ReactNode }) {
  return (
    <details name="playing" open={open} className="fold">
      <summary>
        <b>{title}</b>
        {value && <span>{value}</span>}
      </summary>
      {children}
    </details>
  );
}

export default function NowPlaying({ viz, frame, scenario, onSeek, onScenario, description, kids, music, layers, step, playing, frames: live, zone, focus, inView, onFocus }: Props) {
  if (!viz) return <p>Loading visualizations…</p>;
  const frames = live ?? (viz.scenarios ? viz.scenarios[scenario].frames : viz.frames);
  const canFocus = viz.projection === "equirect";
  const seen = zoneById(inView);
  const f = frames[frame];
  const year = f?.year;
  const active = viz.scenarios?.[scenario];
  const short = (label: string) => label.replace(" emissions", "");
  const info = RECORD_INFO[viz.slug];
  const name = recordName(viz);

  return (
    <div className="now-playing" key={viz.slug}>
      <h3 title={name}>{name}</h3>
      {info && (
        <p className={`np-kind ${info.kind}`} title={KIND_HELP[info.kind]}>
          <b>{info.kindLabel}</b>
          <span className="sr-only">. {KIND_HELP[info.kind]}</span>
        </p>
      )}

      <div className="np-time">
        {year !== undefined && <strong aria-hidden="true">{year}</strong>}
        <label className="scrub">
          <span>
            <span className="eyebrow">{year !== undefined ? (year <= 2014 ? "Year · model of the past" : "Year · projection") : kids ? "Picture" : "Frame"}</span>
            {year === undefined && <output>{`${String(frame + 1).padStart(2, "0")} / ${frames.length}`}</output>}
          </span>
          <input
            type="range"
            min={0}
            max={frames.length - 1}
            value={frame}
            aria-valuetext={year !== undefined ? String(year) : `Frame ${frame + 1} of ${frames.length}`}
            onChange={(e) => onSeek(Number(e.target.value))}
          />
        </label>
      </div>
      {active && f && (
        <div className="np-heat">
          <div className="heat" aria-hidden="true">
            <div style={{ width: `${(f.heat ?? 0) * 100}%` }} />
          </div>
          <p className="heat-label">
            {zone ? `Warming of ${zone.label} since 1950` : "Land heat index"}: <b>{Math.round((f.heat ?? 0) * 100)}</b> / 100
          </p>
        </div>
      )}

      {active && (
        <Fold title="Emissions" value={short(active.label)} open>
          <div className="scenarios" role="radiogroup" aria-label="Emissions scenario">
            {viz.scenarios!.map((s, i) => (
              <button key={s.id} role="radio" aria-checked={i === scenario} onClick={() => onScenario(i)} className={`s${i}`} title={s.blurb}>
                <b>{short(s.label)}</b>
                {!kids && <small>{s.code}</small>}
              </button>
            ))}
          </div>
          <p className="blurb">{active.blurb}</p>
        </Fold>
      )}

      <Fold title="Zone" value={zone ? zone.label : canFocus ? "Whole planet" : "not for this record"}>
        {canFocus ? (
          <div className="zone-pick">
            <select aria-label="Zone: part of the planet the music reads" value={zone?.id ?? ""} onChange={(e) => onFocus(e.target.value || null)}>
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
          </div>
        ) : (
          <p className="empty">
            {focus ? "Your zone is kept for the map records. " : ""}This record is a camera view, not a map, so it cannot be cut into zones.
          </p>
        )}
      </Fold>

      <Fold title={kids ? "Picture to sound" : "Picture → sound"} value="what is playing" open={!active}>
        {f && (
          <ScanView
            zone={zone}
            src={f.src}
            alt={`Frame ${frame + 1} of ${name}. ${description}`}
            music={music}
            layers={layers}
            step={step}
            playing={playing}
            equirect={viz.projection === "equirect"}
            kids={kids}
            heat={!!f.warmGrid}
          />
        )}
      </Fold>

      <Fold title="About" value={viz.scenarios ? "is this a real prediction?" : "is it real? how to read it"}>
        <div className="about">
          {kids && KID_STORIES[viz.slug] ? <p>{KID_STORIES[viz.slug]}</p> : <p>{info ? info.basis : viz.description}</p>}
          {info && (
            <p className="read">
              <b>How to read it:</b> {info.read}
            </p>
          )}
          <a href={viz.sourceUrl} target="_blank" rel="noreferrer" title={viz.title}>
            {viz.map ? "Inspired by" : "Source:"} NASA Scientific Visualization Studio #{viz.svsId}
          </a>
          {viz.map && (
            <a href={viz.map.sourceUrl} target="_blank" rel="noreferrer" title={`${viz.map.credits}. Layers: ${viz.map.layers.join(", ")}`}>
              Map on the globe: {viz.map.provider ?? "NASA GIBS"} · {viz.map.span}
            </a>
          )}
        </div>
      </Fold>

      <p className="sr-only" aria-live="polite">
        {description}
      </p>
    </div>
  );
}
