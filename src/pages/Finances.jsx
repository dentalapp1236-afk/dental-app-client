import { useEffect, useState } from "react";
import api from "../api/axios";
import { formatDate, formatDateTime } from "../utils/date";
import Icon from "../components/Icon";
import { SkeletonStats, SkeletonTable } from "../components/Skeleton";

const money = (n) => `Rs ${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const PERIODS = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

export default function Finances() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("month");
  const [trend, setTrend] = useState([]);

  // Navigable single-period earnings vs expenses
  const [sumPeriod, setSumPeriod] = useState("day");
  const [sumOffset, setSumOffset] = useState(0);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api
      .get("/finances/period", { params: { period: sumPeriod, offset: sumOffset }, skipLoader: true })
      .then((r) => setSummary(r.data))
      .catch(() => setSummary(null));
  }, [sumPeriod, sumOffset]);

  const load = async () => {
    const { data } = await api.get("/finances/summary");
    setData(data);
    setLoading(false);
  };

  useEffect(() => {
    load().catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  // Trend chart: refetch whenever the selected period changes.
  useEffect(() => {
    api
      .get("/finances/trend", { params: { period }, skipLoader: true })
      .then((r) => setTrend(r.data.series || []))
      .catch(() => setTrend([]));
  }, [period]);

  const markPaid = async (id) => {
    await api.put(`/treatments/${id}`, { paid: true });
    await load();
  };

  if (loading)
    return (
      <div className="page">
        <h1 className="icon"><Icon name="payments" /> Finances</h1>
        <SkeletonStats count={4} />
        <SkeletonTable rows={5} cols={5} />
      </div>
    );
  if (!data) return <div className="page"><p className="muted">Could not load finances.</p></div>;

  const { totals, unpaid } = data;
  const maxBar = Math.max(1, ...trend.flatMap((m) => [m.income, m.expense]));

  return (
    <div className="page">
      <h1 className="icon">
        <Icon name="payments" /> Finances
      </h1>

      <div className="stats">
        <div className="stat-card">
          <Icon name="account_balance_wallet" size={26} className="stat-icon" />
          <div className="stat-value">{money(totals.totalCollected)}</div>
          <div className="stat-label">Collected ({totals.paidCount} paid)</div>
        </div>
        <div className="stat-card">
          <Icon name="pending_actions" size={26} className="stat-icon" />
          <div className="stat-value">{money(totals.outstanding)}</div>
          <div className="stat-label">Outstanding ({totals.unpaidCount} unpaid)</div>
        </div>
        <div className="stat-card">
          <Icon name="shopping_cart_checkout" size={26} className="stat-icon" />
          <div className="stat-value">{money(totals.totalSpent)}</div>
          <div className="stat-label">Supply spend ({totals.orderCount} orders)</div>
        </div>
        <div className="stat-card">
          <Icon name="handyman" size={26} className="stat-icon" />
          <div className="stat-value">{money(totals.totalMaintenance)}</div>
          <div className="stat-label">Maintenance ({totals.maintenanceCount} items)</div>
        </div>
        <div className="stat-card">
          <Icon name="trending_up" size={26} className="stat-icon" />
          <div className="stat-value">{money(totals.net)}</div>
          <div className="stat-label">Net (collected − expenses)</div>
        </div>
      </div>

      {/* Navigable per-period earnings vs expenses */}
      <div className="row gap" style={{ justifyContent: "space-between", flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
        <h2 className="icon" style={{ margin: 0 }}><Icon name="query_stats" /> Earnings &amp; expenses</h2>
        <div className="period-toggle">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={sumPeriod === p.key ? "active" : ""}
              onClick={() => { setSumPeriod(p.key); setSumOffset(0); }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="card period-card">
        <div className="period-nav">
          <button type="button" className="icon" aria-label="Previous" onClick={() => setSumOffset((o) => o + 1)}>
            <Icon name="chevron_left" />
          </button>
          <span className="period-label">
            {summary ? summary.label : "…"}
            {sumOffset === 0 && <span className="muted"> · current</span>}
          </span>
          <button
            type="button"
            className="icon"
            aria-label="Next"
            disabled={sumOffset === 0}
            onClick={() => setSumOffset((o) => Math.max(0, o - 1))}
          >
            <Icon name="chevron_right" />
          </button>
        </div>
        <div className="period-figures">
          <div className="period-fig earned">
            <Icon name="payments" size={22} />
            <div className="period-fig-value">{money(summary?.income || 0)}</div>
            <div className="period-fig-label">Earned</div>
          </div>
          <div className="period-fig spent">
            <Icon name="shopping_cart_checkout" size={22} />
            <div className="period-fig-value">{money(summary?.expense || 0)}</div>
            <div className="period-fig-label">Expenses</div>
          </div>
          <div className="period-fig net">
            <Icon name="trending_up" size={22} />
            <div className="period-fig-value">{money(summary?.net || 0)}</div>
            <div className="period-fig-label">Net</div>
          </div>
        </div>
      </div>

      <div className="row gap" style={{ justifyContent: "space-between", flexWrap: "wrap", alignItems: "center" }}>
        <h2 className="icon" style={{ margin: 0 }}><Icon name="bar_chart" /> Income vs. expenses</h2>
        <div className="period-toggle">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={period === p.key ? "active" : ""}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      {trend.every((m) => !m.income && !m.expense) ? (
        <p className="muted">No financial activity in this period.</p>
      ) : (
        <div className="card">
          <div className="chart">
            {trend.map((m) => (
              <div key={m.label} className="chart-col">
                <div className="chart-bars">
                  <div
                    className="bar bar-income"
                    style={{ height: `${(m.income / maxBar) * 140}px` }}
                    title={`Income: ${money(m.income)}`}
                  />
                  <div
                    className="bar bar-expense"
                    style={{ height: `${(m.expense / maxBar) * 140}px` }}
                    title={`Expenses: ${money(m.expense)}`}
                  />
                </div>
                <div className="chart-label muted">{m.label}</div>
              </div>
            ))}
          </div>
          <div className="row gap chart-legend">
            <span className="icon"><span className="swatch bar-income" /> Income</span>
            <span className="icon"><span className="swatch bar-expense" /> Expenses (supplies + maintenance)</span>
          </div>
        </div>
      )}

      <h2 className="icon"><Icon name="receipt_long" /> Outstanding payments</h2>
      {unpaid.length === 0 ? (
        <p className="muted">No outstanding payments. 🎉</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Client</th>
              <th>Procedure</th>
              <th>Amount</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {unpaid.map((t) => (
              <tr key={t._id}>
                <td>{formatDate(t.date)}</td>
                <td>{t.client?.name || "—"}</td>
                <td>{t.procedure}</td>
                <td>{money(t.cost)}</td>
                <td>
                  <button className="btn-secondary icon" onClick={() => markPaid(t._id)}>
                    <Icon name="check_circle" size={18} /> Mark paid
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
