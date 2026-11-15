import { ACTIONS, KIDS_LINK, MISSIONS } from "../kids";

interface Props {
  completed: string[];
  onReset: () => void;
}

export default function Missions({ completed, onReset }: Props) {
  return (
    <div className="missions">
      <h2>
        Missions <span className="count">{completed.length} / {MISSIONS.length}</span>
      </h2>
      <ol>
        {MISSIONS.map((m) => {
          const done = completed.includes(m.id);
          return (
            <li key={m.id} className={done ? "done" : ""}>
              <span className="badge" aria-hidden="true">
                {done ? "★" : "☆"}
              </span>
              <div>
                <strong>{m.title}</strong>
                <p>{done ? m.learned : m.goal}</p>
                <span className="sr-only">{done ? "Completed" : "Not completed yet"}</span>
              </div>
            </li>
          );
        })}
      </ol>
      {completed.length > 0 && (
        <button className="link" onClick={onReset}>
          Start missions again
        </button>
      )}

      <h2>What can I do?</h2>
      <ul className="actions">
        {ACTIONS.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
      <a className="kids-link" href={KIDS_LINK.href} target="_blank" rel="noreferrer">
        {KIDS_LINK.label} ↗
      </a>
    </div>
  );
}
