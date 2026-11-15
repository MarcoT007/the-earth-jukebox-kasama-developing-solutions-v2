import { useEffect, useState } from "react";
import type { NewsData } from "./News";

interface Props {
  news: NewsData | null;
  region: string | null; // region of the planet facing the viewer
  kids: boolean;
  paused: boolean; // reduced motion: do not rotate headlines
  onOpen: () => void;
}

/** A headline that is always in view, so the news is never hidden behind a tab. */
export default function Ticker({ news, region, kids, paused, onOpen }: Props) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setN((v) => v + 1), 7000);
    return () => clearInterval(t);
  }, [paused]);

  if (!news) return <span className="ticker" />;
  const local = !kids && region ? news.regions[region] : undefined;
  const items = local?.items.length ? local.items : news.global;
  if (!items.length) return <span className="ticker" />;
  const item = items[n % Math.min(items.length, 6)];

  return (
    <button className="ticker" onClick={onOpen} aria-label={`Open news. Latest: ${item.title}`}>
      <span className="ticker-tag">
        <span className="dot" aria-hidden="true" />
        {local ? local.label : "NASA"}
      </span>
      <span className="ticker-text" key={item.url}>
        {item.title}
      </span>
      <span className="ticker-more" aria-hidden="true">
        News →
      </span>
    </button>
  );
}
