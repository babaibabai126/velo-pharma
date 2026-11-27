import { useMemo } from "react";
import {
  Users, Magnet, UserPlus, Tag, FileText, Receipt, Clock, MoreVertical,
  Handshake, FileCheck2, Briefcase, Flag, ListTodo, TrendingUp, IndianRupee,
} from "lucide-react";
import { useStore } from "../store/StoreContext";
import { formatCurrency, formatDateTime, daysBetween } from "../utils/formatters";

interface StatCardProps {
  title: string; value: string; gradient: string; tileColor: string;
  icon: typeof Users; period?: string;
}

const StatCard = ({ title, value, gradient, tileColor, icon: Icon, period }: StatCardProps) => (
  <div className="card" style={{ background: gradient, padding: 18, position: "relative", overflow: "hidden" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: tileColor, display: "flex", alignItems: "center", justifyContent: "center",
        border: "1px solid var(--border-subtle)",
      }}>
        <Icon size={20} color="var(--primary)" />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-muted)" }}>{title}</div>
    </div>
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
      <div style={{ fontSize: 36, fontWeight: 800, color: "var(--primary)", letterSpacing: "-0.02em", lineHeight: 1 }}>
        {value}
      </div>
      {period && (
        <div style={{
          padding: "4px 12px", borderRadius: 999, background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)", fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
          marginBottom: 4,
        }}>
          {period} ⌄
        </div>
      )}
    </div>
  </div>
);

export const Dashboard = ({ onNavigate }: { onNavigate: (t: any) => void }) => {
  const { db } = useStore();

  const stats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const todaySales = db.sales.filter((s) => new Date(s.createdAt) >= today);
    const todayRevenue = todaySales.reduce((s, x) => s + x.grandTotal, 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const monthSales = db.sales
      .filter((s) => new Date(s.createdAt) >= monthStart)
      .reduce((s, x) => s + x.grandTotal, 0);
    const activeCustomers = db.customers.filter((c) => c.type !== "DOCTOR").length;
    const lowStock = db.medicines.filter((m) => {
      const stock = db.batches.filter((b) => b.medicineId === m.id && b.status !== "EXPIRED").reduce((s, b) => s + b.quantity, 0);
      return stock < m.minStockAlert;
    }).length;
    const nearExpiry = db.batches.filter((b) => {
      if (b.status === "EXPIRED" || b.quantity === 0) return false;
      const d = daysBetween(b.expiryDate);
      return d <= 60 && d >= 0;
    }).length;
    const expired = db.batches.filter((b) => b.status === "EXPIRED" && b.quantity > 0).length;
    const outstanding = db.customers.reduce((s, c) => s + c.outstandingBalance, 0);
    const stockValue = db.batches.reduce((s, b) => s + b.quantity * b.purchasePrice, 0);
    return { todayRevenue, todayCount: todaySales.length, monthSales, activeCustomers, lowStock, nearExpiry, expired, outstanding, stockValue };
  }, [db]);

  const recentActivities = useMemo(() => {
    return db.sales.slice(0, 5).map((s) => ({
      id: s.id,
      name: s.customerName,
      action: s.type === "WHOLESALE" ? "placed a wholesale order" : "made a purchase",
      amount: s.grandTotal,
      method: s.paymentMethod,
      time: s.createdAt,
      type: "sale" as const,
    }));
  }, [db.sales]);

  const tasks = useMemo(() => {
    const list: { id: string; text: string; flag?: "red" | "blue"; done: boolean }[] = [];
    if (stats.expired > 0) list.push({ id: "t1", text: `Quarantine ${stats.expired} expired batch(es)`, flag: "red", done: false });
    if (stats.nearExpiry > 0) list.push({ id: "t2", text: `Clear ${stats.nearExpiry} near-expiry batches with FEFO priority`, flag: "blue", done: false });
    if (stats.lowStock > 0) list.push({ id: "t3", text: `Reorder ${stats.lowStock} low-stock medicine(s)`, flag: "red", done: false });
    if (stats.outstanding > 0) list.push({ id: "t4", text: `Follow up ₹${stats.outstanding.toLocaleString("en-IN")} in customer receivables`, flag: "blue", done: false });
    list.push({ id: "t5", text: "Generate this month's GSTR-1 summary", flag: "blue", done: false });
    list.push({ id: "t6", text: "Audit physical stock vs system count", done: false });
    return list;
  }, [stats]);

  const gradients = [
    "var(--grad-yellow)", "var(--grad-green)", "var(--grad-blue)",
    "var(--grad-purple)", "var(--grad-pink)", "var(--grad-amber)",
  ];
  const tiles = ["var(--tile-yellow)", "var(--tile-green)", "var(--tile-blue)", "var(--tile-purple)", "var(--tile-pink)", "var(--tile-amber)"];

  const cards: StatCardProps[] = [
    { title: "Total Customers", value: String(stats.activeCustomers), gradient: gradients[0], tileColor: tiles[0], icon: Users, period: "All Time" },
    { title: "Today's Sales", value: String(stats.todayCount), gradient: gradients[1], tileColor: tiles[1], icon: Magnet, period: "Today" },
    { title: "Today's Revenue", value: formatCurrency(stats.todayRevenue), gradient: gradients[2], tileColor: tiles[2], icon: IndianRupee, period: "Today" },
    { title: "Month Revenue", value: formatCurrency(stats.monthSales), gradient: gradients[3], tileColor: tiles[3], icon: TrendingUp, period: "This Month" },
    { title: "Stock Value", value: formatCurrency(stats.stockValue), gradient: gradients[4], tileColor: tiles[4], icon: Tag, period: "Current" },
    { title: "Receivables", value: formatCurrency(stats.outstanding), gradient: gradients[5], tileColor: tiles[5], icon: Receipt, period: "Outstanding" },
  ];

  return (
    <div className="page">
      {/* Stat cards */}
      <div className="grid grid-3">
        {cards.map((c, i) => <StatCard key={i} {...c} />)}
      </div>

      {/* Recent Activities + Tasks */}
      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr", gap: 18 }}>
        <div className="card" style={{ padding: 18 }}>
          <div className="card__head">
            <Clock size={18} color="var(--primary)" />
            <div className="card__title">Recent Activities</div>
            <div className="card__actions">
              <button className="btn btn--ghost btn--icon"><MoreVertical size={15} /></button>
            </div>
          </div>
          <div className="flex-col gap-2">
            {recentActivities.length === 0 && (
              <div className="empty-state">
                <div className="empty-state__icon"><Clock size={22} /></div>
                <div>No recent activity</div>
              </div>
            )}
            {recentActivities.map((a, i) => (
              <div key={a.id} className="flex items-center gap-3" style={{
                padding: "12px 14px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                background: i === 0 ? "var(--grad-green)" : "transparent",
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 11,
                  background: i % 2 === 0 ? "var(--tile-green)" : "var(--tile-blue)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "1px solid var(--border-subtle)",
                }}>
                  {i % 2 === 0 ? <Handshake size={16} color="var(--primary)" /> : <FileCheck2 size={16} color="var(--cyan)" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13 }}>
                    <strong style={{ color: "var(--text-main)" }}>{a.name}</strong>{" "}
                    <span style={{ color: "var(--text-muted)" }}>{a.action}</span>
                  </div>
                  <div className="text-xs text-dim" style={{ marginTop: 2 }}>
                    {formatDateTime(a.time)} • {a.method} • {formatCurrency(a.amount)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 18 }}>
          <div className="card__head">
            <ListTodo size={18} color="var(--primary)" />
            <div className="card__title">Tasks</div>
            <div className="card__actions">
              <button className="btn btn--ghost btn--sm" onClick={() => onNavigate("inventory")}>+ Add New</button>
            </div>
          </div>
          <div className="flex-col gap-2">
            {tasks.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3" style={{
                padding: "12px 14px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                background: i === 0 ? "var(--grad-rose)" : "transparent",
              }}>
                <span className="checkbox" />
                <div style={{ flex: 1, fontSize: 12.5, color: "var(--text-main)" }}>{t.text}</div>
                {t.flag && <Flag size={13} color={t.flag === "red" ? "var(--rose)" : "var(--cyan)"} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-4">
        <QuickAction icon={Magnet} label="New Sale" color="var(--tile-green)" onClick={() => onNavigate("billing")} />
        <QuickAction icon={Briefcase} label="Add Purchase" color="var(--tile-blue)" onClick={() => onNavigate("purchase")} />
        <QuickAction icon={UserPlus} label="Add Customer" color="var(--tile-purple)" onClick={() => onNavigate("parties")} />
        <QuickAction icon={FileText} label="View Reports" color="var(--tile-amber)" onClick={() => onNavigate("analytics")} />
      </div>
    </div>
  );
};

const QuickAction = ({ icon: Icon, label, color, onClick }: { icon: typeof Users; label: string; color: string; onClick: () => void }) => (
  <button className="card" onClick={onClick} style={{ padding: 18, textAlign: "left", display: "flex", alignItems: "center", gap: 12, transition: "all 0.15s" }}>
    <div style={{ width: 44, height: 44, borderRadius: 12, background: color, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border-subtle)" }}>
      <Icon size={20} color="var(--primary)" />
    </div>
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main)" }}>{label}</div>
      <div className="text-xs text-dim">Tap to open</div>
    </div>
  </button>
);
