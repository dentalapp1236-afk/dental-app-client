import Icon from "./Icon";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Selectable times in 15-min steps. Value stays 24-hour "HH:MM" (what the API
// expects); the label is shown to the user in 12-hour AM/PM format.
const pad = (n) => String(n).padStart(2, "0");
const TIME_OPTIONS = Array.from({ length: (24 * 60) / 15 }, (_, i) => {
  const mins = i * 15;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return {
    value: `${pad(h)}:${pad(m)}`,
    label: `${((h + 11) % 12) + 1}:${pad(m)} ${h < 12 ? "AM" : "PM"}`,
  };
});

// A 12-hour time dropdown that stores a 24-hour "HH:MM" value. If the current
// value isn't on the 15-min grid (e.g. legacy data), it's shown as-is so it
// isn't silently lost.
function TimeSelect({ value, onChange, ariaLabel }) {
  const known = TIME_OPTIONS.some((o) => o.value === value);
  return (
    <select
      className="time-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
    >
      {!known && value && <option value={value}>{value}</option>}
      {TIME_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// Per-day clinic hours editor. `value` is an array of { day, start, end }.
// Each weekday can be toggled open/closed and given its own opening/closing time.
export default function AvailabilityEditor({ value = [], onChange }) {
  const byDay = {};
  value.forEach((v) => { byDay[v.day] = v; });

  const toggle = (day) => {
    if (byDay[day]) onChange(value.filter((v) => v.day !== day));
    else onChange([...value, { day, start: "09:00", end: "17:00" }]);
  };
  const setTime = (day, field, t) =>
    onChange(value.map((v) => (v.day === day ? { ...v, [field]: t } : v)));

  return (
    <div className="avail-editor">
      {WEEKDAYS.map((day) => {
        const row = byDay[day];
        const open = !!row;
        return (
          <div className={`avail-row${open ? " open" : ""}`} key={day}>
            <button
              type="button"
              className={`avail-day${open ? " on" : ""}`}
              onClick={() => toggle(day)}
              aria-pressed={open}
            >
              <Icon name={open ? "check_circle" : "radio_button_unchecked"} size={18} /> {day}
            </button>
            {open ? (
              <div className="avail-times">
                <TimeSelect
                  value={row.start}
                  onChange={(t) => setTime(day, "start", t)}
                  ariaLabel={`${day} opening time`}
                />
                <span className="avail-dash">–</span>
                <TimeSelect
                  value={row.end}
                  onChange={(t) => setTime(day, "end", t)}
                  ariaLabel={`${day} closing time`}
                />
              </div>
            ) : (
              <span className="muted">Closed</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
