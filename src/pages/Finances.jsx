import { useEffect, useState } from "react";
import api from "../api/axios";
import { formatDate } from "../utils/date";
import Icon from "../components/Icon";

const money = (n) => `Rs ${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const PERIODS = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

const CARDS = [
  { key: "collected", label: "Collected", icon: "payments", cls: "earned" },
  { key: "expenses", label: "Expenses", icon: "shopping_cart_checkout", cls: "spent" },
  { key: "outstanding", label: "Outstanding", icon: "pending_actions", cls: "pending" },
];

export default function Finances() {
  const [period, setPeriod] = useState("day");
  const [offset, setOffset] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null); // "collected" | "expenses" | "outstanding"

  const load = () =>
    api
      .get("/finances/period", { params: { period, offset }, skipLoader: true })
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, offset]);

  const markPaid = async (id) => {
    await api.put(`/treatments/${id}`, { paid: true });
    await load();
  };

  return (
    <div className="page">
      <h1 className="icon"><Icon name="payments" /> Finances</h1>

      <div className="period-toggle">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            type="button"
            className={period === p.key ? "active" : ""}
            onClick={() => { setPeriod(p.key); setOffset(0); }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="period-nav" style={{ maxWidth: 460, marginTop: 12 }}>
        <button type="button" className="icon" aria-label="Previous" onClick={() => setOffset((o) => o + 1)}>
          <Icon name="chevron_left" />
        </button>
        <span className="period-label">
          {data ? data.label : "…"}
          {offset === 0 && <span className="muted"> · current</span>}
        </span>
        <button
          type="button"
          className="icon"
          aria-label="Next"
          disabled={offset === 0}
          onClick={() => setOffset((o) => Math.max(0, o - 1))}
        >
          <Icon name="chevron_right" />
        </button>
      </div>

      <div className="fin-cards">
        {CARDS.map((c) => {
          const section = data?.[c.key];
          const count = section?.items?.length || 0;
          return (
            <button
              key={c.key}
              type="button"
              className={`fin-card ${c.cls}`}
              onClick={() => count && setDetail(c.key)}
              disabled={loading}
            >
              <Icon name={c.icon} size={26} />
              <div className="fin-card-value">{money(section?.total || 0)}</div>
              <div className="fin-card-label">{c.label}</div>
              <div className="fin-card-meta">
                {count} {count === 1 ? "item" : "items"}{count ? " · tap for details" : ""}
              </div>
            </button>
          );
        })}
      </div>

      {detail && data && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3 className="icon">
                <Icon name={CARDS.find((c) => c.key === detail).icon} size={18} />{" "}
                {CARDS.find((c) => c.key === detail).label} · {data.label}
              </h3>
              <button type="button" className="modal-close" aria-label="Close" onClick={() => setDetail(null)}>
                <Icon name="close" />
              </button>
            </div>

            {data[detail].items.length === 0 ? (
              <p className="muted">Nothing in this period.</p>
            ) : (
              <div className="fin-detail-list">
                {detail === "collected" &&
                  data.collected.items.map((it, i) => (
                    <div key={i} className="fin-detail-row">
                      <div>
                        <strong>{money(it.amount)}</strong>
                        <div className="muted" style={{ fontSize: 13 }}>
                          {formatDate(it.date)} · {it.client || "—"}
                          {it.procedure ? ` · ${it.procedure}` : ""}
                          {it.note ? ` · ${it.note}` : ""}
                        </div>
                      </div>
                      {it.method && (
                        <span className="tag">{it.method === "online" ? "Online" : "Cash"}</span>
                      )}
                    </div>
                  ))}

                {detail === "expenses" &&
                  data.expenses.items.map((it, i) => (
                    <div key={i} className="fin-detail-row">
                      <div>
                        <strong>{money(it.amount)}</strong>
                        <div className="muted" style={{ fontSize: 13 }}>
                          {formatDate(it.date)} · {it.title}
                          {it.category ? ` · ${it.category}` : ""}
                        </div>
                      </div>
                      <span className="tag">{it.kind === "supply" ? "Supplies" : "Maintenance"}</span>
                    </div>
                  ))}

                {detail === "outstanding" &&
                  data.outstanding.items.map((it) => (
                    <div key={it._id} className="fin-detail-row">
                      <div>
                        <strong>{money(it.balance)}</strong> <span className="muted">of {money(it.cost)}</span>
                        <div className="muted" style={{ fontSize: 13 }}>
                          {formatDate(it.date)} · {it.client || "—"}
                          {it.procedure ? ` · ${it.procedure}` : ""}
                        </div>
                      </div>
                      <button className="btn-secondary icon" onClick={() => markPaid(it._id)}>
                        <Icon name="check_circle" size={18} /> Mark paid
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
