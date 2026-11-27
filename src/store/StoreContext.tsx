import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type {
  Medicine, Batch, Customer, Supplier, Doctor, Sale, Purchase,
  StoreSettings, StockAdjustment, CartItem, PaymentMethod, SaleType,
} from "../types";
import {
  defaultSettings, seedMedicines, seedBatches, seedCustomers,
  seedSuppliers, seedDoctors, seedSales, seedPurchases, seedAdjustments,
} from "../utils/seed";
import { genId, genBillNumber, genInvoiceNumber, daysBetween, classifyBatch, roundTo } from "../utils/formatters";

const KEY = "velo_pharma_v1";

interface DBShape {
  medicines: Medicine[];
  batches: Batch[];
  customers: Customer[];
  suppliers: Supplier[];
  doctors: Doctor[];
  sales: Sale[];
  purchases: Purchase[];
  adjustments: StockAdjustment[];
  settings: StoreSettings;
  billCounter: number;
  poCounter: number;
  heldCarts: { id: string; label: string; items: CartItem[]; type: SaleType; customerId?: string | null; createdAt: string }[];
}

const loadDB = (): DBShape => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const medicines = seedMedicines();
  const batches = seedBatches(medicines);
  const db: DBShape = {
    medicines,
    batches,
    customers: seedCustomers(),
    suppliers: seedSuppliers(),
    doctors: seedDoctors(),
    sales: seedSales(),
    purchases: seedPurchases(),
    adjustments: seedAdjustments(),
    settings: defaultSettings,
    billCounter: 24,
    poCounter: 6,
    heldCarts: [],
  };
  saveDB(db);
  return db;
};

const saveDB = (db: DBShape) => {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {}
};

// Recompute batch stock on a medicine
export const medicineStock = (batches: Batch[], medicineId: string): number =>
  batches
    .filter((b) => b.medicineId === medicineId && b.status !== "EXPIRED")
    .reduce((s, b) => s + b.quantity, 0);

interface StoreCtx {
  db: DBShape;
  setSettings: (s: StoreSettings) => void;
  resetAll: () => void;
  // billing
  createSale: (sale: Omit<Sale, "id" | "billNumber" | "createdAt" | "updatedAt">) => Sale;
  updateSalePayment: (id: string, paidAmount: number, status: Sale["paymentStatus"]) => void;
  // inventory
  addMedicine: (m: Partial<Medicine>) => Medicine;
  updateMedicine: (id: string, m: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  addBatch: (b: Partial<Batch>) => Batch;
  adjustStock: (a: { medicineId: string; batchId: string; type: string; quantity: number; reason: string }) => void;
  // purchase
  createPurchase: (p: Omit<Purchase, "id" | "invoiceNumber" | "createdAt">) => Purchase;
  // parties
  addCustomer: (c: Partial<Customer>) => Customer;
  updateCustomer: (id: string, c: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addSupplier: (s: Partial<Supplier>) => Supplier;
  updateSupplier: (id: string, s: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  addDoctor: (d: Partial<Doctor>) => Doctor;
  // held carts
  holdCart: (items: CartItem[], type: SaleType, customerId?: string | null) => string;
  recallCart: (id: string) => { items: CartItem[]; type: SaleType; customerId?: string | null } | null;
  removeHeldCart: (id: string) => void;
  listHeldCarts: () => DBShape["heldCarts"];
  // theme
  theme: "light" | "dark";
  toggleTheme: () => void;
}

const Ctx = createContext<StoreCtx | null>(null);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [db, setDB] = useState<DBShape>(() => loadDB());
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      return (localStorage.getItem("velo_theme") as "light" | "dark") || "light";
    } catch { return "light"; }
  });

  useEffect(() => { saveDB(db); }, [db]);
  useEffect(() => {
    try { localStorage.setItem("velo_theme", theme); } catch {}
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  const setSettings = (s: StoreSettings) => setDB((d) => ({ ...d, settings: s }));

  const resetAll = () => {
    try { localStorage.removeItem(KEY); } catch {}
    setDB(loadDB());
  };

  const createSale: StoreCtx["createSale"] = (sale) => {
    const newSale: Sale = {
      ...sale,
      id: genId("sale"),
      billNumber: genBillNumber(db.billCounter),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDB((d) => {
      // decrement batch stock
      const batches = d.batches.map((b) => {
        const item = sale.items.find((it) => it.batchId === b.id);
        if (item) {
          const q = Math.max(0, b.quantity - item.quantity);
          return { ...b, quantity: q, status: q === 0 ? "DEPLETED" as const : b.status, updatedAt: new Date().toISOString() };
        }
        return b;
      });
      // customer outstanding
      const customers = d.customers.map((c) =>
        c.id === sale.customerId
          ? { ...c, outstandingBalance: c.outstandingBalance + (sale.grandTotal - sale.paidAmount) }
          : c
      );
      return {
        ...d, sales: [newSale, ...d.sales], billCounter: d.billCounter + 1,
        batches, customers,
      };
    });
    return newSale;
  };

  const updateSalePayment: StoreCtx["updateSalePayment"] = (id, paidAmount, status) => {
    setDB((d) => {
      const sale = d.sales.find((s) => s.id === id);
      if (!sale) return d;
      const diff = paidAmount - sale.paidAmount;
      return {
        ...d,
        sales: d.sales.map((s) =>
          s.id === id ? { ...s, paidAmount, paymentStatus: status, updatedAt: new Date().toISOString() } : s
        ),
        customers: d.customers.map((c) =>
          c.id === sale.customerId ? { ...c, outstandingBalance: Math.max(0, c.outstandingBalance - diff) } : c
        ),
      };
    });
  };

  const addMedicine: StoreCtx["addMedicine"] = (m) => {
    const med: Medicine = {
      id: genId("med"),
      name: m.name || "",
      genericName: m.genericName || "",
      sku: m.sku || `SKU${Math.floor(Math.random() * 9999)}`,
      barcode: m.barcode || null,
      category: m.category || "General",
      dosageForm: m.dosageForm || "TABLET",
      strength: m.strength || null,
      manufacturer: m.manufacturer || "",
      hsnCode: m.hsnCode || "30049099",
      gstRate: m.gstRate ?? 12,
      minStockAlert: m.minStockAlert ?? 20,
      maxStockAlert: m.maxStockAlert ?? null,
      rackLocation: m.rackLocation || null,
      prescriptionRequired: m.prescriptionRequired ?? false,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDB((d) => ({ ...d, medicines: [med, ...d.medicines] }));
    return med;
  };

  const updateMedicine: StoreCtx["updateMedicine"] = (id, m) =>
    setDB((d) => ({
      ...d,
      medicines: d.medicines.map((x) => (x.id === id ? { ...x, ...m, updatedAt: new Date().toISOString() } : x)),
    }));

  const deleteMedicine: StoreCtx["deleteMedicine"] = (id) =>
    setDB((d) => ({
      ...d,
      medicines: d.medicines.filter((x) => x.id !== id),
      batches: d.batches.filter((b) => b.medicineId !== id),
    }));

  const addBatch: StoreCtx["addBatch"] = (b) => {
    const batch: Batch = {
      id: genId("bat"),
      medicineId: b.medicineId || "",
      batchNumber: b.batchNumber || "",
      manufacturingDate: b.manufacturingDate || null,
      expiryDate: b.expiryDate || new Date().toISOString(),
      purchasePrice: b.purchasePrice ?? 0,
      mrp: b.mrp ?? 0,
      retailPrice: b.retailPrice ?? 0,
      wholesalePrice: b.wholesalePrice ?? 0,
      quantity: b.quantity ?? 0,
      initialQuantity: b.quantity ?? 0,
      packSize: b.packSize ?? 1,
      barcode: b.barcode || null,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      daysUntilExpiry: b.expiryDate ? daysBetween(b.expiryDate) : undefined,
    };
    setDB((d) => ({ ...d, batches: [batch, ...d.batches] }));
    return batch;
  };

  const adjustStock: StoreCtx["adjustStock"] = (a) =>
    setDB((d) => {
      const batch = d.batches.find((b) => b.id === a.batchId);
      const med = d.medicines.find((m) => m.id === a.medicineId);
      if (!batch || !med) return d;
      const newQty = Math.max(0, batch.quantity - a.quantity);
      const adj: StockAdjustment = {
        id: genId("adj"),
        medicineId: a.medicineId,
        medicineName: med.name,
        batchId: a.batchId,
        batchNumber: batch.batchNumber,
        type: a.type as any,
        quantity: a.quantity,
        reason: a.reason,
        createdAt: new Date().toISOString(),
      };
      return {
        ...d,
        adjustments: [adj, ...d.adjustments],
        batches: d.batches.map((b) =>
          b.id === a.batchId
            ? { ...b, quantity: newQty, status: newQty === 0 ? "DEPLETED" : b.status, updatedAt: new Date().toISOString() }
            : b
        ),
      };
    });

  const createPurchase: StoreCtx["createPurchase"] = (p) => {
    const newP: Purchase = {
      ...p,
      id: genId("pur"),
      invoiceNumber: genInvoiceNumber(db.poCounter),
      createdAt: new Date().toISOString(),
    };
    setDB((d) => {
      // create batches from purchase items
      const newBatches: Batch[] = p.items.map((it) => ({
        id: genId("bat"),
        medicineId: it.medicineId,
        batchNumber: it.batchNumber,
        manufacturingDate: null,
        expiryDate: it.expiryDate,
        purchasePrice: it.unitCost,
        mrp: it.mrp,
        retailPrice: it.mrp * 0.9,
        wholesalePrice: it.mrp * 0.78,
        quantity: it.quantity + it.freeQuantity,
        initialQuantity: it.quantity + it.freeQuantity,
        packSize: 1,
        barcode: null,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        daysUntilExpiry: daysBetween(it.expiryDate),
      }));
      // supplier outstanding
      const suppliers = d.suppliers.map((s) =>
        s.id === p.supplierId ? { ...s, outstandingBalance: s.outstandingBalance + (p.totalAmount - p.paidAmount) } : s
      );
      return { ...d, purchases: [newP, ...d.purchases], batches: [...newBatches, ...d.batches], poCounter: d.poCounter + 1, suppliers };
    });
    return newP;
  };

  const addCustomer: StoreCtx["addCustomer"] = (c) => {
    const cust: Customer = {
      id: genId("cust"),
      name: c.name || "",
      type: c.type || "RETAIL",
      phone: c.phone || null,
      email: c.email || null,
      address: c.address || null,
      gstin: c.gstin || null,
      dlNumber: c.dlNumber || null,
      creditLimit: c.creditLimit ?? null,
      outstandingBalance: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDB((d) => ({ ...d, customers: [cust, ...d.customers] }));
    return cust;
  };
  const updateCustomer: StoreCtx["updateCustomer"] = (id, c) =>
    setDB((d) => ({ ...d, customers: d.customers.map((x) => (x.id === id ? { ...x, ...c, updatedAt: new Date().toISOString() } : x)) }));
  const deleteCustomer: StoreCtx["deleteCustomer"] = (id) =>
    setDB((d) => ({ ...d, customers: d.customers.filter((x) => x.id !== id) }));

  const addSupplier: StoreCtx["addSupplier"] = (s) => {
    const sup: Supplier = {
      id: genId("sup"),
      name: s.name || "",
      contactPerson: s.contactPerson || null,
      phone: s.phone || "",
      email: s.email || null,
      gstin: s.gstin || null,
      dlNumber: s.dlNumber || null,
      address: s.address || null,
      city: s.city || null,
      state: s.state || null,
      pincode: s.pincode || null,
      creditPeriodDays: s.creditPeriodDays ?? 30,
      outstandingBalance: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setDB((d) => ({ ...d, suppliers: [sup, ...d.suppliers] }));
    return sup;
  };
  const updateSupplier: StoreCtx["updateSupplier"] = (id, s) =>
    setDB((d) => ({ ...d, suppliers: d.suppliers.map((x) => (x.id === id ? { ...x, ...s, updatedAt: new Date().toISOString() } : x)) }));
  const deleteSupplier: StoreCtx["deleteSupplier"] = (id) =>
    setDB((d) => ({ ...d, suppliers: d.suppliers.filter((x) => x.id !== id) }));

  const addDoctor: StoreCtx["addDoctor"] = (dd) => {
    const doc: Doctor = {
      id: genId("doc"),
      name: dd.name || "",
      specialization: dd.specialization || null,
      hospital: dd.hospital || null,
      regNumber: dd.regNumber || null,
      phone: dd.phone || null,
    };
    setDB((d) => ({ ...d, doctors: [doc, ...d.doctors] }));
    return doc;
  };

  const holdCart: StoreCtx["holdCart"] = (items, type, customerId) => {
    const id = genId("hold");
    const label = `Hold #${db.heldCarts.length + 1} • ${items.length} items • ₹${roundTo(items.reduce((s, i) => s + i.unitPrice * i.quantity * (1 - i.discountPercent / 100), 0))}`;
    setDB((d) => ({
      ...d,
      heldCarts: [...d.heldCarts, { id, label, items, type, customerId: customerId || null, createdAt: new Date().toISOString() }],
    }));
    return id;
  };
  const recallCart: StoreCtx["recallCart"] = (id) => {
    const h = db.heldCarts.find((x) => x.id === id);
    return h ? { items: h.items, type: h.type, customerId: h.customerId } : null;
  };
  const removeHeldCart: StoreCtx["removeHeldCart"] = (id) =>
    setDB((d) => ({ ...d, heldCarts: d.heldCarts.filter((x) => x.id !== id) }));
  const listHeldCarts = () => db.heldCarts;

  const value: StoreCtx = {
    db, setSettings, resetAll,
    createSale, updateSalePayment,
    addMedicine, updateMedicine, deleteMedicine, addBatch, adjustStock,
    createPurchase,
    addCustomer, updateCustomer, deleteCustomer, addSupplier, updateSupplier, deleteSupplier, addDoctor,
    holdCart, recallCart, removeHeldCart, listHeldCarts,
    theme, toggleTheme,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useStore = (): StoreCtx => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
};

// helper: pick FEFO batch for a medicine (earliest non-expired with stock)
export const pickFEFO = (batches: Batch[], medicineId: string): Batch | null => {
  const cands = batches
    .filter((b) => b.medicineId === medicineId && b.quantity > 0 && classifyBatch(b.expiryDate) !== "EXPIRED")
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
  return cands[0] || null;
};

export { classifyBatch };
