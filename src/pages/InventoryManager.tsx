import { useMemo, useState } from "react";
import {
  Boxes, Plus, Search, Pill, AlertTriangle, XCircle, CheckCircle2,
  Trash2, Edit3, SlidersHorizontal, Package, ShieldAlert,
} from "lucide-react";
import { useStore, classifyBatch } from "../store/StoreContext";
import { useToast, Modal } from "../components/ui";
import { formatCurrency, formatDate, daysBetween, roundTo2 } from "../utils/formatters";
import type { Medicine, Batch, DosageForm, AdjustmentType } from "../types";

type ExpiryFilter = "all" | "active" | "near" | "expired";

export const InventoryManager = ({ globalSearch }: { globalSearch: string }) => {
  const { db, addMedicine, updateMedicine, deleteMedicine, addBatch, adjustStock } = useStore();
  const toast = useToast();
  const [search, setSearch] = useState(globalSearch || "");
  const [expFilter, setExpFilter] = useState<ExpiryFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [medModal, setMedModal] = useState<{ med?: Medicine } | null>(null);
  const [batchModal, setBatchModal] = useState<{ med: Medicine } | null>(null);
  const [adjModal, setAdjModal] = useState<{ batch: Batch; med: Medicine } | null>(null);

  const medsWithStock = useMemo(() => {
    return db.medicines.map((m) => {
      const batches = db.batches.filter((b) => b.medicineId === m.id);
      const stock = batches.filter((b) => b.status !== "EXPIRED").reduce((s, b) => s + b.quantity, 0);
      const stockValue = batches.reduce((s, b) => s + b.quantity * b.purchasePrice, 0);
      const nearExpiry = batches.some((b) => b.quantity > 0 && b.status !== "EXPIRED" && classifyBatch(b.expiryDate) === "NEAR_EXPIRY");
      const hasExpired = batches.some((b) => b.quantity > 0 && b.status === "EXPIRED");
      return { ...m, batches, stock, stockValue, nearExpiry, hasExpired };
    });
  }, [db.medicines, db.batches]);

  const filtered = useMemo(() => {
    const q = (search || globalSearch).trim().toLowerCase();
    let list = medsWithStock;
    if (q) list = list.filter((m) =>
      m.name.toLowerCase().includes(q) ||
      m.genericName.toLowerCase().includes(q) ||
      m.sku.toLowerCase().includes(q) ||
      (m.rackLocation || "").toLowerCase().includes(q)
    );
    if (expFilter === "near") list = list.filter((m) => m.nearExpiry);
    if (expFilter === "expired") list = list.filter((m) => m.hasExpired);
    if (expFilter === "active") list = list.filter((m) => m.stock > 0 && !m.nearExpiry && !m.hasExpired);
    return list;
  }, [medsWithStock, search, globalSearch, expFilter]);

  const totals = useMemo(() => {
    const stockValue = db.batches.reduce((s, b) => s + b.quantity * b.purchasePrice, 0);
    const lowStock = medsWithStock.filter((m) => m.stock < m.minStockAlert && m.stock > 0).length;
    const outStock = medsWithStock.filter((m) => m.stock === 0).length;
    const nearExpiry = db.batches.filter((b) => b.quantity > 0 && b.status !== "EXPIRED" && classifyBatch(b.expiryDate) === "NEAR_EXPIRY").length;
    const expired = db.batches.filter((b) => b.quantity > 0 && b.status === "EXPIRED").length;
    return { stockValue, lowStock, outStock, nearExpiry, expired, skuCount: db.medicines.length };
  }, [db.batches, db.medicines, medsWithStock]);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2>Medicine & Stock Inventory</h2>
          <p>Hierarchical batch tracking, expiry watch, stock adjustments</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--ghost" onClick={() => setMedModal({})}><Plus size={14} /> Add Medicine</button>
        </div>
      </div>

      {/* Expiry watch summary */}
      <div className="grid grid-4">
        <SummaryCard icon={Package} label="Total SKUs" value={String(totals.skuCount)} grad="var(--grad-green)" tile="var(--tile-green)" />
        <SummaryCard icon={AlertTriangle} label="Near Expiry" value={String(totals.nearExpiry)} grad="var(--grad-amber)" tile="var(--tile-amber)" tone="amber" />
        <SummaryCard icon={XCircle} label="Expired Batches" value={String(totals.expired)} grad="var(--grad-rose)" tile="var(--tile-pink)" tone="rose" />
        <SummaryCard icon={ShieldAlert} label="Low / Out of Stock" value={`${totals.lowStock} / ${totals.outStock}`} grad="var(--grad-blue)" tile="var(--tile-blue)" tone="blue" />
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: 14 }}>
        <div className="flex items-center gap-3" style={{ flexWrap: "wrap" }}>
          <SlidersHorizontal size={15} color="var(--text-dim)" />
          <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
            {([
              { id: "all", label: "All" }, { id: "active", label: "🟢 Active" },
              { id: "near", label: "🟡 Near Expiry" }, { id: "expired", label: "🔴 Expired" },
            ] as { id: ExpiryFilter; label: string }[]).map((f) => (
              <button key={f.id} className={`btn btn--sm ${expFilter === f.id ? "btn--primary" : "btn--ghost"}`} onClick={() => setExpFilter(f.id)}>{f.label}</button>
            ))}
          </div>
          <div style={{ flex: 1, minWidth: 220, display: "flex", alignItems: "center", gap: 8, background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-pill)", padding: "8px 14px" }}>
            <Search size={14} color="var(--text-dim)" />
            <input placeholder="Search by name, generic, SKU, rack…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: "none", background: "transparent", flex: 1, color: "var(--text-main)", fontSize: 13 }} />
          </div>
        </div>
      </div>

      {/* Medicine table with expandable batches */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap" style={{ maxHeight: "none", border: "none", borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 30 }}></th><th>Medicine</th><th>Category</th><th>Form</th>
                <th>Rack</th><th>Stock</th><th>Min Alert</th><th>Stock Value</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={10}><div className="empty-state"><div className="empty-state__icon"><Boxes size={22} /></div><div>No medicines match filters</div></div></td></tr>
              )}
              {filtered.map((m) => {
                const isLow = m.stock < m.minStockAlert;
                const isOut = m.stock === 0;
                return (
                  <>
                    <tr key={m.id} style={{ cursor: "pointer" }} onClick={() => setExpanded(expanded === m.id ? null : m.id)}>
                      <td style={{ color: "var(--text-dim)" }}>{expanded === m.id ? "▾" : "▸"}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{m.name} {m.strength && <span className="text-dim">({m.strength})</span>}</div>
                        <div className="text-xs text-dim">{m.genericName} • {m.manufacturer}{m.prescriptionRequired && <span style={{ color: "var(--rose)" }}> • Rx</span>}</div>
                      </td>
                      <td className="text-sm">{m.category}</td>
                      <td className="text-sm">{m.dosageForm}</td>
                      <td className="mono text-sm">{m.rackLocation || "—"}</td>
                      <td className="mono" style={{ fontWeight: 700, color: isOut ? "var(--rose)" : isLow ? "var(--amber)" : "var(--text-main)" }}>{m.stock}</td>
                      <td className="mono text-sm text-muted">{m.minStockAlert}</td>
                      <td className="mono text-sm">{formatCurrency(m.stockValue)}</td>
                      <td>
                        {isOut ? <span className="pill pill--rose">Out of stock</span>
                          : isLow ? <span className="pill pill--amber">Low stock</span>
                          : m.hasExpired ? <span className="pill pill--rose">Has expired</span>
                          : m.nearExpiry ? <span className="pill pill--amber">Near expiry</span>
                          : <span className="pill pill--green">Active</span>}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2">
                          <button className="btn btn--ghost btn--icon btn--sm" title="Add batch" onClick={() => setBatchModal({ med: m })}><Plus size={13} /></button>
                          <button className="btn btn--ghost btn--icon btn--sm" title="Edit" onClick={() => setMedModal({ med: m })}><Edit3 size={13} /></button>
                          <button className="btn btn--danger btn--icon btn--sm" title="Delete" onClick={() => { if (confirm(`Delete ${m.name}?`)) { deleteMedicine(m.id); toast("success", "Deleted", `${m.name} removed`); } }}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                    {expanded === m.id && (
                      <tr key={m.id + "-b"}>
                        <td></td>
                        <td colSpan={9} style={{ background: "var(--bg-surface)", padding: 14 }}>
                          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 13, color: "var(--text-muted)" }}>Batches ({m.batches.length})</div>
                          {m.batches.length === 0 ? (
                            <div className="text-sm text-dim">No batches. <button className="btn btn--ghost btn--sm" onClick={() => setBatchModal({ med: m })}>Add first batch</button></div>
                          ) : (
                            <table className="table" style={{ background: "var(--bg-card)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                              <thead><tr><th>Batch No.</th><th>Expiry</th><th>Days Left</th><th>Purchase</th><th>MRP</th><th>Retail</th><th>Wholesale</th><th>Qty</th><th>Status</th><th></th></tr></thead>
                              <tbody>
                                {m.batches.map((b) => {
                                  const cls = classifyBatch(b.expiryDate);
                                  return (
                                    <tr key={b.id}>
                                      <td className="mono" style={{ fontWeight: 600 }}>{b.batchNumber}</td>
                                      <td className="text-sm">{formatDate(b.expiryDate)}</td>
                                      <td className={`mono text-sm ${cls === "EXPIRED" ? "text-dim" : cls === "NEAR_EXPIRY" ? "" : ""}`} style={{ color: cls === "EXPIRED" ? "var(--rose)" : cls === "NEAR_EXPIRY" ? "var(--amber)" : "var(--text-muted)" }}>{b.quantity > 0 ? daysBetween(b.expiryDate) : "—"}</td>
                                      <td className="mono text-sm">{formatCurrency(b.purchasePrice)}</td>
                                      <td className="mono text-sm">{formatCurrency(b.mrp)}</td>
                                      <td className="mono text-sm">{formatCurrency(b.retailPrice)}</td>
                                      <td className="mono text-sm">{formatCurrency(b.wholesalePrice)}</td>
                                      <td className="mono" style={{ fontWeight: 700 }}>{b.quantity}</td>
                                      <td>
                                        {cls === "EXPIRED" && b.quantity > 0 ? <span className="pill pill--rose">Expired</span>
                                          : b.quantity === 0 ? <span className="pill pill--ghost">Depleted</span>
                                          : cls === "NEAR_EXPIRY" ? <span className="pill pill--amber">Near expiry</span>
                                          : <span className="pill pill--green">Active</span>}
                                      </td>
                                      <td>{b.quantity > 0 && <button className="btn btn--ghost btn--sm" onClick={() => setAdjModal({ batch: b, med: m })}><SlidersHorizontal size={12} /> Adjust</button>}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent adjustments */}
      <div className="card" style={{ padding: 18 }}>
        <div className="card__head"><SlidersHorizontal size={18} color="var(--primary)" /><div className="card__title">Recent Stock Adjustments</div></div>
        {db.adjustments.length === 0 ? <div className="empty-state"><div className="empty-state__icon"><SlidersHorizontal size={22} /></div><div>No adjustments yet</div></div> : (
          <div className="table-wrap" style={{ border: "none" }}>
            <table className="table">
              <thead><tr><th>Date</th><th>Medicine</th><th>Batch</th><th>Type</th><th>Qty</th><th>Reason</th></tr></thead>
              <tbody>
                {db.adjustments.slice(0, 8).map((a) => (
                  <tr key={a.id}>
                    <td className="text-sm text-muted">{formatDate(a.createdAt)}</td>
                    <td style={{ fontWeight: 600 }}>{a.medicineName}</td>
                    <td className="mono text-sm">{a.batchNumber}</td>
                    <td><span className={`pill ${a.type === "DAMAGE" || a.type === "EXPIRED_WRITE_OFF" ? "pill--rose" : "pill--blue"}`}>{a.type.replace(/_/g, " ")}</span></td>
                    <td className="mono" style={{ fontWeight: 700, color: "var(--rose)" }}>-{a.quantity}</td>
                    <td className="text-sm">{a.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {medModal && <MedicineModal med={medModal.med} onClose={() => setMedModal(null)} onSave={(data) => {
        if (medModal.med) { updateMedicine(medModal.med.id, data); toast("success", "Updated", `${data.name} saved`); }
        else { const m = addMedicine(data); toast("success", "Created", `${m.name} added`); }
        setMedModal(null);
      }} />}
      {batchModal && <BatchModal med={batchModal.med} onClose={() => setBatchModal(null)} onSave={(data) => { addBatch({ ...data, medicineId: batchModal.med.id }); toast("success", "Batch added", `${data.batchNumber} for ${batchModal.med.name}`); setBatchModal(null); }} />}
      {adjModal && <AdjustModal med={adjModal.med} batch={adjModal.batch} onClose={() => setAdjModal(null)} onApply={(type, qty, reason) => { adjustStock({ medicineId: adjModal.med.id, batchId: adjModal.batch.id, type, quantity: qty, reason }); toast("success", "Adjusted", `${qty} units removed from ${adjModal.batch.batchNumber}`); setAdjModal(null); }} />}
    </div>
  );
};

const SummaryCard = ({ icon: Icon, label, value, grad, tile, tone }: { icon: typeof Boxes; label: string; value: string; grad: string; tile: string; tone?: string }) => (
  <div className="card" style={{ background: grad, padding: 16 }}>
    <div className="flex items-center gap-3 mb-2">
      <div style={{ width: 40, height: 40, borderRadius: 11, background: tile, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border-subtle)" }}>
        <Icon size={18} color={tone === "rose" ? "var(--rose)" : tone === "amber" ? "var(--amber)" : tone === "blue" ? "var(--cyan)" : "var(--primary)"} />
      </div>
      <div className="text-sm text-muted">{label}</div>
    </div>
    <div style={{ fontSize: 26, fontWeight: 800, color: "var(--primary)", lineHeight: 1 }}>{value}</div>
  </div>
);

const MedicineModal = ({ med, onClose, onSave }: { med?: Medicine; onClose: () => void; onSave: (data: Partial<Medicine>) => void }) => {
  const [f, setF] = useState<Partial<Medicine>>(med || {
    name: "", genericName: "", category: "General", dosageForm: "TABLET", strength: "",
    manufacturer: "", hsnCode: "30049099", gstRate: 12, minStockAlert: 20, rackLocation: "",
    prescriptionRequired: false,
  });
  const set = (k: keyof Medicine, v: any) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Modal title={med ? "Edit Medicine" : "Add Medicine"} onClose={onClose} footer={<><button className="btn btn--ghost" onClick={onClose}>Cancel</button><button className="btn btn--accent" onClick={() => onSave(f)}>Save</button></>}>
      <div className="flex-col gap-3">
        <div className="field-row">
          <div className="field"><label className="label">Brand Name</label><input className="input" value={f.name || ""} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="field"><label className="label">Generic Name</label><input className="input" value={f.genericName || ""} onChange={(e) => set("genericName", e.target.value)} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label className="label">Category</label><input className="input" value={f.category || ""} onChange={(e) => set("category", e.target.value)} /></div>
          <div className="field"><label className="label">Dosage Form</label>
            <select className="select" value={f.dosageForm || "TABLET"} onChange={(e) => set("dosageForm", e.target.value)}>
              {["TABLET","CAPSULE","SYRUP","INJECTION","OINTMENT","DROPS","SUSPENSION","INHALER","CREAM","GEL","POWDER","OTHER"].map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="field"><label className="label">Strength</label><input className="input" placeholder="500mg" value={f.strength || ""} onChange={(e) => set("strength", e.target.value)} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label className="label">Manufacturer</label><input className="input" value={f.manufacturer || ""} onChange={(e) => set("manufacturer", e.target.value)} /></div>
          <div className="field"><label className="label">Rack Location</label><input className="input" placeholder="A-01" value={f.rackLocation || ""} onChange={(e) => set("rackLocation", e.target.value)} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label className="label">HSN Code</label><input className="input" value={f.hsnCode || ""} onChange={(e) => set("hsnCode", e.target.value)} /></div>
          <div className="field"><label className="label">GST Rate %</label><input className="input" type="number" value={f.gstRate ?? 12} onChange={(e) => set("gstRate", parseFloat(e.target.value) || 0)} /></div>
          <div className="field"><label className="label">Min Stock Alert</label><input className="input" type="number" value={f.minStockAlert ?? 20} onChange={(e) => set("minStockAlert", parseInt(e.target.value) || 0)} /></div>
        </div>
        <label className="flex items-center gap-2 text-sm" style={{ cursor: "pointer" }}>
          <input type="checkbox" checked={f.prescriptionRequired || false} onChange={(e) => set("prescriptionRequired", e.target.checked)} />
          Prescription Required (Schedule H / H1)
        </label>
      </div>
    </Modal>
  );
};

const BatchModal = ({ med, onClose, onSave }: { med: Medicine; onClose: () => void; onSave: (data: Partial<Batch>) => void }) => {
  const [f, setF] = useState<Partial<Batch>>({
    batchNumber: "", expiryDate: "", quantity: 0, purchasePrice: 0, mrp: 0,
    retailPrice: 0, wholesalePrice: 0,
  });
  const set = (k: keyof Batch, v: any) => setF((p) => ({ ...p, [k]: v }));
  const expDateStr = f.expiryDate ? new Date(f.expiryDate).toISOString().slice(0, 10) : "";
  return (
    <Modal title={`Add Batch — ${med.name}`} onClose={onClose} footer={<><button className="btn btn--ghost" onClick={onClose}>Cancel</button><button className="btn btn--accent" onClick={() => onSave({ ...f, expiryDate: f.expiryDate ? new Date(f.expiryDate).toISOString() : new Date().toISOString() })}>Add Batch</button></>}>
      <div className="flex-col gap-3">
        <div className="field-row">
          <div className="field"><label className="label">Batch Number</label><input className="input" value={f.batchNumber || ""} onChange={(e) => set("batchNumber", e.target.value)} /></div>
          <div className="field"><label className="label">Expiry Date</label><input className="input" type="date" value={expDateStr} onChange={(e) => set("expiryDate", e.target.value ? new Date(e.target.value).toISOString() : "")} /></div>
          <div className="field"><label className="label">Quantity</label><input className="input" type="number" value={f.quantity || 0} onChange={(e) => set("quantity", parseInt(e.target.value) || 0)} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label className="label">Purchase Price</label><input className="input" type="number" value={f.purchasePrice || 0} onChange={(e) => set("purchasePrice", parseFloat(e.target.value) || 0)} /></div>
          <div className="field"><label className="label">MRP</label><input className="input" type="number" value={f.mrp || 0} onChange={(e) => set("mrp", parseFloat(e.target.value) || 0)} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label className="label">Retail Price</label><input className="input" type="number" value={f.retailPrice || 0} onChange={(e) => set("retailPrice", parseFloat(e.target.value) || 0)} /></div>
          <div className="field"><label className="label">Wholesale Price</label><input className="input" type="number" value={f.wholesalePrice || 0} onChange={(e) => set("wholesalePrice", parseFloat(e.target.value) || 0)} /></div>
        </div>
        {f.mrp && f.retailPrice === 0 && (
          <button className="btn btn--ghost btn--sm" onClick={() => { set("retailPrice", roundTo2(f.mrp! * 0.9)); set("wholesalePrice", roundTo2(f.mrp! * 0.78)); }}>Auto-fill retail/wholesale from MRP</button>
        )}
      </div>
    </Modal>
  );
};

const AdjustModal = ({ med, batch, onClose, onApply }: { med: Medicine; batch: Batch; onClose: () => void; onApply: (type: AdjustmentType, qty: number, reason: string) => void }) => {
  const [type, setType] = useState<AdjustmentType>("DAMAGE");
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState("");
  return (
    <Modal title={`Adjust Stock — ${med.name} (${batch.batchNumber})`} onClose={onClose} footer={<><button className="btn btn--ghost" onClick={onClose}>Cancel</button><button className="btn btn--danger" onClick={() => onApply(type, qty, reason)} disabled={qty <= 0 || qty > batch.quantity}>Apply Adjustment</button></>}>
      <div className="flex-col gap-3">
        <div className="card" style={{ background: "var(--grad-amber)", padding: 14 }}>
          <div className="text-xs text-dim">Current Quantity</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--primary)" }}>{batch.quantity}</div>
        </div>
        <div className="field"><label className="label">Adjustment Type</label>
          <select className="select" value={type} onChange={(e) => setType(e.target.value as AdjustmentType)}>
            <option value="DAMAGE">Damage / Breakage</option>
            <option value="EXPIRED_WRITE_OFF">Expired Write-off</option>
            <option value="INVENTORY_AUDIT">Inventory Audit Correction</option>
            <option value="RETURN_TO_SUPPLIER">Return to Supplier</option>
            <option value="CORRECTION">Correction</option>
          </select>
        </div>
        <div className="field"><label className="label">Quantity to Remove</label><input className="input" type="number" min={1} max={batch.quantity} value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 0)} /></div>
        <div className="field"><label className="label">Reason</label><textarea className="textarea" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Brief reason for adjustment…" /></div>
      </div>
    </Modal>
  );
};
