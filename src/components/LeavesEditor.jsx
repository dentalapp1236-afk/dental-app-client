import { useState } from "react";
import Icon from "./Icon";
import { formatDate } from "../utils/date";

const todayStr = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

// Editor for leave periods: inclusive date ranges when the doctor is away.
// `value` is an array of { from, to } (YYYY-MM-DD). Patients can't book any day
// inside a leave and are told the doctor is on leave until the `to` date.
export default function LeavesEditor({ value = [], onChange }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const valid = from && to && from <= to;

  const add = () => {
    if (!valid) return;
    onChange([...value, { from, to }].sort((a, b) => a.from.localeCompare(b.from)));
    setFrom("");
    setTo("");
  };

  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="override-editor">
      {value.length > 0 && (
        <ul className="override-list">
          {value.map((l, i) => (
            <li key={`${l.from}-${l.to}`} className="override-row">
              <span className="icon">
                <Icon name="flight" size={16} /> {formatDate(`${l.from}T12:00:00Z`)} –{" "}
                {formatDate(`${l.to}T12:00:00Z`)}
              </span>
              <span className="override-tag off">On leave</span>
              <button
                type="button"
                className="btn-secondary icon override-remove"
                onClick={() => remove(i)}
                aria-label={`Remove leave from ${l.from} to ${l.to}`}
              >
                <Icon name="delete" size={16} /> Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="override-add">
        <label>
          From
          <input
            type="date"
            min={todayStr()}
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              if (to && e.target.value > to) setTo("");
            }}
          />
        </label>
        <label>
          To (last day of leave)
          <input
            type="date"
            min={from || todayStr()}
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <button type="button" className="btn-secondary icon" onClick={add} disabled={!valid}>
          <Icon name="add_circle" size={18} /> Add leave
        </button>
      </div>
    </div>
  );
}
