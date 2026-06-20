import Icon from "./Icon";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
                <input
                  type="time"
                  value={row.start}
                  onChange={(e) => setTime(day, "start", e.target.value)}
                />
                <span className="avail-dash">–</span>
                <input
                  type="time"
                  value={row.end}
                  onChange={(e) => setTime(day, "end", e.target.value)}
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
