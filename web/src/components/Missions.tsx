import { useState } from "react";
import { ACTIONS, KIDS_LINK, MISSIONS } from "../kids";

interface Props {
  completed: string[];
  onReset: () => void;
}

/** A small astronaut that leans over the frame of the mission card. Drawn by hand as SVG; it carries no agency insignia. */
function Astronaut() {
  return (
    <svg className="astronaut" viewBox="0 0 96 104" aria-hidden="true">
      <g stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {/* backpack, body, arms: one waving */}
        <rect x="20" y="52" width="56" height="40" rx="12" fill="#c9d2e3" />
        <rect x="27" y="50" width="42" height="46" rx="14" fill="#fff" />
        <path d="M28 62 C14 60 8 48 12 38" fill="none" stroke="#fff" strokeWidth="11" />
        <path d="M28 62 C14 60 8 48 12 38" fill="none" />
        <path d="M68 64 C80 68 84 78 80 88" fill="none" stroke="#fff" strokeWidth="11" />
        <path d="M68 64 C80 68 84 78 80 88" fill="none" />
        <circle cx="12" cy="36" r="6.5" fill="var(--coral)" />
        <circle cx="80" cy="90" r="6.5" fill="var(--coral)" />
        {/* chest panel with a star */}
        <rect x="38" y="68" width="20" height="14" rx="4" fill="var(--sun)" />
        <path d="M48 70.5 l1.6 3.3 3.6.5 -2.6 2.5 .6 3.6 -3.2-1.7 -3.2 1.7 .6-3.6 -2.6-2.5 3.6-.5z" fill="var(--ink)" stroke="none" />
        {/* helmet and visor */}
        <circle cx="48" cy="32" r="27" fill="#fff" />
        <rect x="27" y="20" width="42" height="27" rx="13" fill="#17223b" />
        <path d="M35 28 q5 -5 12 -4" fill="none" stroke="#8fd3ff" strokeWidth="3.5" />
        <circle cx="41" cy="36" r="2.4" fill="#fff" stroke="none" />
        <circle cx="55" cy="36" r="2.4" fill="#fff" stroke="none" />
        <path d="M43 41 q5 4 10 0" fill="none" stroke="#fff" strokeWidth="2.5" />
      </g>
    </svg>
  );
}

/** Kids mode: the mission to do next, on its own card in the bottom right corner, so the main panel stays uncluttered. */
export default function Missions({ completed, onReset }: Props) {
  const [ideas, setIdeas] = useState(false);
  const next = MISSIONS.find((m) => !completed.includes(m.id));
  return (
    <aside className="mission-card card" aria-label={`Missions: ${completed.length} of ${MISSIONS.length} stars`}>
      <Astronaut />
      <p className="stars" role="img" aria-label={`${completed.length} of ${MISSIONS.length} stars`}>
        {MISSIONS.map((m) => (
          <span key={m.id} className={completed.includes(m.id) ? "won" : ""}>
            {completed.includes(m.id) ? "★" : "☆"}
          </span>
        ))}
      </p>
      {ideas ? (
        <>
          <strong>What can I do?</strong>
          <ul className="actions">
            {ACTIONS.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          <a className="kids-link" href={KIDS_LINK.href} target="_blank" rel="noreferrer">
            {KIDS_LINK.label} ↗
          </a>
        </>
      ) : next ? (
        <>
          <p className="eyebrow">
            Mission {completed.length + 1} of {MISSIONS.length}
          </p>
          <strong>{next.title}</strong>
          <p className="goal">{next.goal}</p>
        </>
      ) : (
        <p className="all-done">You finished every mission. You are an Earth explorer!</p>
      )}
      <p className="mission-links">
        <button className="link" onClick={() => setIdeas(!ideas)}>
          {ideas ? "Back to the mission" : "What can I do?"}
        </button>
        {completed.length > 0 && (
          <button className="link" onClick={onReset}>
            Start missions again
          </button>
        )}
      </p>
    </aside>
  );
}
