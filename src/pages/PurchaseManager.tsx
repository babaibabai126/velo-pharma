import { useMemo, useState } from "react";
import { Truck, Plus, FileText, Wallet, Package, Trash2, Eye, X } from "lucide-react";
import { useStore } from "../store/StoreContext";
import { useToast, Modal } from "../components/ui";
import { formatCurrency, formatDate, roundTo2, daysBetween } from "../utils/formatters";
import type { Purchase, PurchaseItem, Medicine } from "../types";

export const PurchaseManager = () => {
  const { db, createPurchase } = useStore();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState<Purchase | null>(null);

  const stats = useMemo(() => {
    const total = db.purchases.reduce((s, p) => s + p.totalAmount, 0);
    const paid = db.purchases.reduce((s, p) => s + p.paidAmount, 0);
    const outstanding = total - paid;
    const count = db.purchases.length;
    return { total, paid, outstanding, count };
  }, [db.purchases]);

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2>Purchase Orders & GRN</h2>
          <p>Record supplier inward, batch creation, landed cost tracking</p>
        </div>
        <div className="page__actions">
          <button className="btn btn--accent" onClick={() => setShowForm(true)}><Plus size={14} /> New Purchase (GRN)</button>
        </div>
      </div>

      <div className="grid grid-4">
        <Card label="Total Purchases" value={formatCurrency(stats.total)} icon={Package} grad="var(--grad-green)" tile="var(--tile-green)" sub={`${stats.count} GRN entries`} />
        <Card label="Paid to Suppliers" value={formatCurrency(stats.paid)} icon={Wallet} grad="var(--grad-blue)" tile="var(--tile-blue)" sub="Settled" />
        <Card label="Payables Outstanding" value={formatCurrency(stats.outstanding)} icon={Truck} grad="var(--grad-amber)" tile="var(--tile-amber)" sub="Vendor dues" />
        <Card label="Active Suppliers" value={String(db.suppliers.length)} icon={Truck} grad="var(--grad-purple)" tile="var(--tile-purple)" sub="Vendors" />
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap" style={{ border: "none", borderRadius: 0, maxHeight: "none" }}>
          <table className="table">
            <thead><tr><th>Invoice</th><th>Supplier</th><th>Date</th><th>Due</th><th>Items</th><th>Subtotal</th><th>Tax</th><th>Total</th><th>Paid</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {db.purchases.length === 0 && <tr><td colSpan={11}><div className="empty-state"><div className="empty-state__icon"><Truck size={22} /></div><div>No purchases yet</div></div></td></tr>}
              {db.purchases.map((p) => (
                <tr key={p.id}>
                  <td className="mono" style={{ fontWeight: 700 }}>{p.invoiceNumber}</td>
                  <td style={{ fontWeight: 600 }}>{p.supplierName}</td>
                  <td className="text-sm text-muted">{formatDate(p.purchaseDate)}</td>
                  <td className="text-sm text-muted">{formatDate(p.dueDate)}</td>
                  <td className="mono">{p.items.length}</td>
                  <td className="mono">{formatCurrency(p.subtotal)}</td>
                  <td className="mono text-sm">{formatCurrency(p.taxAmount)}</td>
                  <td className="mono" style={{ fontWeight: 700 }}>{formatCurrency(p.totalAmount)}</td>
                  <td className="mono" style={{ color: "var(--teal)" }}>{formatCurrency(p.paidAmount)}</td>
                  <td>{p.paymentStatus === "PAID" ? <span className="pill pill--green">Paid</span> : p.paymentStatus === "PARTIAL" ? <span className="pill pill--amber">Partial</span> : <span className="pill pill--rose">Unpaid</span>}</td>
                  <td><button className="btn btn--ghost btn--icon btn--sm" onClick={() => setView(p)}><Eye size={13} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && <PurchaseForm onClose={() => setShowForm(false)} onSubmit={(data) => { const p = createPurchase(data); toast("success", "GRN saved", `${p.invoiceNumber} recorded`); setShowForm(false); }} />}
      {view && <PurchaseView purchase={view} onClose={() => setView(null)} />}
    </div>
  );
};

const Card = ({ label, value, icon: Icon, grad, tile, sub }: any) => (
  <div className="card" style={{ background: grad, padding: 16 }}>
    <div className="flex items-center gap-3 mb-2">
      <div style={{ width: 40, height: 40, borderRadius: 11, background: tile, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border-subtle)" }}>
        <Icon size={18} color="var(--primary)" />
      </div>
      <div className="text-sm text-muted">{label}</div>
    </div>
    <div style={{ fontSize: 26, fontWeight: 800, color: "var(--primary)", lineHeight: 1 }}>{value}</div>
    <div className="text-xs text-dim mt-2">{sub}</div>
  </div>
);

const PurchaseForm = ({ onClose, onSubmit }: { onClose: () => void; onSubmit: (p: Omit<Purchase, "id" | "invoiceNumber" | "createdAt">) => void }) => {
  const { db } = useStore();
  const [supplierId, setSupplierId] = useState(db.suppliers[0]?.id || "");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [paidAmount, setPaidAmount] = useState(0);
  const [items, setItems] = useState<Array<{ medicineId: string; batchNumber: string; expiryDate: string; quantity: number; freeQuantity: number; unitCost: number; mrp: number; gstRate: number; discount: number }>>([]);

  const addItem = () => setItems((p) => [...p, { medicineId: db.medicines[0]?.id || "", batchNumber: "", expiryDate: "", quantity: 1, freeQuantity: 0, unitCost: 0, mrp: 0, gstRate: 12, discount: 0 }]);
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  const upd = (i: number, k: string, v: any) => setItems((p) => p.map((x, idx) => idx === i ? { ...x, [k]: v } : x));

  const calc = items.reduce((acc, it) => {
    const gross = it.unitCost * (it.quantity + it.freeQuantity);
    const afterDisc = gross * (1 - it.discount / 100);
    const tax = afterDisc * it.gstRate / 100;
    return { subtotal: acc.subtotal + (afterDisc - tax), tax: acc.tax + tax, total: acc.total + afterDisc };
  }, { subtotal: 0, tax: 0, total: 0 });

  const submit = () => {
    if (!supplierId || items.length === 0) return;
    const supplier = db.suppliers.find((s) => s.id === supplierId);
    const purchaseItems: PurchaseItem[] = items.map((it) => {
      const gross = it.unitCost * (it.quantity + it.freeQuantity);
      const afterDisc = gross * (1 - it.discount / 100);
      return {
        id: Math.random().toString(36).slice(2), purchaseId: "", medicineId: it.medicineId,
        batchId: null, batchNumber: it.batchNumber, expiryDate: it.expiryDate ? new Date(it.expiryDate).toISOString() : new Date().toISOString(),
        quantity: it.quantity, freeQuantity: it.freeQuantity, unitCost: it.unitCost, mrp: it.mrp,
        gstRate: it.gstRate, discount: it.discount, totalCost: afterDisc,
      };
    });
    onSubmit({
      supplierId, supplierName: supplier?.name, purchaseDate: new Date(purchaseDate).toISOString(),
      dueDate: new Date(new Date(purchaseDate).getTime() + 30 * 86400000).toISOString(),
      subtotal: roundTo2(calc.subtotal), taxAmount: roundTo2(calc.tax), discountAmount: 0,
      totalAmount: roundTo2(calc.total), paidAmount, paymentStatus: paidAmount >= calc.total ? "PAID" : paidAmount > 0 ? "PARTIAL" : "UNPAID",
      paymentMethod: "BANK_TRANSFER", notes: null, items: purchaseItems,
    });
  };

  return (
    <Modal title="New Purchase (GRN)" onClose={onClose} size="xl" footer={<><button className="btn btn--ghost" onClick={onClose}>Cancel</button><button className="btn btn--accent" onClick={submit} disabled={!supplierId || items.length === 0}>Save Purchase</button></>}>
      <div className="flex-col gap-3">
        <div className="field-row">
          <div className="field"><label className="label">Supplier</label><select className="select" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>{db.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div className="field"><label className="label">Supplier Invoice No.</label><input className="input" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="Optional" /></div>
          <div className="field"><label className="label">Purchase Date</label><input className="input" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} /></div>
          <div className="field"><label className="label">Amount Paid Now</label><input className="input" type="number" value={paidAmount} onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)} /></div>
        </div>

        <div className="flex justify-between items-center">
          <div style={{ fontWeight: 700 }}>Items</div>
          <button className="btn btn--ghost btn--sm" onClick={addItem}><Plus size={13} /> Add Item</button>
        </div>

        {items.length === 0 ? <div className="empty-state"><div className="empty-state__icon"><Package size={22} /></div><div>No items. Add at least one.</div></div> : (
          <div className="table-wrap" style={{ border: "none" }}>
            <table className="table">
              <thead><tr><th>Medicine</th><th>Batch No.</th><th>Expiry</th><th>Qty</th><th>Free</th><th>Cost</th><th>MRP</th><th>GST%</th><th>Disc%</th><th>Total</th><th></th></tr></thead>
              <tbody>
                {items.map((it, i) => {
                  const gross = it.unitCost * (it.quantity + it.freeQuantity);
                  const afterDisc = gross * (1 - it.discount / 100);
                  return (
                    <tr key={i}>
                      <td><select className="select" style={{ padding: "4px 8px" }} value={it.medicineId} onChange={(e) => upd(i, "medicineId", e.target.value)}>{db.medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></td>
                      <td><input className="input" style={{ padding: "4px 8px", width: 90 }} value={it.batchNumber} onChange={(e) => upd(i, "batchNumber", e.target.value)} /></td>
                      <td><input className="input" style={{ padding: "4px 8px", width: 130 }} type="date" value={it.expiryDate} onChange={(e) => upd(i, "expiryDate", e.target.value)} /></td>
                      <td><input className="input" style={{ padding: "4px 8px", width: 60 }} type="number" value={it.quantity} onChange={(e) => upd(i, "quantity", parseInt(e.target.value) || 0)} /></td>
                      <td><input className="input" style={{ padding: "4px 8px", width: 50 }} type="number" value={it.freeQuantity} onChange={(e) => upd(i, "freeQuantity", parseInt(e.target.value) || 0)} /></td>
                      <td><input className="input" style={{ padding: "4px 8px", width: 70 }} type="number" value={it.unitCost} onChange={(e) => upd(i, "unitCost", parseFloat(e.target.value) || 0)} /></td>
                      <td><input className="input" style={{ padding: "4px 8px", width: 70 }} type="number" value={it.mrp} onChange={(e) => upd(i, "mrp", parseFloat(e.target.value) || 0)} /></td>
                      <td><input className="input" style={{ padding: "4px 8px", width: 50 }} type="number" value={it.gstRate} onChange={(e) => upd(i, "gstRate", parseFloat(e.target.value) || 0)} /></td>
                      <td><input className="input" style={{ padding: "4px 8px", width: 50 }} type="number" value={it.discount} onChange={(e) => upd(i, "discount", parseFloat(e.target.value) || 0)} /></td>
                      <td className="mono" style={{ fontWeight: 700 }}>{formatCurrency(afterDisc)}</td>
                      <td><button className="btn btn--danger btn--icon btn--sm" onClick={() => removeItem(i)}><Trash2 size={12} /></button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="card" style={{ background: "var(--grad-green)", padding: 14, display: "flex", justifyContent: "flex-end", gap: 30 }}>
          <div><div className="text-xs text-dim">Subtotal</div><div className="mono" style={{ fontWeight: 700 }}>{formatCurrency(calc.subtotal)}</div></div>
          <div><div className="text-xs text-dim">Tax</div><div className="mono" style={{ fontWeight: 700 }}>{formatCurrency(calc.tax)}</div></div>
          <div><div className="text-xs text-dim">Total</div><div className="mono" style={{ fontSize: 20, fontWeight: 800, color: "var(--primary)" }}>{formatCurrency(calc.total)}</div></div>
        </div>
      </div>
    </Modal>
  );
};

const PurchaseView = ({ purchase, onClose }: { purchase: Purchase; onClose: () => void }) => {
  const { db } = useStore();
  const medName = (id: string) => db.medicines.find((m) => m.id === id)?.name || "—";
  return (
    <Modal title={`Purchase ${purchase.invoiceNumber}`} onClose={onClose} size="lg">
      <div className="flex-col gap-3">
        <div className="field-row">
          <div className="field"><label className="label">Supplier</label><div>{purchase.supplierName}</div></div>
          <div className="field"><label className="label">Date</label><div>{formatDate(purchase.purchaseDate)}</div></div>
          <div className="field"><label className="label">Due</label><div>{formatDate(purchase.dueDate)}</div></div>
        </div>
        <div className="table-wrap" style={{ border: "none" }}>
          <table className="table">
            <thead><tr><th>Item</th><th>Batch</th><th>Expiry</th><th>Qty</th><th>Free</th><th>Cost</th><th>MRP</th><th>GST</th><th>Total</th></tr></thead>
            <tbody>
              {purchase.items.map((it) => (
                <tr key={it.id}>
                  <td>{medName(it.medicineId)}</td>
                  <td className="mono text-sm">{it.batchNumber}</td>
                  <td className="text-sm">{formatDate(it.expiryDate)}</td>
                  <td className="mono">{it.quantity}</td>
                  <td className="mono">{it.freeQuantity}</td>
                  <td className="mono">{formatCurrency(it.unitCost)}</td>
                  <td className="mono">{formatCurrency(it.mrp)}</td>
                  <td className="mono text-sm">{it.gstRate}%</td>
                  <td className="mono" style={{ fontWeight: 700 }}>{formatCurrency(it.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-4">
          <div><div className="text-xs text-dim">Subtotal</div><div className="mono">{formatCurrency(purchase.subtotal)}</div></div>
          <div><div className="text-xs text-dim">Tax</div><div className="mono">{formatCurrency(purchase.taxAmount)}</div></div>
          <div><div className="text-xs text-dim">Total</div><div className="mono" style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)" }}>{formatCurrency(purchase.totalAmount)}</div></div>
          <div><div className="text-xs text-dim">Paid</div><div className="mono" style={{ color: "var(--teal)" }}>{formatCurrency(purchase.paidAmount)}</div></div>
        </div>
      </div>
    </Modal>
  );
};
