import { useEffect, useState } from "react";
import api from "../api/axios";
import { formatDate } from "../utils/date";
import Icon from "../components/Icon";
import { SkeletonTable } from "../components/Skeleton";

const money = (n) => `Rs ${(Number(n) || 0).toLocaleString()}`;

// Turn a "YYYY-MM" billing month into "August 2026".
const monthLabel = (ym) => {
  if (!ym) return "—";
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
};

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .get("/invoices")
      .then(({ data }) => {
        if (alive) setInvoices(Array.isArray(data) ? data : []);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const outstanding = invoices
    .filter((iv) => iv.status !== "paid")
    .reduce((s, iv) => s + (Number(iv.amount) || 0), 0);

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="icon"><Icon name="request_quote" /> Invoices</h1>
      </div>

      <p className="muted" style={{ marginTop: -6 }}>
        Your monthly subscription. Invoices are issued on the 5th and due on the 15th of each month.
      </p>

      {loading ? (
        <SkeletonTable />
      ) : invoices.length === 0 ? (
        <div className="card" style={{ padding: 20 }}>
          <p className="muted">No invoices yet.</p>
        </div>
      ) : (
        <>
          {outstanding > 0 && (
            <div className="card inv-due" style={{ padding: 16, marginBottom: 14 }}>
              <Icon name="account_balance_wallet" size={18} />
              <span>Outstanding balance: <strong>{money(outstanding)}</strong></span>
            </div>
          )}

          <div className="table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Amount</th>
                  <th>Due date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((iv) => {
                  const overdue = iv.status !== "paid" && new Date(iv.dueDate) < new Date();
                  return (
                    <tr key={iv._id}>
                      <td data-label="Month">{monthLabel(iv.month)}</td>
                      <td data-label="Amount">{money(iv.amount)}</td>
                      <td data-label="Due date">{formatDate(iv.dueDate)}</td>
                      <td data-label="Status">
                        {iv.status === "paid" ? (
                          <span className="pill pill-paid icon">
                            <Icon name="check_circle" size={14} /> Paid
                            {iv.paidAt ? ` · ${formatDate(iv.paidAt)}` : ""}
                          </span>
                        ) : overdue ? (
                          <span className="pill pill-overdue icon">
                            <Icon name="error" size={14} /> Overdue
                          </span>
                        ) : (
                          <span className="pill pill-unpaid">Unpaid</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
