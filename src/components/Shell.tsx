import { useState, useEffect } from "react";
import {
  Activity, ShoppingCart, FileText, Boxes, Truck, Users, BarChart3,
  Settings, Search, Calendar, Clock, Sun, Moon, PanelLeftClose, PanelLeftOpen,
  Lightbulb, X, Plus,
} from "lucide-react";
import { useStore } from "../store/StoreContext";
import type { StoreSettings } from "../types";

export type TabId =
  | "billing" | "sales" | "inventory" | "purchase"
  | "parties" | "analytics" | "settings";

interface NavItem {
  id: TabId; label: string; icon: typeof Activity; badge?: string;
}

export const useNavItems = (): NavItem[] => {
  const { db } = useStore();
  const lowStock = db.medicines.filter((m) => {
    const stock = db.batches
      .filter((b) => b.medicineId === m.id && b.status !== "EXPIRED")
      .reduce((s, b) => s + b.quantity, 0);
    return stock < m.minStockAlert;
  }).length;
  const nearExpiry = db.batches.filter((b) => {
    if (b.status === "EXPIRED" || b.quantity === 0) return false;
    const days = Math.round((new Date(b.expiryDate).getTime() - Date.now()) / 86400000);
    return days <= 60 && days >= 0;
  }).length;
  const badge = lowStock + nearExpiry > 0 ? `${lowStock + nearExpiry}` : undefined;

  return [
    { id: "billing", label: "POS Billing", icon: ShoppingCart },
    { id: "sales", label: "Sales History", icon: FileText },
    { id: "inventory", label: "Inventory", icon: Boxes, badge },
    { id: "purchase", label: "Purchases (GRN)", icon: Truck },
    { id: "parties", label: "Customers & Vendors", icon: Users },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];
};

interface ShellProps {
  currentTab: TabId;
  onTab: (t: TabId) => void;
  search: string;
  onSearch: (s: string) => void;
  children: React.ReactNode;
}

const titles: Record<TabId, { title: string; sub: string }> = {
  billing: { title: "POS / Billing Counter", sub: "Fast checkout, FEFO batch selection & instant GST invoices" },
  sales: { title: "Sales History & Invoices", sub: "Retail and wholesale records, reprint bills, credit settlement" },
  inventory: { title: "Medicine & Stock Inventory", sub: "Batch tracking, expiry alerts, stock adjustments" },
  purchase: { title: "Purchase Orders & GRN", sub: "Manage supplier bills, GRN entries, accounts" },
  parties: { title: "Customers, Vendors & Doctors", sub: "Wholesale B2B, retail patients, vendor ledgers" },
  analytics: { title: "Business Intelligence & Reports", sub: "Profitability, GSTR-1 summaries, sales analytics" },
  settings: { title: "System & Pharmacy Settings", sub: "Store credentials, DL license, thermal printing" },
};

export const AppShell = ({ currentTab, onTab, search, onSearch, children }: ShellProps) => {
  const { theme, toggleTheme, db } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [showOnboard, setShowOnboard] = useState(true);
  const navItems = useNavItems();

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const info = titles[currentTab];

  return (
    <div className="app-shell">
      <aside className={`app-shell__sidebar ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "is-open" : ""}`}>
        <div className="brand">
          <div className="brand__logo">v</div>
          <div className="brand__text">
            <div className="brand__name">velo</div>
            <div className="brand__sub">Pharma ERP</div>
          </div>
        </div>

        {showOnboard && !collapsed && (
          <div className="onboarding">
            <div className="onboarding__icon"><Lightbulb size={14} /></div>
            <span className="onboarding-text">Onboarding</span>
            <button className="onboarding__close" onClick={() => setShowOnboard(false)}><X size={12} /></button>
          </div>
        )}

        <button className="nav-create" onClick={() => onTab("billing")}>
          <Plus size={15} />
          <span className="nav-label">New Sale</span>
        </button>

        <nav className="nav">
          {navItems.map((it) => {
            const Icon = it.icon;
            const active = currentTab === it.id;
            return (
              <button
                key={it.id}
                className={`nav__item ${active ? "is-active" : ""}`}
                onClick={() => { onTab(it.id); setMobileOpen(false); }}
                title={it.label}
              >
                <Icon className="nav__icon" size={17} />
                <span className="nav-label">{it.label}</span>
                {it.badge && <span className="nav__badge">{it.badge}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <span>v1.0.0</span>
          <span className="status-dot">Local DB</span>
        </div>
      </aside>

      <div className="app-shell__main">
        <header className="app-shell__header">
          <button
            className="header__collapse"
            onClick={() => setCollapsed((c) => !c)}
            title="Toggle sidebar"
            style={{ display: window.innerWidth < 700 ? "none" : "flex" }}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          <button
            className="header__collapse"
            onClick={() => setMobileOpen(true)}
            title="Open menu"
            style={{ display: window.innerWidth < 700 ? "flex" : "none" }}
          >
            <PanelLeftOpen size={16} />
          </button>

          <div className="header__title">
            <h1>{info.title}</h1>
            <span>{info.sub}</span>
          </div>

          <div className="header__spacer" />

          <div className="header__search">
            <Search size={15} />
            <input
              placeholder="Search medicines, bills, customers…"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
            />
          </div>

          <div className="header__clock">
            <Calendar size={13} />
            <span>{clock.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
            <span style={{ width: 1, height: 12, background: "var(--border-subtle)" }} />
            <Clock size={13} />
            <span className="mono">{clock.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          </div>

          <div className="header__status">DB Online</div>

          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </header>

        <main className="app-shell__content">{children}</main>
      </div>
    </div>
  );
};

// Re-export for convenience
export type { StoreSettings };
