import { useState } from "react";
import { AppShell, type TabId } from "./components/Shell";
import { ToastProvider } from "./components/ui";
import { Dashboard } from "./pages/Dashboard";
import { BillingTerminal } from "./pages/BillingTerminal";
import { SalesHistory } from "./pages/SalesHistory";
import { InventoryManager } from "./pages/InventoryManager";
import { PurchaseManager } from "./pages/PurchaseManager";
import { PartyManager } from "./pages/PartyManager";
import { AnalyticsDashboard } from "./pages/AnalyticsDashboard";
import { SettingsManager } from "./pages/SettingsManager";

export default function App() {
  const [tab, setTab] = useState<TabId>("billing");
  const [search, setSearch] = useState("");

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
        {/* Dashboard accessible as overview above billing when on billing with empty state? handled within */}
      </AppShell>
    </ToastProvider>
  );
}
