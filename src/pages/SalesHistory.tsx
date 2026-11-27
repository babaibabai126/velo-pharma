import { useMemo, useState } from "react";
import {
  Search, FileText, Calendar, IndianRupee, CreditCard, Banknote,
  CheckCircle2, Clock, AlertCircle, Eye, Wallet, Filter, TrendingUp, TrendingDown,
} from "lucide-react";
import { useStore } from "../store/StoreContext";
import { useToast, Modal } from "../components/ui";
import { InvoiceModal } from "./BillingTerminal";
import { formatCurrency, formatDateTime } from "../utils/formatters";
import type { Sale } from "../types";

type FilterRange = "today" | "yesterday" | "7days" | "month" | "all";

export const SalesHistory = ({ globalSearch }: { globalSearch: string }) => {
  const { db, updateSalePayment } = useStore();
  const toast = useToast();
  const [range, setRange] = useState<FilterRange>("today");
  const [search, setSearch] = useState(globalSearch || "");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "RETAIL" | "WHOLESALE">("ALL");
  const [viewSale, setViewSale] = useState<Sale | null>(null);
  const [settleSale, setSettleSale] = useState<Sale | null>(null);

  const filtered = useMemo(() => {
    const now = new Date();
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const week = new Date(today); week.setDate(week.getDate() - 7);
    const month = new Date(today.getFullYear(), today.getMonth(), 1);
    let list = [...db.sales];
    if (range === "today") list = list.filter((s) => new Date(s.createdAt) >= today);
    else if (range === "yesterday") list = list.filter((s) => {
      const d = new Date(s.createdAt); return d >= yesterday && d < today;
    });
    else if (range === "7days") list = list.filter((s) => new Date(s.createdAt) >= week);
    else if (range === "month") list = list.filter((s) => new Date(s.createdAt) >= month);
    if (typeFilter !== "ALL") list = list.filter((s) => s.type === typeFilter);
    const q = (search || globalSearch).trim().toLowerCase();
    if (q) list = list.filter((s) =>
      s.billNumber.toLowerCase().includes(q) ||
      s.customerName.toLowerCase().includes(q) ||
      (s.customerPhone || "").includes(q)
    );
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [db.sales, range, typeFilter, search, globalSearch]);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, x) => s + x.grandTotal, 0);
    const retail = filtered.filter((s) => s.type === "RETAIL").reduce((s, x) => s + x.grandTotal, 0);
    const wholesale = filtered.filter((s) => s.type === "WHOLESALE").reduce((s, x) => s + x.grandTotal, 0);
    const outstanding = filtered.reduce((s, x) => s + (x.grandTotal - x.paidAmount), 0);
    return { total, retail, wholesale, outstanding, count: filtered.length };
  }, [filtered]);

  const ranges: { id: FilterRange; label: string }[] = [
    { id: "today", label: "Today" }, { id: "yesterday", label: "Yesterday" },
    { id: "7days", label: "7 Days" }, { id: "month", label: "This Month" }, { id: "all", label: "All Time" },
  ];

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2>Sales History & Invoices</h2>
          <p>Daywise filtering, credit settlement, and reprint bills</p>
        </div>
        <div className="page__actions">
          <select className="select" style={{ width: "auto" }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
            <option value="ALL">All Types</option>
            <option value="RETAIL">Retail Only</option>
            <option value="WHOLESALE">Wholesale Only</option>
          </select>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-4">
        <StatCard title="Total Revenue" value={formatCurrency(stats.total)} icon={IndianRupee} grad="var(--grad-green)" tile="var(--tile-green)" sub={`${stats.count} invoices`} />
        <StatCard title="Retail Sales" value={formatCurrency(stats.retail)} icon={TrendingUp} grad="var(--grad-blue)" tile="var(--tile-blue)" sub="B2C counter" />
        <StatCard title="Wholesale Volume" value={formatCurrency(stats.wholesale)} icon={TrendingDown} grad="var(--grad-purple)" tile="var(--tile-purple)" sub="B2B accounts" />
        <StatCard title="Outstanding Credit" value={formatCurrency(stats.outstanding)} icon={Wallet} grad="var(--grad-amber)" tile="var(--tile-amber)" sub="Receivables" />
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: 14 }}>
        <div className="flex items-center gap-3" style={{ flexWrap: "wrap" }}>
          <Filter size={15} color="var(--text-dim)" />
          <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
            {ranges.map((r) => (
              <button key={r.id} className={`btn btn--sm ${range === r.id ? "btn--primary" : "btn--ghost"}`} onClick={() => setRange(r.id)}>
                <Calendar size={12} /> {r.label}
              </button>
            ))}
          </div>
          <div className="header__search" style={{ flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8, background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-pill)", padding: "8px 14px" }}>
            <Search size={14} color="var(--text-dim)" />
            <input placeholder="Search bill no, customer, phone…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: "none", background: "transparent", flex: 1, color: "var(--text-main)", fontSize: 13 }} />
          </div>
        </div>
      </div>

      {/* Sales table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap" style={{ maxHeight: "none", border: "none", borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Bill No.</th><th>Date / Time</th><th>Customer</th><th>Type</th>
                <th data-hide="mobile">Items</th><th>Total</th><th data-hide="mobile">Paid</th><th>Status</th><th data-hide="mobile">Method</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10}><div className="empty-state"><div className="empty-state__icon"><FileText size={22} /></div><div>No sales found for this filter</div></div></td></tr>
              )}
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="mono" style={{ fontWeight: 700 }}>{s.billNumber}</td>
                  <td className="text-sm text-muted">{formatDateTime(s.createdAt)}</td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.customerName}</div>
                    {s.customerPhone && <div className="text-xs text-dim">{s.customerPhone}</div>}
                  </td>
                  <td><span className={`pill ${s.type === "RETAIL" ? "pill--green" : "pill--purple"}`}>{s.type}</span></td>
                  <td className="mono" data-hide="mobile">{s.items.length}</td>
                  <td className="mono" style={{ fontWeight: 700 }}>{formatCurrency(s.grandTotal)}</td>
                  <td className="mono" style={{ color: "var(--teal)" }} data-hide="mobile">{formatCurrency(s.paidAmount)}</td>
                  <td><StatusPill status={s.paymentStatus} /></td>
                  <td className="text-sm" data-hide="mobile">{s.paymentMethod}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn--ghost btn--icon btn--sm" title="View invoice" onClick={() => setViewSale(s)}><Eye size={13} /></button>
                      {s.paymentStatus !== "PAID" && (
                        <button className="btn btn--accent btn--sm" title="Settle credit" onClick={() => setSettleSale(s)}><Wallet size={12} /> Settle</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {viewSale && <InvoiceModal sale={viewSale} onClose={() => setViewSale(null)} />}
      {settleSale && (
        <SettleModal sale={settleSale} onClose={() => setSettleSale(null)} onSettle={(paid, status) => {
          updateSalePayment(settleSale.id, paid, status);
          toast("success", "Payment updated", `${settleSale.billNumber} marked ${status}`);
          setSettleSale(null);
        }} />
      )}
    </div>
  );
};

const StatusPill = ({ status }: { status: Sale["paymentStatus"] }) => {
  if (status === "PAID") return <span className="pill pill--green"><CheckCircle2 size={11} /> Paid</span>;
  if (status === "PARTIAL") return <span className="pill pill--amber"><Clock size={11} /> Partial</span>;
  return <span className="pill pill--rose"><AlertCircle size={11} /> Unpaid</span>;
};

const StatCard = ({ title, value, icon: Icon, grad, tile, sub }: { title: string; value: string; icon: typeof IndianRupee; grad: string; tile: string; sub: string }) => (
  <div className="card" style={{ background: grad, padding: 16 }}>
    <div className="flex items-center gap-3 mb-2">
      <div style={{ width: 40, height: 40, borderRadius: 11, background: tile, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border-subtle)" }}>
        <Icon size={18} color="var(--primary)" />
      </div>
      <div className="text-sm text-muted">{title}</div>
    </div>
    <div style={{ fontSize: 26, fontWeight: 800, color: "var(--primary)", lineHeight: 1 }}>{value}</div>
    <div className="text-xs text-dim mt-2">{sub}</div>
  </div>
);

const SettleModal = ({ sale, onClose, onSettle }: { sale: Sale; onClose: () => void; onSettle: (paid: number, status: Sale["paymentStatus"]) => void }) => {
  const [paid, setPaid] = useState(sale.grandTotal - sale.paidAmount);
  const [method, setMethod] = useState<"CASH" | "UPI" | "CARD" | "BANK_TRANSFER">("CASH");
  const newPaid = sale.paidAmount + paid;
  const status: Sale["paymentStatus"] = newPaid >= sale.grandTotal ? "PAID" : newPaid > 0 ? "PARTIAL" : "UNPAID";
  return (
    <Modal title={`Settle Credit — ${sale.billNumber}`} onClose={onClose} footer={
      <>
        <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn--accent" onClick={() => onSettle(newPaid, status)}><CheckCircle2 size={15} /> Settle ₹{paid.toLocaleString("en-IN")}</button>
      </>
    }>
      <div className="flex-col gap-3">
        <div className="card" style={{ background: "var(--grad-amber)", padding: 14, display: "flex", justifyContent: "space-between" }}>
          <div>
            <div className="text-xs text-dim">Outstanding Balance</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "var(--primary)" }}>{formatCurrency(sale.grandTotal - sale.paidAmount)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="text-xs text-dim">Total Bill</div>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700 }}>{formatCurrency(sale.grandTotal)}</div>
            <div className="text-xs text-dim">Already Paid: {formatCurrency(sale.paidAmount)}</div>
          </div>
        </div>
        <div className="field">
          <label className="label">Amount Received</label>
          <input className="input" type="number" value={paid} onChange={(e) => setPaid(parseFloat(e.target.value) || 0)} />
        </div>
        <div className="field">
          <label className="label">Method</label>
          <div className="grid grid-4" style={{ gap: 8 }}>
            {(["CASH", "UPI", "CARD", "BANK_TRANSFER"] as const).map((m) => (
              <button key={m} className={`btn ${method === m ? "btn--primary" : "btn--ghost"}`} onClick={() => setMethod(m)}>{m === "BANK_TRANSFER" ? "Bank" : m}</button>
            ))}
          </div>
        </div>
        <div className="pill" style={{ alignSelf: "flex-start", background: "var(--teal-light)", color: "var(--teal)", borderColor: "var(--teal)" }}>
          Will be marked: {status}
        </div>
      </div>
    </Modal>
  );
};
