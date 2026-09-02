const HOURS = Array.from({ length: 12 }, (_, i) => i + 1); // 1..12
const MINUTES = Array.from({ length: 60 }, (_, i) => i); // 0..59

const to12 = (hhmm) => {
  const [h, m] = (hhmm || "09:00").split(":").map(Number);
  return { hour: ((h + 11) % 12) + 1, minute: m || 0, period: h < 12 ? "AM" : "PM" };
};

const to24 = (hour, minute, period) => {
  const h = (hour % 12) + (period === "PM" ? 12 : 0);
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

// Always renders a 12-hour clock (hour / minute / AM-PM), independent of the
// device's locale — unlike native <input type="time">, whose 12h vs 24h display
// is decided by the OS and can't be forced via HTML/CSS. Emits/accepts the same
// "HH:MM" 24-hour string the rest of the app already stores.
export default function TimeInput12h({ value, onChange }) {
  const { hour, minute, period } = to12(value);

  return (
    <div className="time12">
      <select
        aria-label="Hour"
        value={hour}
        onChange={(e) => onChange(to24(Number(e.target.value), minute, period))}
      >
        {HOURS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="time12-colon">:</span>
      <select
        aria-label="Minute"
        value={minute}
        onChange={(e) => onChange(to24(hour, Number(e.target.value), period))}
      >
        {MINUTES.map((m) => (
          <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
        ))}
      </select>
      <select
        aria-label="AM or PM"
        value={period}
        onChange={(e) => onChange(to24(hour, minute, e.target.value))}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
}
