import { useEffect, useState } from "react";
import api from "../api/axios";
import Icon from "../components/Icon";
import { SkeletonStats, SkeletonTable } from "../components/Skeleton";

const money = (n) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function Finances() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const { totals, monthly, unpaid } = data;
  const maxBar = Math.max(1, ...monthly.flatMap((m) => [m.income, m.expense]));

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

      <h2 className="icon"><Icon name="bar_chart" /> Monthly income vs. expenses</h2>
      {monthly.length === 0 ? (
        <p className="muted">No financial activity yet.</p>
      ) : (
        <div className="card">
          <div className="chart">
            {monthly.map((m) => (
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
                <td>{new Date(t.date).toLocaleDateString()}</td>
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
