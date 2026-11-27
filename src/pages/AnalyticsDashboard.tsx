import { useMemo, useState } from "react";
import {
  BarChart3, TrendingUp, IndianRupee, Percent, Award, Package,
  Flame, Snowflake, Calendar,
} from "lucide-react";
import { useStore } from "../store/StoreContext";
import { formatCurrency, formatDate } from "../utils/formatters";

export const AnalyticsDashboard = () => {
  const { db } = useStore();
  const [range, setRange] = useState<7 | 14 | 30>(14);

  const summary = useMemo(() => {
    const totalRevenue = db.sales.reduce((s, x) => s + x.grandTotal, 0);
    const totalTax = db.sales.reduce((s, x) => s + x.taxAmount, 0);
    const totalDiscount = db.sales.reduce((s, x) => s + x.discountAmount, 0);
    const totalCost = db.sales.reduce((s, x) => s + x.items.reduce((a, it) => a + it.unitPrice * 0.7 * it.quantity, 0), 0);
    const grossMargin = totalRevenue - totalCost - totalTax;
    const profitMargin = totalRevenue > 0 ? (grossMargin / totalRevenue) * 100 : 0;
    const stockValue = db.batches.reduce((s, b) => s + b.quantity * b.purchasePrice, 0);
    return { totalRevenue, totalTax, totalDiscount, grossMargin, profitMargin, stockValue, count: db.sales.length };
  }, [db.sales, db.batches]);

  const trend = useMemo(() => {
    const days = range;
    const out: { date: string; sales: number; profit: number; count: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      const daySales = db.sales.filter((s) => {
        const sd = new Date(s.createdAt); return sd >= d && sd < next;
      });
      const sales = daySales.reduce((a, x) => a + x.grandTotal, 0);
      const profit = daySales.reduce((a, x) => a + (x.grandTotal - x.taxAmount - x.items.reduce((q, it) => q + it.unitPrice * 0.7 * it.quantity, 0)), 0);
      out.push({ date: d.toISOString().slice(5, 10), sales, profit, count: daySales.length });
    }
    return out;
  }, [db.sales, range]);

  const topMedicines = useMemo(() => {
    const map: Record<string, { name: string; qty: number; revenue: number }> = {};
    db.sales.forEach((s) => s.items.forEach((it) => {
      if (!map[it.medicineName]) map[it.medicineName] = { name: it.medicineName, qty: 0, revenue: 0 };
      map[it.medicineName].qty += it.quantity;
      map[it.medicineName].revenue += it.totalPrice;
    }));
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  }, [db.sales]);

  const fastSlow = useMemo(() => {
    const map: Record<string, { name: string; qty: number }> = {};
    db.sales.forEach((s) => s.items.forEach((it) => {
      if (!map[it.medicineName]) map[it.medicineName] = { name: it.medicineName, qty: 0 };
      map[it.medicineName].qty += it.quantity;
    }));
    const all = db.medicines.map((m) => ({ name: m.name, qty: map[m.name]?.qty || 0 }));
    const sorted = [...all].sort((a, b) => b.qty - a.qty);
    return { fast: sorted.slice(0, 5), slow: sorted.filter((x) => x.qty === 0).slice(0, 5) };
  }, [db.sales, db.medicines]);

  const gstr1 = useMemo(() => {
    const brackets: Record<number, { taxable: number; tax: number; count: number }> = { 0: { taxable: 0, tax: 0, count: 0 }, 5: { taxable: 0, tax: 0, count: 0 }, 12: { taxable: 0, tax: 0, count: 0 }, 18: { taxable: 0, tax: 0, count: 0 }, 28: { taxable: 0, tax: 0, count: 0 } };
    db.sales.forEach((s) => s.items.forEach((it) => {
      const taxable = it.totalPrice - it.taxAmount;
      if (!brackets[it.gstRate]) brackets[it.gstRate] = { taxable: 0, tax: 0, count: 0 };
      brackets[it.gstRate].taxable += taxable;
      brackets[it.gstRate].tax += it.taxAmount;
      brackets[it.gstRate].count += 1;
    }));
    return brackets;
  }, [db.sales]);

  const maxSales = Math.max(...trend.map((t) => t.sales), 1);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2>Business Intelligence & Reports</h2>
          <p>Profitability, sales trend, top medicines, GSTR-1 tax summary</p>
        </div>
        <div className="page__actions">
          <div className="flex gap-2">
            {[7, 14, 30].map((d) => (
              <button key={d} className={`btn btn--sm ${range === d ? "btn--primary" : "btn--ghost"}`} onClick={() => setRange(d as any)}>{d}d</button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-4">
        <KPI label="Net Revenue" value={formatCurrency(summary.totalRevenue)} icon={IndianRupee} grad="var(--grad-green)" tile="var(--tile-green)" />
        <KPI label="Gross Margin" value={formatCurrency(summary.grossMargin)} icon={TrendingUp} grad="var(--grad-blue)" tile="var(--tile-blue)" sub={`${summary.profitMargin.toFixed(1)}% margin`} />
        <KPI label="Tax Collected" value={formatCurrency(summary.totalTax)} icon={Percent} grad="var(--grad-purple)" tile="var(--tile-purple)" sub="GST output" />
        <KPI label="Stock Value" value={formatCurrency(summary.stockValue)} icon={Package} grad="var(--grad-amber)" tile="var(--tile-amber)" sub="At cost" />
      </div>

      {/* Sales trend bar chart */}
      <div className="card" style={{ padding: 18 }}>
        <div className="card__head">
          <BarChart3 size={18} color="var(--primary)" />
          <div>
            <div className="card__title">Sales Trend — Last {range} Days</div>
            <div className="card__sub">Daily revenue and gross profit</div>
          </div>
        </div>
        <TrendChart trend={trend} maxSales={maxSales} />
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {/* Top medicines */}
        <div className="card" style={{ padding: 18 }}>
          <div className="card__head"><Award size={18} color="var(--primary)" /><div className="card__title">Top Selling Medicines</div></div>
          {topMedicines.length === 0 ? <div className="empty-state"><div className="empty-state__icon"><Award size={22} /></div><div>No sales yet</div></div> : (
            <div className="flex-col gap-2">
              {topMedicines.map((m, i) => {
                const maxRev = topMedicines[0].revenue || 1;
                const pct = (m.revenue / maxRev) * 100;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span style={{ fontWeight: 600 }}>{i + 1}. {m.name}</span>
                      <span className="mono text-muted">{m.qty} units • {formatCurrency(m.revenue)}</span>
                    </div>
                    <div style={{ height: 8, background: "var(--bg-surface)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, var(--primary), var(--accent))", borderRadius: 999 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fast vs slow moving */}
        <div className="card" style={{ padding: 18 }}>
          <div className="card__head"><Flame size={18} color="var(--primary)" /><div className="card__title">Fast vs Slow Moving</div></div>
          <div className="flex-col gap-3">
            <div>
              <div className="text-xs text-dim mb-2 flex items-center gap-2"><Flame size={12} color="var(--rose)" /> FAST MOVING (prioritize reorder)</div>
              {fastSlow.fast.map((m, i) => (
                <div key={i} className="flex justify-between text-sm" style={{ padding: "5px 0" }}>
                  <span>{m.name}</span>
                  <span className="mono" style={{ color: "var(--teal)", fontWeight: 700 }}>{m.qty} sold</span>
                </div>
              ))}
            </div>
            <div style={{ height: 1, background: "var(--border-subtle)" }} />
            <div>
              <div className="text-xs text-dim mb-2 flex items-center gap-2"><Snowflake size={12} color="var(--cyan)" /> SLOW MOVING (dead stock — clear with offers)</div>
              {fastSlow.slow.length === 0 ? <div className="text-sm text-dim">All medicines have sales</div> :
                fastSlow.slow.map((m, i) => (
                  <div key={i} className="flex justify-between text-sm" style={{ padding: "5px 0" }}>
                    <span>{m.name}</span>
                    <span className="mono text-dim">0 sold</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* GSTR-1 */}
      <div className="card" style={{ padding: 18 }}>
        <div className="card__head"><Percent size={18} color="var(--primary)" /><div><div className="card__title">GSTR-1 Tax Summary</div><div className="card__sub">Taxable value & tax liability by GST slab</div></div></div>
        <div className="table-wrap" style={{ border: "none" }}>
          <table className="table">
            <thead><tr><th>GST Rate</th><th>Taxable Value</th><th>CGST (50%)</th><th>SGST (50%)</th><th>Total Tax</th><th>Invoice Count</th></tr></thead>
            <tbody>
              {Object.entries(gstr1).sort((a, b) => Number(a[0]) - Number(b[0])).map(([rate, v]) => (
                <tr key={rate}>
                  <td><span className="pill pill--purple">{rate}%</span></td>
                  <td className="mono" style={{ fontWeight: 700 }}>{formatCurrency(v.taxable)}</td>
                  <td className="mono text-sm">{formatCurrency(v.tax / 2)}</td>
                  <td className="mono text-sm">{formatCurrency(v.tax / 2)}</td>
                  <td className="mono" style={{ fontWeight: 700, color: "var(--primary)" }}>{formatCurrency(v.tax)}</td>
                  <td className="mono">{v.count}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 800, background: "var(--bg-surface)" }}>
                <td>TOTAL</td>
                <td className="mono">{formatCurrency(Object.values(gstr1).reduce((s, v) => s + v.taxable, 0))}</td>
                <td className="mono">{formatCurrency(Object.values(gstr1).reduce((s, v) => s + v.tax / 2, 0))}</td>
                <td className="mono">{formatCurrency(Object.values(gstr1).reduce((s, v) => s + v.tax / 2, 0))}</td>
                <td className="mono" style={{ color: "var(--primary)" }}>{formatCurrency(Object.values(gstr1).reduce((s, v) => s + v.tax, 0))}</td>
                <td className="mono">{Object.values(gstr1).reduce((s, v) => s + v.count, 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

const KPI = ({ label, value, icon: Icon, grad, tile, sub }: any) => (
  <div className="card" style={{ background: grad, padding: 16 }}>
    <div className="flex items-center gap-3 mb-2">
      <div style={{ width: 40, height: 40, borderRadius: 11, background: tile, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border-subtle)" }}>
        <Icon size={18} color="var(--primary)" />
      </div>
      <div className="text-sm text-muted">{label}</div>
    </div>
    <div style={{ fontSize: 26, fontWeight: 800, color: "var(--primary)", lineHeight: 1 }}>{value}</div>
    {sub && <div className="text-xs text-dim mt-2">{sub}</div>}
  </div>
);

const TrendChart = ({ trend, maxSales }: { trend: { date: string; sales: number; profit: number }[]; maxSales: number }) => {
  const w = 760, h = 200, pad = 30, bw = (w - pad * 2) / trend.length;
  return (
    <div style={{ overflowX: "auto" }}>
      <svg viewBox={`0 0 ${w} ${h + 30}`} style={{ width: "100%", minWidth: 600, height: h + 30 }}>
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <g key={i}>
            <line x1={pad} y1={h - p * (h - pad * 2) - pad} x2={w - pad} y2={h - p * (h - pad * 2) - pad} stroke="var(--border-subtle)" strokeWidth={1} />
            <text x={pad - 5} y={h - p * (h - pad * 2) - pad + 3} textAnchor="end" fontSize={9} fill="var(--text-dim)">{Math.round(p * maxSales).toLocaleString("en-IN")}</text>
          </g>
        ))}
        {trend.map((t, i) => {
          const bh = (t.sales / maxSales) * (h - pad * 2);
          const ph = (t.profit / maxSales) * (h - pad * 2);
          const x = pad + i * bw + 2;
          return (
            <g key={i}>
              <rect x={x} y={h - pad - bh} width={bw / 2 - 3} height={bh} fill="var(--primary)" rx={3} />
              <rect x={x + bw / 2} y={h - pad - ph} width={bw / 2 - 3} height={ph} fill="var(--accent)" rx={3} opacity={0.85} />
              {(i % 2 === 0 || trend.length <= 14) && (
                <text x={x + bw / 2} y={h - pad + 14} textAnchor="middle" fontSize={9} fill="var(--text-dim)">{t.date}</text>
              )}
            </g>
          );
        })}
        <g transform={`translate(${w - 140}, 10)`}>
          <rect width={10} height={10} fill="var(--primary)" rx={2} /><text x={14} y={9} fontSize={10} fill="var(--text-muted)">Sales</text>
          <rect x={60} width={10} height={10} fill="var(--accent)" rx={2} /><text x={74} y={9} fontSize={10} fill="var(--text-muted)">Profit</text>
        </g>
      </svg>
    </div>
  );
};
