import { useState, useEffect } from "react";
import {
  Activity, ShoppingCart, FileText, Boxes, Truck, Users, BarChart3,
  Settings, Search, Sun, Moon, PanelLeftClose, PanelLeftOpen,
  Lightbulb, X, Plus, LogOut, ChevronDown,
} from "lucide-react";
import { useStore } from "../store/StoreContext";
import { useAuth } from "../store/AuthContext";
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

// Track viewport width reactively so the layout reflows on resize/orientation.
const useViewport = () => {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    return () => { window.removeEventListener("resize", on); window.removeEventListener("orientationchange", on); };
  }, []);
  return w;
};

export const AppShell = ({ currentTab, onTab, search, onSearch, children }: ShellProps) => {
  const { theme, toggleTheme } = useStore();
  const { user, logout } = useAuth();
  const vw = useViewport();
  const isMobile = vw < 760;

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showOnboard, setShowOnboard] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [userMenu, setUserMenu] = useState(false);
  const navItems = useNavItems();

  // Close mobile drawer + menus when switching tab or clicking outside
  useEffect(() => {
    setMobileOpen(false);
  }, [currentTab]);

  useEffect(() => {
    if (!isMobile) { setMobileOpen(false); setShowSearch(false); }
  }, [isMobile]);

  // Lock body scroll when mobile drawer open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const info = titles[currentTab];

  const handleNav = (t: TabId) => { onTab(t); setMobileOpen(false); };

  return (
    <div className="app-shell">
      {/* Mobile overlay backdrop */}
      {mobileOpen && <div className="app-shell__overlay" onClick={() => setMobileOpen(false)} />}

      <aside className={`app-shell__sidebar ${collapsed && !isMobile ? "is-collapsed" : ""} ${mobileOpen ? "is-open" : ""}`}>
        <div className="brand">
          <div className="brand__logo">v</div>
          <div className="brand__text">
            <div className="brand__name">velo</div>
            <div className="brand__sub">Pharma ERP</div>
          </div>
          {isMobile && (
            <button className="brand__close" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X size={18} />
            </button>
          )}
        </div>

        {showOnboard && !collapsed && (
          <div className="onboarding">
            <div className="onboarding__icon"><Lightbulb size={14} /></div>
            <span className="onboarding-text">Onboarding</span>
            <button className="onboarding__close" onClick={() => setShowOnboard(false)}><X size={12} /></button>
          </div>
        )}

        <button className="nav-create" onClick={() => handleNav("billing")}>
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
                onClick={() => handleNav(it.id)}
                title={it.label}
              >
                <Icon className="nav__icon" size={17} />
                <span className="nav-label">{it.label}</span>
                {it.badge && <span className="nav__badge">{it.badge}</span>}
              </button>
            );
          })}
        </nav>

        {/* User card at bottom of sidebar */}
        <div className="sidebar-user">
          <div className="sidebar-user__avatar">{(user?.name || "U").charAt(0).toUpperCase()}</div>
          <div className="sidebar-user__info">
            <div className="sidebar-user__name">{user?.name}</div>
            <div className="sidebar-user__role">{user?.role}</div>
          </div>
          <button className="sidebar-user__logout" onClick={logout} title="Sign out">
            <LogOut size={15} />
          </button>
        </div>

        <div className="sidebar-footer">
          <span>v1.1.0</span>
          <span className="status-dot">Local DB</span>
        </div>
      </aside>

      <div className="app-shell__main">
        <header className="app-shell__header">
          {isMobile ? (
            <button
              className="header__collapse"
              onClick={() => setMobileOpen(true)}
              title="Open menu"
              aria-label="Open menu"
            >
              <PanelLeftOpen size={18} />
            </button>
          ) : (
            <button
              className="header__collapse"
              onClick={() => setCollapsed((c) => !c)}
              title="Toggle sidebar"
              aria-label="Toggle sidebar"
            >
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          )}

          <div className="header__title">
            <h1>{info.title}</h1>
            <span>{info.sub}</span>
          </div>

          <div className="header__spacer" />

          {/* Desktop search inline; mobile search via toggle */}
          {!isMobile && (
            <div className="header__search">
              <Search size={15} />
              <input
                placeholder="Search medicines, bills, customers…"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
              />
              {search && <button onClick={() => onSearch("")} aria-label="Clear"><X size={14} /></button>}
            </div>
          )}

          {isMobile && (
            <button
              className="header__collapse"
              onClick={() => setShowSearch((s) => !s)}
              title="Search"
              aria-label="Search"
            >
              <Search size={18} />
            </button>
          )}

          {!isMobile && (
            <div className="header__clock">
              <span className="mono">{new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
              <span style={{ width: 1, height: 12, background: "var(--border-subtle)" }} />
              <span className="mono">{new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          )}

          <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme" aria-label="Toggle theme">
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* User menu (mobile + desktop fallback) */}
          <div className="header__userwrap">
            <button className="header__user" onClick={() => setUserMenu((m) => !m)}>
              <div className="header__user-avatar">{(user?.name || "U").charAt(0).toUpperCase()}</div>
              {!isMobile && <ChevronDown size={14} />}
            </button>
            {userMenu && (
              <>
                <div className="header__user-backdrop" onClick={() => setUserMenu(false)} />
                <div className="header__user-menu">
                  <div className="header__user-head">
                    <div className="header__user-avatar lg">{(user?.name || "U").charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="header__user-name">{user?.name}</div>
                      <div className="header__user-email">{user?.email}</div>
                    </div>
                  </div>
                  <button className="header__user-item" onClick={() => { setUserMenu(false); onTab("settings"); }}>
                    <Settings size={15} /> Settings
                  </button>
                  <button className="header__user-item danger" onClick={logout}>
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Mobile search drawer */}
        {isMobile && showSearch && (
          <div className="header__mobile-search">
            <Search size={15} />
            <input
              autoFocus
              placeholder="Search medicines, bills, customers…"
              value={search}
              onChange={(e) => onSearch(e.target.value)}
            />
            {search && <button onClick={() => onSearch("")} aria-label="Clear"><X size={14} /></button>}
            <button onClick={() => setShowSearch(false)}>Done</button>
          </div>
        )}

        <main className="app-shell__content">{children}</main>

        {/* Mobile bottom nav for quick switching */}
        {isMobile && (
          <nav className="bottom-nav">
            {navItems.slice(0, 5).map((it) => {
              const Icon = it.icon;
              const active = currentTab === it.id;
              return (
                <button
                  key={it.id}
                  className={`bottom-nav__item ${active ? "is-active" : ""}`}
                  onClick={() => handleNav(it.id)}
                >
                  <Icon size={18} />
                  <span>{it.label.split(" ")[0]}</span>
                  {it.badge && <span className="bottom-nav__badge">{it.badge}</span>}
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
};

// Re-export for convenience
export type { StoreSettings };
