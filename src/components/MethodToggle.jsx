import Icon from "./Icon";

// Cash / Online segmented selector for how a payment was collected.
export default function MethodToggle({ value, onChange }) {
  return (
    <div className="period-toggle" style={{ marginTop: 4 }}>
      {[
        { v: "cash", label: "Cash", icon: "payments" },
        { v: "online", label: "Online", icon: "account_balance" },
      ].map((m) => (
        <button
          key={m.v}
          type="button"
          className={`icon ${value === m.v ? "active" : ""}`}
          onClick={() => onChange(m.v)}
        >
          <Icon name={m.icon} size={16} /> {m.label}
        </button>
      ))}
    </div>
  );
}
