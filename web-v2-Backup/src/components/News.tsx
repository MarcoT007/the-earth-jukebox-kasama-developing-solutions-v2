import { useState } from "react";

export interface Item {
  title: string;
  url: string;
  source: string;
  date: string;
}
export interface NewsData {
  updated: string;
  global: Item[];
  regions: Record<string, { label: string; items: Item[] }>;
}

interface Props {
  data: NewsData | null;
  regionInView: string | null;
  kids: boolean;
}

function ago(iso: string): string {
  if (!iso) return "";
  const hours = Math.max(0, (Date.now() - new Date(iso).getTime()) / 36e5);
  if (hours < 1) return "just now";
  if (hours < 24) return `${Math.round(hours)} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

function List({ items }: { items: Item[] }) {
  if (!items.length) return <p className="empty">No headlines right now.</p>;
  return (
    <ul className="news-list">
      {items.map((i) => (
        <li key={i.url}>
          <a href={i.url} target="_blank" rel="noreferrer">
            {i.title}
          </a>
          <span className="meta">
            {i.source}
            {i.date && ` · ${ago(i.date)}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function News({ data, regionInView, kids }: Props) {
  const [choice, setChoice] = useState("auto");

  if (!data) return <p>Loading news…</p>;
  const id = choice === "auto" ? regionInView : choice;
  const region = id ? data.regions[id] : undefined;

  return (
    <div className="news">
      {!kids && (
        <section aria-live="polite">
          <h2>Climate news · {region ? region.label : "open ocean in view"}</h2>
          <label className="region-pick">
            <span className="eyebrow">Region</span>
            <select value={choice} onChange={(e) => setChoice(e.target.value)}>
              <option value="auto">Follow the globe</option>
              {Object.entries(data.regions).map(([rid, r]) => (
                <option key={rid} value={rid}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
          {region ? <List items={region.items.slice(0, 6)} /> : <p className="empty">Spin the globe toward land to see local climate headlines.</p>}
        </section>
      )}

      <section>
        <h2>{kids ? "Earth stories from NASA" : "From NASA"}</h2>
        <List items={data.global.slice(0, kids ? 8 : 6)} />
      </section>

      <p className="news-note">
        {!kids && "Regional headlines via Google News; links open external sites. "}
        {data.updated && `Updated ${ago(data.updated)}.`}
      </p>
    </div>
  );
}
