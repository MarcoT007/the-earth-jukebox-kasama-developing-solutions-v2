import { ACTIONS, KIDS_LINK, MISSIONS } from "../kids";

interface Props {
  completed: string[];
  onReset: () => void;
}

export default function Missions({ completed, onReset }: Props) {
  return (
    <div className="missions">
      <details name="missions" className="fold" open>
        <summary>
          <b>Missions</b>
          <span className="count">{completed.length} / {MISSIONS.length} stars</span>
        </summary>
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

      </details>
      <details name="missions" className="fold">
        <summary>
          <b>What can I do?</b>
          <span>3 ideas</span>
        </summary>
      <ul className="actions">
        {ACTIONS.map((a) => (
          <li key={a}>{a}</li>
        ))}
      </ul>
      <a className="kids-link" href={KIDS_LINK.href} target="_blank" rel="noreferrer">
        {KIDS_LINK.label} ↗
      </a>
      </details>
    </div>
  );
}
