import { useEffect, useState } from "react";
import { RECORD_INFO } from "../records";
import type { Story } from "../stories";

interface ListProps {
  stories: Story[];
  playing: { id: string; part: number } | null;
  onPlay: (s: Story, part: number) => void;
  onStop: () => void;
}

/** The Stories tab: one card per story, a button per language, with what it plays, who speaks and where the facts come from. */
export default function Stories({ stories, playing, onPlay, onStop }: ListProps) {
  // One story open at a time, so the panel never needs to scroll; a story that starts playing opens itself.
  const [open, setChosen] = useState(stories[0]?.id ?? null);
  const playingId = playing?.id;
  useEffect(() => {
    if (playingId) setChosen(playingId);
  }, [playingId]);
  return (
    <div className="stories">
      {stories.map((s) => {
        const on = s.id === playing?.id;
        if (s.id !== open)
          return (
            <button key={s.id} className="story-row" aria-expanded={false} onClick={() => setChosen(s.id)}>
              <span className="eyebrow">
                {s.place} · {s.when}
              </span>
              <b>{s.title}</b>
            </button>
          );
        return (
          <article key={s.id} className={`voice-story${on ? " on" : ""}`}>
            <p className="eyebrow">
              {s.place} · {s.when}
            </p>
            <h3>{s.title}</h3>
            <p className="blurb">{s.blurb}</p>
            <div className="story-langs" role="group" aria-label={`Hear "${s.title}"`}>
              {s.parts.map((p, i) => {
                const active = on && playing?.part === i;
                return (
                  <button key={p.lang} className="story-play" lang={p.lang} aria-pressed={active} aria-label={active ? `Stop: ${p.label}` : p.cta} onClick={() => (active ? onStop() : onPlay(s, i))}>
                    <svg viewBox="0 0 24 24" aria-hidden="true">{active ? <path d="M6 6h12v12H6z" /> : <path d="M7 4v16l13-8z" />}</svg>
                    {p.label}
                  </button>
                );
              })}
            </div>
            <p className="story-meta">
              Plays over <b>{RECORD_INFO[s.record]?.name ?? s.recordLabel}</b>. Sources:{" "}
              {s.sources.map((src, i) => (
                <span key={src.url}>
                  {i > 0 && ", "}
                  <a href={src.url} target="_blank" rel="noreferrer">
                    {src.label}
                  </a>
                </span>
              ))}
              .
            </p>
          </article>
        );
      })}
      <p className="news-note">The voices are AI-generated (ElevenLabs). The words were written by the team from the sources listed.</p>
    </div>
  );
}

interface CaptionProps {
  story: Story;
  part: number;
  audio: () => HTMLAudioElement | null;
  onStop: () => void;
}

/** Captions over the planet while a story plays: the sentence being spoken, in its own language. */
export function StoryCaptions({ story, part, audio, onStop }: CaptionProps) {
  const p = story.parts[part];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    // The clips carry no timing, so each sentence gets a share of the clip in proportion to its length.
    const total = p.sentences.reduce((n, s) => n + s.length, 0);
    const id = setInterval(() => {
      const a = audio();
      if (!a || !a.duration) return;
      let chars = (a.currentTime / a.duration) * total;
      let i = 0;
      while (i < p.sentences.length - 1 && chars > p.sentences[i].length) chars -= p.sentences[i++].length;
      setIndex(i);
    }, 200);
    return () => clearInterval(id);
  }, [p, audio]);

  return (
    <div className="captions" role="region" aria-label={`Story: ${story.title}`}>
      <p className="eyebrow">
        {story.place} · {p.label}
      </p>
      <p className="caption-line" lang={p.lang} dir="auto" aria-hidden="true">
        {p.sentences[Math.min(index, p.sentences.length - 1)]}
      </p>
      <button className="caption-stop" onClick={onStop}>
        Stop
      </button>
    </div>
  );
}
