import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Plus, Minus, Trash2, ShoppingCart, X,
  CreditCard, Banknote, Smartphone, Wallet, Pause, Play, User,
  Pill, Tag, IndianRupee, CheckCircle2, Printer, Lock,
} from "lucide-react";
import { useStore, pickFEFO } from "../store/StoreContext";
import { useToast, Modal } from "../components/ui";
import { Dashboard } from "./Dashboard";
import { formatCurrency, formatDate, roundTo, roundTo2, daysBetween, genId, classifyBatch } from "../utils/formatters";
import type { CartItem, Sale, SaleType, PaymentMethod, SaleItem } from "../types";

export const BillingTerminal = ({ globalSearch, onNavigate }: { globalSearch: string; onNavigate: (t: any) => void }) => {
  const { db, createSale, holdCart, recallCart, removeHeldCart, listHeldCarts } = useStore();
  const toast = useToast();
  const [mode, setMode] = useState<SaleType>("RETAIL");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [doctorId, setDoctorId] = useState<string | null>(null);
  const [rxNumber, setRxNumber] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [showHeld, setShowHeld] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // sync global search
  useEffect(() => { if (globalSearch) setSearch(globalSearch); }, [globalSearch]);

  // Hotkeys
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (e.key !== "F1" && e.key !== "F3" && e.key !== "F8" && e.key !== "F9" && e.key !== "F10") return;
      }
      if (e.key === "F1") { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === "F3") { e.preventDefault(); setMode((m) => (m === "RETAIL" ? "WHOLESALE" : "RETAIL")); toast("info", "Billing mode", `Switched to ${mode === "RETAIL" ? "Wholesale B2B" : "Retail POS"}`); }
      else if (e.key === "F8") { e.preventDefault(); holdCurrentCart(); }
      else if (e.key === "F9") { e.preventDefault(); setShowHeld(true); }
      else if (e.key === "F10") { e.preventDefault(); if (cart.length) setShowCheckout(true); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cart, mode, customerId]);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = db.medicines.filter((m) => m.isActive);
    if (q) {
      list = list.filter((m) =>
        m.name.toLowerCase().includes(q) ||
        m.genericName.toLowerCase().includes(q) ||
        m.sku.toLowerCase().includes(q) ||
        (m.barcode || "").includes(q) ||
        (m.rackLocation || "").toLowerCase().includes(q)
      );
    }
    return list.slice(0, 8).map((m) => {
      const stock = db.batches.filter((b) => b.medicineId === m.id && b.status !== "EXPIRED").reduce((s, b) => s + b.quantity, 0);
      return { ...m, totalStock: stock };
    });
  }, [search, db.medicines, db.batches]);

  const addToCart = (medicineId: string) => {
    const med = db.medicines.find((m) => m.id === medicineId);
    if (!med) return;
    const batch = pickFEFO(db.batches, medicineId);
    if (!batch || batch.quantity <= 0) {
      toast("error", "Out of stock", `${med.name} has no available stock`);
      return;
    }
    const existing = cart.find((c) => c.medicine.id === medicineId && c.selectedBatch.id === batch.id);
    if (existing) {
      if (existing.quantity >= existing.maxAvailable) {
        toast("warning", "Max reached", `Only ${existing.maxAvailable} units of batch ${batch.batchNumber} available`);
        return;
      }
      setCart((c) => c.map((x) => x === existing ? { ...x, quantity: x.quantity + 1 } : x));
    } else {
      const price = mode === "WHOLESALE" ? batch.wholesalePrice : batch.retailPrice;
      setCart((c) => [...c, {
        medicine: med, selectedBatch: batch, quantity: 1,
        unitPrice: price, discountPercent: 0, maxAvailable: batch.quantity,
      }]);
    }
    setSearch("");
    toast("success", "Added", `${med.name} • FEFO batch ${batch.batchNumber}`);
  };

  const updateQty = (idx: number, delta: number) => {
    setCart((c) => c.map((x, i) => {
      if (i !== idx) return x;
      const q = Math.min(x.maxAvailable, Math.max(1, x.quantity + delta));
      return { ...x, quantity: q };
    }));
  };
  const setQty = (idx: number, q: number) => {
    setCart((c) => c.map((x, i) => i !== idx ? x : { ...x, quantity: Math.min(x.maxAvailable, Math.max(1, q)) }));
  };
  const setDiscount = (idx: number, d: number) =>
    setCart((c) => c.map((x, i) => i !== idx ? x : { ...x, discountPercent: Math.max(0, Math.min(100, d)) }));
  const removeItem = (idx: number) => setCart((c) => c.filter((_, i) => i !== idx));

  const totals = useMemo(() => {
    let subtotal = 0, tax = 0, discount = 0;
    cart.forEach((c) => {
      const gross = c.unitPrice * c.quantity;
      const disc = gross * (c.discountPercent / 100);
      const taxable = gross - disc;
      const t = taxable * (c.medicine.gstRate / 100);
      subtotal += taxable - t;
      tax += t;
      discount += disc;
    });
    const grand = roundTo(subtotal + tax);
    const roundOff = roundTo2(grand - (subtotal + tax));
    return { subtotal: roundTo2(subtotal), tax: roundTo2(tax), discount: roundTo2(discount), grand, roundOff };
  }, [cart]);

  const holdCurrentCart = () => {
    if (!cart.length) { toast("warning", "Empty cart", "Nothing to hold"); return; }
    holdCart(cart, mode, customerId);
    setCart([]); setCustomerId(null); setDoctorId(null); setRxNumber("");
    toast("success", "Cart held", `Recall anytime with F9`);
  };

  const recall = (id: string) => {
    const r = recallCart(id);
    if (r) {
      setCart(r.items); setMode(r.type); setCustomerId(r.customerId || null);
      removeHeldCart(id);
      setShowHeld(false);
      toast("success", "Cart recalled", `${r.items.length} items restored`);
    }
  };

  const completeSale = (paymentMethod: PaymentMethod, paidAmount: number) => {
    const customer = db.customers.find((c) => c.id === customerId) || null;
    const doctor = db.doctors.find((d) => d.id === doctorId) || null;
    const items: SaleItem[] = cart.map((c) => {
      const gross = c.unitPrice * c.quantity;
      const disc = gross * (c.discountPercent / 100);
      const taxable = gross - disc;
      const t = taxable * (c.medicine.gstRate / 100);
      return {
        id: genId("si"), saleId: "", medicineId: c.medicine.id, batchId: c.selectedBatch.id,
        medicineName: c.medicine.name, batchNumber: c.selectedBatch.batchNumber,
        expiryDate: c.selectedBatch.expiryDate, quantity: c.quantity,
        unitPrice: c.unitPrice, mrp: c.selectedBatch.mrp, gstRate: c.medicine.gstRate,
        taxAmount: roundTo2(t), discountPercent: c.discountPercent,
        discountAmount: roundTo2(disc), totalPrice: roundTo2(taxable),
      };
    });
    const change = Math.max(0, paidAmount - totals.grand);
    const paymentStatus: Sale["paymentStatus"] =
      paymentMethod === "CREDIT" ? "UNPAID" :
      paidAmount >= totals.grand ? "PAID" :
      paidAmount > 0 ? "PARTIAL" : "UNPAID";
    const sale = createSale({
      type: mode, customerId: customer?.id || null,
      customerName: customer?.name || "Walk-in Customer", customerPhone: customer?.phone || null,
      doctorId: doctor?.id || null, doctorName: doctor?.name || null,
      prescriptionNumber: rxNumber || null,
      subtotal: totals.subtotal, taxAmount: totals.tax, discountAmount: totals.discount,
      roundOff: totals.roundOff, grandTotal: totals.grand, paidAmount,
      changeAmount: change, paymentMethod, paymentStatus, notes: null, items, customer: customer || undefined,
    });
    setLastSale(sale);
    setShowCheckout(false);
    setShowInvoice(true);
    setCart([]); setCustomerId(null); setDoctorId(null); setRxNumber("");
    toast("success", "Sale completed", `Bill ${sale.billNumber} • ${formatCurrency(sale.grandTotal)}`);
  };

  return (
    <div className="page">
      {/* Dashboard overview at top */}
      <Dashboard onNavigate={onNavigate} />

      {/* Billing terminal */}
      <div className="page__head">
        <div>
          <h2>POS Billing Counter</h2>
          <p>FEFO auto-batch allocation • keyboard-first checkout</p>
        </div>
        <div className="page__actions">
          <div className="pill" style={{ background: mode === "RETAIL" ? "var(--teal-light)" : "var(--indigo-light)", color: mode === "RETAIL" ? "var(--teal)" : "var(--indigo)", borderColor: mode === "RETAIL" ? "var(--teal)" : "var(--indigo)" }}>
            {mode === "RETAIL" ? "Retail POS" : "Wholesale B2B"}
          </div>
            <button className="btn btn--ghost" onClick={() => setMode((m) => (m === "RETAIL" ? "WHOLESALE" : "RETAIL"))}>
            <kbd>F3</kbd> Toggle Mode
          </button>
          <button className="btn btn--ghost" onClick={holdCurrentCart}><Pause size={14} /> Hold (F8)</button>
          <button className="btn btn--ghost" onClick={() => setShowHeld(true)}><Play size={14} /> Recall (F9)</button>
        </div>
      </div>

      <div className="grid billing-grid">
        {/* Left: search + results */}
        <div className="flex-col gap-3">
          <div className="card" style={{ padding: 16 }}>
            <div className="flex items-center gap-3" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)", padding: "12px 16px" }}>
              <kbd style={{ fontWeight: 700, color: "var(--primary)" }}>F1</kbd>
              <Search size={16} color="var(--text-dim)" />
              <input
                ref={searchRef}
                autoFocus
                placeholder="Search medicine by name, generic, SKU, barcode, or rack…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1, border: "none", background: "transparent", color: "var(--text-main)", fontSize: 14 }}
              />
              {search && <button onClick={() => setSearch("")}><X size={15} color="var(--text-dim)" /></button>}
            </div>

            <div className="flex-col gap-2 mt-3">
              {results.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state__icon"><Pill size={22} /></div>
                  <div>{search ? "No medicines match your search" : "Start typing to search medicines"}</div>
                </div>
              )}
              {results.map((m) => {
                const fefo = pickFEFO(db.batches, m.id);
                const expClass = fefo ? classifyBatch(fefo.expiryDate) : "EXPIRED";
                return (
                  <button key={m.id} className="card billing-search-result" onClick={() => addToCart(m.id)} style={{ padding: 14, display: "flex", alignItems: "center", gap: 14, textAlign: "left", cursor: "pointer" }}>
                    <div style={{ width: 42, height: 42, borderRadius: 11, background: "var(--tile-green)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border-subtle)" }}>
                      <Pill size={18} color="var(--primary)" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)" }}>{m.name} <span className="text-dim text-sm">({m.strength})</span></div>
                      <div className="text-xs text-dim">{m.genericName} • {m.manufacturer} • Rack {m.rackLocation}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>{formatCurrency(mode === "WHOLESALE" ? fefo?.wholesalePrice || 0 : fefo?.retailPrice || 0)}</div>
                      <div className="text-xs" style={{ color: m.totalStock < m.minStockAlert ? "var(--amber)" : "var(--text-dim)" }}>
                        Stock: {m.totalStock}
                        {m.prescriptionRequired && <span style={{ marginLeft: 6, color: "var(--rose)" }}>Rx</span>}
                      </div>
                      {fefo && expClass === "NEAR_EXPIRY" && (
                        <div className="pill pill--amber" style={{ marginTop: 4, fontSize: 10 }}>FEFO {daysBetween(fefo.expiryDate)}d</div>
                      )}
                    </div>
                    <Plus size={16} color="var(--accent)" style={{ background: "var(--primary)", borderRadius: 8, padding: 4, width: 24, height: 24 }} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Cart */}
          <div className="card" style={{ padding: 16 }}>
            <div className="card__head">
              <ShoppingCart size={18} color="var(--primary)" />
              <div className="card__title">Cart ({cart.length})</div>
            </div>
            {cart.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon"><ShoppingCart size={22} /></div>
                <div>Cart is empty — search and add medicines</div>
              </div>
            ) : (
              <div className="table-wrap" style={{ maxHeight: "40vh" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Medicine</th><th>Batch</th><th style={{ width: 110 }}>Price</th>
                      <th style={{ width: 130 }}>Qty</th><th style={{ width: 80 }}>Disc%</th>
                      <th style={{ width: 100 }}>Total</th><th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((c, i) => (
                      <tr key={i}>
                        <td>
                          <div style={{ fontWeight: 600 }}>{c.medicine.name}</div>
                          <div className="text-xs text-dim">{c.medicine.genericName} • GST {c.medicine.gstRate}%</div>
                        </td>
                        <td className="mono text-sm">{c.selectedBatch.batchNumber}<div className="text-xs text-dim">exp {formatDate(c.selectedBatch.expiryDate)}</div></td>
                        <td className="mono">{formatCurrency(c.unitPrice)}</td>
                        <td>
                          <div className="flex items-center gap-2 billing-cart-qty">
                            <button className="btn btn--ghost btn--icon btn--sm" onClick={() => updateQty(i, -1)}><Minus size={12} /></button>
                            <input className="input" style={{ width: 50, textAlign: "center", padding: "4px" }} value={c.quantity} onChange={(e) => setQty(i, parseInt(e.target.value) || 1)} />
                            <button className="btn btn--ghost btn--icon btn--sm" onClick={() => updateQty(i, 1)}><Plus size={12} /></button>
                          </div>
                        </td>
                        <td><input className="input" style={{ width: 60, padding: "4px", textAlign: "center" }} type="number" value={c.discountPercent} onChange={(e) => setDiscount(i, parseFloat(e.target.value) || 0)} /></td>
                        <td className="mono" style={{ fontWeight: 700 }}>{formatCurrency(c.unitPrice * c.quantity * (1 - c.discountPercent / 100))}</td>
                        <td><button className="btn btn--danger btn--icon btn--sm" onClick={() => removeItem(i)}><Trash2 size={12} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right: customer + totals */}
        <div className="flex-col gap-3 billing-cart-side">
          <div className="card" style={{ padding: 16 }}>
            <div className="card__head"><User size={16} color="var(--primary)" /><div className="card__title">Customer & Rx</div></div>
            <div className="flex-col gap-2">
              <div className="field">
                <label className="label">Customer</label>
                <select className="select" value={customerId || ""} onChange={(e) => setCustomerId(e.target.value || null)}>
                  <option value="">Walk-in Customer</option>
                  {db.customers.filter((c) => c.type !== "DOCTOR").map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.type})</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label">Prescribing Doctor (Rx)</label>
                <select className="select" value={doctorId || ""} onChange={(e) => setDoctorId(e.target.value || null)}>
                  <option value="">— None —</option>
                  {db.doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} — {d.specialization}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="label">Prescription No.</label>
                <input className="input" placeholder="RX-XXXXX" value={rxNumber} onChange={(e) => setRxNumber(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: 16, background: "var(--grad-green)" }}>
            <div className="card__head"><Tag size={16} color="var(--primary)" /><div className="card__title">Bill Summary</div></div>
            <div className="flex-col gap-2">
              <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
              <Row label="Tax (GST)" value={formatCurrency(totals.tax)} />
              <Row label="Discount" value={`- ${formatCurrency(totals.discount)}`} color="var(--rose)" />
              <Row label="Round-off" value={formatCurrency(totals.roundOff)} muted />
              <div style={{ height: 1, background: "var(--border-subtle)", margin: "6px 0" }} />
              <div className="flex justify-between items-center">
                <span style={{ fontWeight: 700 }}>Grand Total</span>
                <span style={{ fontSize: 26, fontWeight: 800, color: "var(--primary)" }}>{formatCurrency(totals.grand)}</span>
              </div>
            </div>
            <button className="btn btn--accent btn--lg w-full mt-3" disabled={!cart.length} onClick={() => setShowCheckout(true)}>
              <Lock size={15} /> Checkout <kbd style={{ background: "rgba(0,0,0,0.15)", marginLeft: 6 }}>F10</kbd>
            </button>
          </div>
        </div>
      </div>

      {/* Checkout modal */}
      {showCheckout && (
        <CheckoutModal
          total={totals.grand}
          mode={mode}
          onClose={() => setShowCheckout(false)}
          onComplete={completeSale}
        />
      )}

      {/* Held carts modal */}
      {showHeld && (
        <Modal title="Recall Held Carts" onClose={() => setShowHeld(false)}>
          {listHeldCarts().length === 0 ? (
            <div className="empty-state"><div className="empty-state__icon"><Pause size={22} /></div><div>No held carts</div></div>
          ) : (
            <div className="flex-col gap-2">
              {listHeldCarts().map((h) => (
                <div key={h.id} className="flex items-center gap-3" style={{ padding: 12, border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600 }}>{h.label}</div>
                    <div className="text-xs text-dim">{h.type} • {new Date(h.createdAt).toLocaleTimeString()}</div>
                  </div>
                  <button className="btn btn--accent btn--sm" onClick={() => recall(h.id)}><Play size={13} /> Recall</button>
                  <button className="btn btn--danger btn--sm" onClick={() => { removeHeldCart(h.id); }}><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* Invoice modal */}
      {showInvoice && lastSale && (
        <InvoiceModal sale={lastSale} onClose={() => setShowInvoice(false)} />
      )}
    </div>
  );
};

const Row = ({ label, value, muted, color }: { label: string; value: string; muted?: boolean; color?: string }) => (
  <div className="flex justify-between items-center">
    <span className={muted ? "text-dim text-sm" : "text-muted text-sm"}>{label}</span>
    <span className="mono" style={{ fontWeight: 600, color: color || "var(--text-main)" }}>{value}</span>
  </div>
);

const CheckoutModal = ({ total, mode, onClose, onComplete }: {
  total: number; mode: SaleType; onClose: () => void;
  onComplete: (m: PaymentMethod, paid: number) => void;
}) => {
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [paid, setPaid] = useState(total);
  const methods: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
    { id: "CASH", label: "Cash", icon: Banknote },
    { id: "UPI", label: "UPI / QR", icon: Smartphone },
    { id: "CARD", label: "Card", icon: CreditCard },
    { id: "BANK_TRANSFER", label: "Bank", icon: Wallet },
    ...(mode === "WHOLESALE" ? [{ id: "CREDIT" as PaymentMethod, label: "Credit", icon: Wallet }] : []),
  ];
  const change = Math.max(0, paid - total);
  return (
    <Modal title="Complete Checkout" onClose={onClose} footer={
      <>
        <button className="btn btn--ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn--accent btn--lg" onClick={() => onComplete(method, method === "CREDIT" ? 0 : paid)}>
          <CheckCircle2 size={16} /> Complete & Print
        </button>
      </>
    }>
      <div className="flex-col gap-3">
        <div className="card" style={{ background: "var(--grad-green)", padding: 16, textAlign: "center" }}>
          <div className="text-xs text-dim" style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>Amount Due</div>
          <div style={{ fontSize: 40, fontWeight: 800, color: "var(--primary)" }}>{formatCurrency(total)}</div>
        </div>
        <div className="field">
          <label className="label">Payment Method</label>
          <div className="grid grid-4 checkout-methods" style={{ gap: 8 }}>
            {methods.map((m) => {
              const Icon = m.icon;
              return (
                <button key={m.id} className={`btn ${method === m.id ? "btn--primary" : "btn--ghost"}`} style={{ flexDirection: "column", padding: "12px 6px", gap: 6 }} onClick={() => setMethod(m.id)}>
                  <Icon size={18} />
                  <span className="text-xs">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>
        {method !== "CREDIT" && (
          <>
            <div className="field">
              <label className="label">Amount Received</label>
              <input className="input" type="number" value={paid} onChange={(e) => setPaid(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="flex justify-between items-center" style={{ padding: "12px 14px", background: "var(--bg-surface)", borderRadius: "var(--radius-sm)" }}>
              <span className="text-muted text-sm">Change to Return</span>
              <span className="mono" style={{ fontSize: 20, fontWeight: 800, color: "var(--teal)" }}>{formatCurrency(change)}</span>
            </div>
          </>
        )}
        {method === "CREDIT" && (
          <div className="pill pill--amber" style={{ alignSelf: "flex-start" }}>This sale will be marked UNPAID — receivable added to customer ledger</div>
        )}
      </div>
    </Modal>
  );
};

export const InvoiceModal = ({ sale, onClose }: { sale: Sale; onClose: () => void }) => {
  const { db } = useStore();
  const s = db.settings;
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    w.document.write(`
      <html><head><title>${sale.billNumber}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1a1a1a; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0E4216; padding-bottom: 14px; margin-bottom: 14px; }
        .pharma { color: #0E4216; font-size: 22px; font-weight: 800; }
        table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 13px; }
        th { background: #f1f5ee; padding: 8px; text-align: left; border-bottom: 1px solid #ccc; }
        td { padding: 8px; border-bottom: 1px solid #eee; }
        .total { text-align: right; font-size: 18px; font-weight: 800; color: #0E4216; margin-top: 14px; }
        .footer { margin-top: 30px; font-size: 11px; color: #666; text-align: center; border-top: 1px solid #eee; padding-top: 14px; }
      </style></head><body>
      <div class="header">
        <div>
          <div class="pharma">${s.pharmacyName}</div>
          <div>${s.address}, ${s.city}, ${s.state} - ${s.pincode}</div>
          <div>DL: ${s.dlNumber} • GSTIN: ${s.gstin}</div>
          <div>Phone: ${s.phone}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:18px;font-weight:700">TAX INVOICE</div>
          <div>Bill: <strong>${sale.billNumber}</strong></div>
          <div>${new Date(sale.createdAt).toLocaleString("en-IN")}</div>
          <div>Type: ${sale.type}</div>
        </div>
      </div>
      <div style="margin-bottom:12px">
        <strong>Customer:</strong> ${sale.customerName} ${sale.customerPhone ? "• " + sale.customerPhone : ""}<br>
        ${sale.doctorName ? "<strong>Doctor:</strong> " + sale.doctorName + "<br>" : ""}
        ${sale.prescriptionNumber ? "<strong>Rx:</strong> " + sale.prescriptionNumber + "<br>" : ""}
      </div>
      <table>
        <thead><tr><th>Item</th><th>Batch</th><th>Qty</th><th>Rate</th><th>Disc%</th><th>GST%</th><th>Amount</th></tr></thead>
        <tbody>
          ${sale.items.map((it) => `<tr>
            <td>${it.medicineName}</td><td>${it.batchNumber}</td><td>${it.quantity}</td>
            <td>₹${it.unitPrice.toFixed(2)}</td><td>${it.discountPercent}%</td><td>${it.gstRate}%</td>
            <td>₹${it.totalPrice.toFixed(2)}</td></tr>`).join("")}
        </tbody>
      </table>
      <div style="text-align:right">
        <div>Subtotal: ₹${sale.subtotal.toFixed(2)}</div>
        <div>Tax: ₹${sale.taxAmount.toFixed(2)}</div>
        <div>Discount: -₹${sale.discountAmount.toFixed(2)}</div>
        <div>Round-off: ₹${sale.roundOff.toFixed(2)}</div>
        <div class="total">Grand Total: ₹${sale.grandTotal.toFixed(2)}</div>
        <div>Paid: ₹${sale.paidAmount.toFixed(2)} (${sale.paymentMethod})</div>
        ${sale.changeAmount > 0 ? `<div>Change: ₹${sale.changeAmount.toFixed(2)}</div>` : ""}
      </div>
      <div class="footer">${s.invoiceFooter}</div>
      </body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <Modal title={`Invoice ${sale.billNumber}`} onClose={onClose} size="lg" footer={
      <>
        <button className="btn btn--ghost" onClick={onClose}>Close</button>
        <button className="btn btn--accent" onClick={handlePrint}><Printer size={15} /> Print Invoice</button>
      </>
    }>
      <div ref={printRef} style={{ padding: 4 }}>
        <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 14, borderBottom: "2px solid var(--primary)", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--primary)" }}>{s.pharmacyName}</div>
            <div className="text-sm text-muted">{s.address}, {s.city}, {s.state} - {s.pincode}</div>
            <div className="text-sm text-muted">DL: {s.dlNumber} • GSTIN: {s.gstin}</div>
            <div className="text-sm text-muted">Phone: {s.phone}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>TAX INVOICE</div>
            <div className="text-sm">Bill: <strong>{sale.billNumber}</strong></div>
            <div className="text-sm">{new Date(sale.createdAt).toLocaleString("en-IN")}</div>
            <div className="pill pill--purple" style={{ marginTop: 4 }}>{sale.type}</div>
          </div>
        </div>
        <div className="text-sm" style={{ marginBottom: 12 }}>
          <strong>Customer:</strong> {sale.customerName} {sale.customerPhone ? `• ${sale.customerPhone}` : ""}<br />
          {sale.doctorName && <><strong>Doctor:</strong> {sale.doctorName}<br /></>}
          {sale.prescriptionNumber && <><strong>Rx:</strong> {sale.prescriptionNumber}<br /></>}
          <strong>Payment:</strong> {sale.paymentMethod} ({sale.paymentStatus})
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Item</th><th>Batch</th><th>Qty</th><th>Rate</th><th>Disc%</th><th>GST</th><th>Amount</th></tr></thead>
            <tbody>
              {sale.items.map((it) => (
                <tr key={it.id}>
                  <td>{it.medicineName}</td>
                  <td className="mono text-sm">{it.batchNumber}</td>
                  <td className="mono">{it.quantity}</td>
                  <td className="mono">{formatCurrency(it.unitPrice)}</td>
                  <td className="mono">{it.discountPercent}%</td>
                  <td className="mono">{it.gstRate}%</td>
                  <td className="mono" style={{ fontWeight: 700 }}>{formatCurrency(it.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-between mt-3" style={{ gap: 20 }}>
          <div style={{ flex: 1 }}>
            <div className="text-xs text-dim" style={{ marginBottom: 4 }}>Amount in Words</div>
            <div className="text-sm">{numberToWords(sale.grandTotal)} rupees only</div>
          </div>
          <div style={{ width: 260 }}>
            <Row label="Subtotal" value={formatCurrency(sale.subtotal)} />
            <Row label="Tax" value={formatCurrency(sale.taxAmount)} />
            <Row label="Discount" value={`- ${formatCurrency(sale.discountAmount)}`} color="var(--rose)" />
            <Row label="Round-off" value={formatCurrency(sale.roundOff)} muted />
            <div style={{ height: 1, background: "var(--border-subtle)", margin: "6px 0" }} />
            <div className="flex justify-between items-center">
              <span style={{ fontWeight: 700 }}>Grand Total</span>
              <span className="mono" style={{ fontSize: 18, fontWeight: 800, color: "var(--primary)" }}>{formatCurrency(sale.grandTotal)}</span>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-sm text-muted">Paid</span>
              <span className="mono" style={{ color: "var(--teal)" }}>{formatCurrency(sale.paidAmount)}</span>
            </div>
          </div>
        </div>
        <div className="text-xs text-dim" style={{ marginTop: 20, textAlign: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
          {s.invoiceFooter}
        </div>
      </div>
    </Modal>
  );
};

function numberToWords(n: number): string {
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const inWords = (num: number): string => {
    if (num < 20) return a[num];
    if (num < 100) return b[Math.floor(num / 10)] + (num % 10 ? " " + a[num % 10] : "");
    if (num < 1000) return a[Math.floor(num / 100)] + " Hundred" + (num % 100 ? " " + inWords(num % 100) : "");
    if (num < 100000) return inWords(Math.floor(num / 1000)) + " Thousand" + (num % 1000 ? " " + inWords(num % 1000) : "");
    if (num < 10000000) return inWords(Math.floor(num / 100000)) + " Lakh" + (num % 100000 ? " " + inWords(num % 100000) : "");
    return inWords(Math.floor(num / 10000000)) + " Crore" + (num % 10000000 ? " " + inWords(num % 10000000) : "");
  };
  const rupees = Math.floor(n);
  const paise = Math.round((n - rupees) * 100);
  let w = inWords(rupees);
  if (paise > 0) w += ` and ${inWords(paise)} Paise`;
  return w;
}
