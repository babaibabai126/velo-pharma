import { useState } from "react";
import { Settings, Save, RotateCcw, Building2, Receipt, Printer, ShieldCheck, Store } from "lucide-react";
import { useStore } from "../store/StoreContext";
import { useToast } from "../components/ui";
import type { StoreSettings } from "../types";

export const SettingsManager = () => {
  const { db, setSettings, resetAll } = useStore();
  const toast = useToast();
  const [f, setF] = useState<StoreSettings>({ ...db.settings });
  const set = (k: keyof StoreSettings, v: any) => setF((p) => ({ ...p, [k]: v }));

  const save = () => { setSettings(f); toast("success", "Settings saved", "Pharmacy configuration updated"); };
  const reset = () => {
    if (confirm("Reset ALL data to seed defaults? This clears medicines, sales, purchases, customers. Cannot be undone.")) {
      resetAll();
      toast("success", "Data reset", "All data restored to seed defaults");
      setTimeout(() => window.location.reload(), 600);
    }
  };

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2>System & Pharmacy Settings</h2>
          <p>Store credentials, DL license, GSTIN, thermal printing preferences</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--danger" onClick={reset}><RotateCcw size={14} /> Reset Demo Data</button>
          <button className="btn btn--accent" onClick={save}><Save size={14} /> Save Settings</button>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {/* Store identity */}
        <div className="card" style={{ padding: 18 }}>
          <div className="card__head"><Store size={18} color="var(--primary)" /><div className="card__title">Store Identity</div></div>
          <div className="flex-col gap-3">
            <div className="field"><label className="label">Pharmacy Name</label><input className="input" value={f.pharmacyName} onChange={(e) => set("pharmacyName", e.target.value)} /></div>
            <div className="field"><label className="label">Tagline</label><input className="input" value={f.tagline} onChange={(e) => set("tagline", e.target.value)} /></div>
            <div className="field"><label className="label">Address</label><textarea className="textarea" value={f.address} onChange={(e) => set("address", e.target.value)} /></div>
            <div className="field-row">
              <div className="field"><label className="label">City</label><input className="input" value={f.city} onChange={(e) => set("city", e.target.value)} /></div>
              <div className="field"><label className="label">State</label><input className="input" value={f.state} onChange={(e) => set("state", e.target.value)} /></div>
              <div className="field"><label className="label">Pincode</label><input className="input" value={f.pincode} onChange={(e) => set("pincode", e.target.value)} /></div>
            </div>
            <div className="field-row">
              <div className="field"><label className="label">Phone</label><input className="input" value={f.phone} onChange={(e) => set("phone", e.target.value)} /></div>
              <div className="field"><label className="label">Email</label><input className="input" value={f.email} onChange={(e) => set("email", e.target.value)} /></div>
            </div>
          </div>
        </div>

        <div className="flex-col gap-3">
          {/* Compliance */}
          <div className="card" style={{ padding: 18 }}>
            <div className="card__head"><ShieldCheck size={18} color="var(--primary)" /><div className="card__title">Regulatory & Compliance</div></div>
            <div className="flex-col gap-3">
              <div className="field-row">
                <div className="field"><label className="label">GSTIN</label><input className="input mono" value={f.gstin} onChange={(e) => set("gstin", e.target.value)} /></div>
                <div className="field"><label className="label">Drug License (DL)</label><input className="input mono" value={f.dlNumber} onChange={(e) => set("dlNumber", e.target.value)} /></div>
              </div>
              <div className="pill pill--green" style={{ alignSelf: "flex-start" }}>Schedule H / H1 prescription tracking: Enabled</div>
            </div>
          </div>

          {/* Billing preferences */}
          <div className="card" style={{ padding: 18 }}>
            <div className="card__head"><Receipt size={18} color="var(--primary)" /><div className="card__title">Billing Preferences</div></div>
            <div className="flex-col gap-3">
              <div className="field"><label className="label">Currency Symbol</label><input className="input" style={{ width: 80 }} value={f.currency} onChange={(e) => set("currency", e.target.value)} /></div>
              <label className="flex items-center gap-2 text-sm" style={{ cursor: "pointer", padding: "8px 0" }}>
                <input type="checkbox" checked={f.thermalPrint} onChange={(e) => set("thermalPrint", e.target.checked)} />
                Enable 80mm thermal receipt printing
              </label>
            </div>
          </div>

          {/* Invoice footer */}
          <div className="card" style={{ padding: 18 }}>
            <div className="card__head"><Printer size={18} color="var(--primary)" /><div className="card__title">Invoice Footer</div></div>
            <div className="field"><textarea className="textarea" style={{ minHeight: 80 }} value={f.invoiceFooter} onChange={(e) => set("invoiceFooter", e.target.value)} /></div>
          </div>
        </div>
      </div>

      {/* System info */}
      <div className="card" style={{ padding: 18, background: "var(--grad-green)" }}>
        <div className="card__head"><Settings size={18} color="var(--primary)" /><div className="card__title">System Information</div></div>
        <div className="grid grid-4">
          <Info label="Version" value="Velo Pharma 1.0.0" />
          <Info label="Data Storage" value="Browser localStorage" />
          <Info label="Total Medicines" value={String(db.medicines.length)} />
          <Info label="Total Sales" value={String(db.sales.length)} />
        </div>
      </div>
    </div>
  );
};

const Info = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-xs text-dim" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
    <div style={{ fontWeight: 700, marginTop: 2 }}>{value}</div>
  </div>
);
