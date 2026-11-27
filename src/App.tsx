import { useState } from "react";
import { AppShell, type TabId } from "./components/Shell";
import { ToastProvider } from "./components/ui";
import { LoginPanel } from "./components/LoginPanel";
import { useAuth } from "./store/AuthContext";
import { Dashboard } from "./pages/Dashboard";
import { BillingTerminal } from "./pages/BillingTerminal";
import { SalesHistory } from "./pages/SalesHistory";
import { InventoryManager } from "./pages/InventoryManager";
import { PurchaseManager } from "./pages/PurchaseManager";
import { PartyManager } from "./pages/PartyManager";
import { AnalyticsDashboard } from "./pages/AnalyticsDashboard";
import { SettingsManager } from "./pages/SettingsManager";

export default function App() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabId>("billing");
  const [search, setSearch] = useState("");

  if (!user) return <LoginPanel />;

  return (
    <ToastProvider>
      <AppShell currentTab={tab} onTab={setTab} search={search} onSearch={setSearch}>
        {tab === "billing" && <BillingTerminal globalSearch={search} onNavigate={setTab} />}
        {tab === "sales" && <SalesHistory globalSearch={search} />}
        {tab === "inventory" && <InventoryManager globalSearch={search} />}
        {tab === "purchase" && <PurchaseManager />}
        {tab === "parties" && <PartyManager globalSearch={search} />}
        {tab === "analytics" && <AnalyticsDashboard />}
        {tab === "settings" && <SettingsManager />}
      </AppShell>
    </ToastProvider>
  );
}
