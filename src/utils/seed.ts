import type {
  Medicine, Batch, Customer, Supplier, Doctor, Sale, Purchase,
  StoreSettings, StockAdjustment,
} from "../types";
import { genId, daysBetween } from "./formatters";

const now = () => new Date().toISOString();
const dateOffset = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

export const defaultSettings: StoreSettings = {
  pharmacyName: "Velo Pharma Solutions",
  tagline: "Precision Healthcare Management",
  address: "14 Wellness Avenue, MG Road",
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560001",
  phone: "+91 80 4567 8900",
  email: "care@velopharma.in",
  gstin: "29ABCDE1234F1Z5",
  dlNumber: "KA-B-21/2024/00471",
  currency: "₹",
  thermalPrint: true,
  invoiceFooter: "Thank you for choosing Velo Pharma. All medicines dispensed under supervision of a registered pharmacist. Returns accepted within 7 days with original bill.",
};

interface MedSpec {
  name: string; generic: string; cat: string; form: Medicine["dosageForm"];
  strength: string; mfr: string; hsn: string; gst: number; min: number;
  rack: string; rx: boolean;
}

const medSpecs: MedSpec[] = [
  { name: "Crocin Advance", generic: "Paracetamol", cat: "Analgesic", form: "TABLET", strength: "500mg", mfr: "GSK Pharma", hsn: "30049099", gst: 12, min: 50, rack: "A-01", rx: false },
  { name: "Dolo 650", generic: "Paracetamol", cat: "Analgesic", form: "TABLET", strength: "650mg", mfr: "Micro Labs", hsn: "30049099", gst: 12, min: 80, rack: "A-02", rx: false },
  { name: "Augmentin 625", generic: "Amoxicillin + Clavulanate", cat: "Antibiotic", form: "TABLET", strength: "625mg", mfr: "GSK Pharma", hsn: "30041020", gst: 12, min: 30, rack: "B-03", rx: true },
  { name: "Azithral 500", generic: "Azithromycin", cat: "Antibiotic", form: "TABLET", strength: "500mg", mfr: "Sun Pharma", hsn: "30042090", gst: 12, min: 25, rack: "B-04", rx: true },
  { name: "Cetirizine", generic: "Cetirizine Hydrochloride", cat: "Antihistamine", form: "TABLET", strength: "10mg", mfr: "Dr Reddy's", hsn: "30049099", gst: 12, min: 60, rack: "A-05", rx: false },
  { name: "Pantop 40", generic: "Pantoprazole", cat: "Antacid", form: "TABLET", strength: "40mg", mfr: "Alkem", hsn: "30049099", gst: 12, min: 40, rack: "C-01", rx: false },
  { name: "Calpol Syrup", generic: "Paracetamol", cat: "Pediatric", form: "SYRUP", strength: "250mg/5ml", mfr: "GSK Pharma", hsn: "30049099", gst: 12, min: 20, rack: "D-02", rx: false },
  { name: "Glycomet 500", generic: "Metformin", cat: "Antidiabetic", form: "TABLET", strength: "500mg", mfr: "USV", hsn: "30049099", gst: 12, min: 35, rack: "E-01", rx: true },
  { name: "Telsartan 40", generic: "Telmisartan", cat: "Antihypertensive", form: "TABLET", strength: "40mg", mfr: "Dr Reddy's", hsn: "30049099", gst: 12, min: 30, rack: "E-02", rx: true },
  { name: "Shelcal 500", generic: "Calcium + Vitamin D3", cat: "Supplement", form: "TABLET", strength: "500mg", mfr: "Torrent", hsn: "30045000", gst: 12, min: 40, rack: "F-01", rx: false },
  { name: "Volini Gel", generic: "Diclofenac Diethylamine", cat: "Topical", form: "GEL", strength: "1%", mfr: "Sun Pharma", hsn: "30049099", gst: 18, min: 25, rack: "G-01", rx: false },
  { name: "Ciplox Eye Drops", generic: "Ciprofloxacin", cat: "Ophthalmic", form: "DROPS", strength: "0.3%", mfr: "Cipla", hsn: "30049099", gst: 12, min: 15, rack: "H-01", rx: true },
  { name: "Voveran 50", generic: "Diclofenac Sodium", cat: "NSAID", form: "TABLET", strength: "50mg", mfr: "Novartis", hsn: "30049099", gst: 12, min: 30, rack: "A-06", rx: true },
  { name: "Benadryl Cough", generic: "Diphenhydramine", cat: "Cough", form: "SYRUP", strength: "100ml", mfr: "Johnson & Johnson", hsn: "30049099", gst: 12, min: 20, rack: "D-04", rx: false },
  { name: "Insulin Lantus", generic: "Insulin Glargine", cat: "Antidiabetic", form: "INJECTION", strength: "100 IU/ml", mfr: "Sanofi", hsn: "30043100", gst: 5, min: 10, rack: "COLD-1", rx: true },
  { name: "Betadine Solution", generic: "Povidone Iodine", cat: "Antiseptic", form: "SUSPENSION", strength: "5%", mfr: "Win-Medicare", hsn: "30049099", gst: 18, min: 25, rack: "G-03", rx: false },
];

let medCounter = 0;
export const seedMedicines = (): Medicine[] =>
  medSpecs.map((s) => {
    medCounter += 1;
    const id = `med_${medCounter}`;
    const created = dateOffset(-120 + medCounter * 3);
    return {
      id,
      name: s.name,
      genericName: s.generic,
      sku: `SKU${String(medCounter).padStart(4, "0")}`,
      barcode: `890${String(100000 + medCounter).padStart(6, "0")}`,
      category: s.cat,
      dosageForm: s.form,
      strength: s.strength,
      manufacturer: s.mfr,
      hsnCode: s.hsn,
      gstRate: s.gst,
      minStockAlert: s.min,
      maxStockAlert: s.min * 5,
      rackLocation: s.rack,
      prescriptionRequired: s.rx,
      isActive: true,
      createdAt: created,
      updatedAt: created,
    };
  });

export const seedBatches = (medicines: Medicine[]): Batch[] => {
  const batches: Batch[] = [];
  medicines.forEach((m, idx) => {
    // batch 1 - healthy
    const exp1 = dateOffset(420 - idx * 5);
    batches.push({
      id: genId("bat"),
      medicineId: m.id,
      batchNumber: `${m.name.slice(0, 3).toUpperCase()}${String(idx + 1).padStart(2, "0")}A`,
      manufacturingDate: dateOffset(-200 + idx * 4),
      expiryDate: exp1,
      purchasePrice: m.gstRate === 5 ? 180 : 22 + idx * 3,
      mrp: m.gstRate === 5 ? 540 : 60 + idx * 9,
      retailPrice: m.gstRate === 5 ? 480 : 50 + idx * 8,
      wholesalePrice: m.gstRate === 5 ? 410 : 42 + idx * 6,
      quantity: Math.max(5, m.minStockAlert * 2 - idx),
      initialQuantity: m.minStockAlert * 3,
      packSize: 1,
      barcode: m.barcode,
      status: "ACTIVE",
      createdAt: dateOffset(-150),
      updatedAt: now(),
      daysUntilExpiry: daysBetween(exp1),
    });
    // batch 2 - some near expiry / expired variety
    if (idx % 3 === 0) {
      const exp2 = dateOffset(35 - idx); // near expiry for some
      batches.push({
        id: genId("bat"),
        medicineId: m.id,
        batchNumber: `${m.name.slice(0, 3).toUpperCase()}${String(idx + 1).padStart(2, "0")}B`,
        manufacturingDate: dateOffset(-360),
        expiryDate: exp2,
        purchasePrice: 20 + idx * 2,
        mrp: 58 + idx * 8,
        retailPrice: 48 + idx * 7,
        wholesalePrice: 40 + idx * 5,
        quantity: Math.max(2, 18 - idx),
        initialQuantity: 24,
        packSize: 1,
        barcode: m.barcode,
        status: "ACTIVE",
        createdAt: dateOffset(-330),
        updatedAt: now(),
        daysUntilExpiry: daysBetween(exp2),
      });
    }
    if (idx % 5 === 0) {
      // expired batch
      const exp3 = dateOffset(-15 - idx);
      batches.push({
        id: genId("bat"),
        medicineId: m.id,
        batchNumber: `${m.name.slice(0, 3).toUpperCase()}${String(idx + 1).padStart(2, "0")}X`,
        manufacturingDate: dateOffset(-400),
        expiryDate: exp3,
        purchasePrice: 19 + idx,
        mrp: 55 + idx * 7,
        retailPrice: 46 + idx * 6,
        wholesalePrice: 38 + idx * 4,
        quantity: 6,
        initialQuantity: 18,
        packSize: 1,
        barcode: m.barcode,
        status: "EXPIRED",
        createdAt: dateOffset(-380),
        updatedAt: now(),
        daysUntilExpiry: daysBetween(exp3),
      });
    }
  });
  return batches;
};

export const seedCustomers = (): Customer[] => {
  const data: Array<[string, Customer["type"], string, string | null, string | null]> = [
    ["Walk-in Customer", "RETAIL", "—", null, null],
    ["Anjali Sharma", "RETAIL", "+91 98456 11200", "anjali.s@gmail.com", null],
    ["Rajesh Kumar", "RETAIL", "+91 99001 22310", null, null],
    ["Priya Nair", "HOSPITAL", "+91 80 2200 1100", "purchase@carehospital.in", "Care Hospital"],
    ["Medi Supply Co.", "WHOLESALE", "+91 80 4400 9911", "orders@medisupply.in", "29MEDSU0987G1ZP"],
    ["Dr. Meera Iyer", "DOCTOR", "+91 98867 71201", null, null],
    ["Wellness Distributors", "WHOLESALE", "+91 80 5512 3344", "sales@wellnessdist.in", "29WELL3344H1ZQ"],
    ["Suresh Patel", "RETAIL", "+91 99012 88001", null, null],
    ["Cloudnine Clinic", "HOSPITAL", "+91 80 6600 7700", "pharma@cloudnine.in", "29CLDN1122K1ZR"],
  ];
  return data.map(([name, type, phone, email, gstin], i) => {
    const created = dateOffset(-90 + i * 3);
    return {
      id: `cust_${i + 1}`,
      name, type, phone, email,
      address: type === "RETAIL" ? null : "Commercial Street, Bengaluru",
      gstin: gstin,
      dlNumber: gstin ? "KA-B-21/2019/00" + (100 + i) : null,
      creditLimit: type === "WHOLESALE" || type === "HOSPITAL" ? 100000 : 0,
      outstandingBalance: type === "WHOLESALE" ? 12500 + i * 1800 : 0,
      createdAt: created,
      updatedAt: now(),
    };
  });
};

export const seedSuppliers = (): Supplier[] => {
  const data: Array<[string, string, string, string | null, string | null]> = [
    ["Cipla Distributors", "Mr. Arvind", "+91 80 3344 5566", "arvind@cipladist.in", "29CIPL5566G1ZA"],
    ["Sun Pharma Agency", "Mrs. Kavita", "+91 80 2233 7788", "kavita@sunagency.in", "29SUNP7788F1ZB"],
    ["GSK Wholesale", "Mr. Pradeep", "+91 80 6677 9900", "pradeep@gskw.in", "29GSKW9900D1ZC"],
    ["Alkem Distributors", "Mr. Nasir", "+91 80 4455 1100", "nasir@alkemdist.in", "29ALKM1100E1ZD"],
    ["USV Pharma Supply", "Mrs. Lata", "+91 80 7788 2200", "lata@usvsupply.in", "29USVS2200G1ZE"],
  ];
  return data.map(([name, contact, phone, email, gstin], i) => {
    const created = dateOffset(-180 + i * 5);
    return {
      id: `sup_${i + 1}`,
      name,
      contactPerson: contact,
      phone, email, gstin,
      dlNumber: "KA-W-18/2018/00" + (200 + i),
      address: i % 2 === 0 ? "Industrial Area, Bengaluru" : "Chickpet, Bengaluru",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "5600" + (10 + i),
      creditPeriodDays: 30,
      outstandingBalance: 28000 + i * 5500,
      isActive: true,
      createdAt: created,
      updatedAt: now(),
    };
  });
};

export const seedDoctors = (): Doctor[] => {
  const data: Array<[string, string, string, string]> = [
    ["Dr. Meera Iyer", "General Physician", "Apollo Clinic", "KMC-45678"],
    ["Dr. Suresh Menon", "Cardiologist", "Narayana Health", "KMC-78901"],
    ["Dr. Fatima Khan", "Pediatrician", "Rainbow Children's", "KMC-32145"],
    ["Dr. Vikram Rao", "Dermatologist", "Columbia Asia", "KMC-65432"],
  ];
  return data.map(([name, spec, hosp, reg], i) => ({
    id: `doc_${i + 1}`,
    name, specialization: spec, hospital: hosp, regNumber: reg,
    phone: "+91 9886" + String(1000 + i * 11).padStart(5, "0"),
  }));
};

export const seedSales = (): Sale[] => {
  const sales: Sale[] = [];
  const today = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - Math.floor(i / 3));
    d.setHours(9 + (i % 10), (i * 7) % 60, 0);
    const isWholesale = i % 5 === 0;
    const customer = isWholesale
      ? { id: "cust_4", name: "Medi Supply Co.", phone: "+91 80 4400 9911" }
      : { id: i % 3 === 0 ? "cust_2" : null, name: i % 3 === 0 ? "Anjali Sharma" : "Walk-in Customer", phone: i % 3 === 0 ? "+91 98456 11200" : null };
    const itemCount = 1 + (i % 4);
    const items = [];
    let subtotal = 0;
    let taxAmt = 0;
    for (let j = 0; j < itemCount; j++) {
      const price = 35 + ((i + j) % 7) * 28;
      const qty = 1 + ((i + j) % 5);
      const gst = (i % 3 === 0) ? 12 : (i % 4 === 0 ? 18 : 5);
      const lineGross = price * qty;
      const lineTax = (lineGross * gst) / (100 + gst);
      const lineNet = lineGross - lineTax;
      subtotal += lineNet;
      taxAmt += lineTax;
      items.push({
        id: genId("si"),
        saleId: genId("sale"),
        medicineId: `med_${1 + ((i + j) % 16)}`,
        batchId: genId("bat"),
        medicineName: ["Dolo 650","Crocin Advance","Cetirizine","Pantop 40","Azithral 500","Augmentin 625","Glycomet 500","Shelcal 500","Voveran 50","Calpol Syrup","Volini Gel","Benadryl Cough","Ciplox Eye Drops","Telsartan 40","Betadine Solution","Insulin Lantus"][j % 16],
        batchNumber: `DOL${String(i + j).padStart(2, "0")}A`,
        expiryDate: dateOffset(300 - (i + j) * 8),
        quantity: qty,
        unitPrice: price,
        mrp: price + 8,
        gstRate: gst,
        taxAmount: lineTax,
        discountPercent: 0,
        discountAmount: 0,
        totalPrice: lineGross,
      });
    }
    const discount = i % 6 === 0 ? Math.round(subtotal * 0.05) : 0;
    const taxable = subtotal - discount;
    const grand = Math.round(taxable + taxAmt);
    const paid = isWholesale ? (i % 2 === 0 ? 0 : Math.round(grand * 0.5)) : grand;
    sales.push({
      id: genId("sale"),
      billNumber: `VEL${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(sales.length + 1).padStart(5, "0")}`,
      type: isWholesale ? "WHOLESALE" : "RETAIL",
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      doctorId: i % 7 === 0 ? "doc_1" : null,
      doctorName: i % 7 === 0 ? "Dr. Meera Iyer" : null,
      prescriptionNumber: i % 7 === 0 ? `RX${String(2000 + i).padStart(5, "0")}` : null,
      subtotal: Math.round(subtotal),
      taxAmount: Math.round(taxAmt),
      discountAmount: discount,
      roundOff: grand - (taxable + taxAmt),
      grandTotal: grand,
      paidAmount: paid,
      changeAmount: 0,
      paymentMethod: isWholesale ? "CREDIT" : (["CASH", "UPI", "CARD"] as const)[i % 3],
      paymentStatus: paid >= grand ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID",
      notes: null,
      createdAt: d.toISOString(),
      updatedAt: d.toISOString(),
      items,
    });
  }
  return sales;
};

export const seedPurchases = (): Purchase[] => {
  const purchases: Purchase[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (i + 1) * 4);
    const supplier = ["Cipla Distributors","Sun Pharma Agency","GSK Wholesale","Alkem Distributors","USV Pharma Supply","Cipla Distributors"][i];
    const supplierId = `sup_${1 + (i % 5)}`;
    const items = [];
    let subtotal = 0, tax = 0;
    for (let j = 0; j < 3; j++) {
      const cost = 120 + (i + j) * 45;
      const qty = 20 + (i + j) * 8;
      const gst = (i + j) % 2 === 0 ? 12 : 5;
      const lineGross = cost * qty;
      const lineTax = (lineGross * gst) / (100 + gst);
      subtotal += lineGross - lineTax;
      tax += lineTax;
      items.push({
        id: genId("pi"),
        purchaseId: genId("pur"),
        medicineId: `med_${1 + ((i + j) % 16)}`,
        batchId: null,
        batchNumber: `GRN${String(i * 3 + j).padStart(3, "0")}`,
        expiryDate: dateOffset(360 - i * 20),
        quantity: qty,
        freeQuantity: j,
        unitCost: cost,
        mrp: cost * 1.4,
        gstRate: gst,
        discount: 5,
        totalCost: lineGross,
      });
    }
    const total = Math.round(subtotal + tax);
    purchases.push({
      id: genId("pur"),
      invoiceNumber: `PO${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(i + 1).padStart(4, "0")}`,
      supplierId,
      supplierName: supplier,
      purchaseDate: d.toISOString(),
      dueDate: new Date(d.getTime() + 30 * 86400000).toISOString(),
      subtotal: Math.round(subtotal),
      taxAmount: Math.round(tax),
      discountAmount: 0,
      totalAmount: total,
      paidAmount: i % 2 === 0 ? total : Math.round(total * 0.5),
      paymentStatus: i % 2 === 0 ? "PAID" : "PARTIAL",
      paymentMethod: "BANK_TRANSFER",
      notes: null,
      createdAt: d.toISOString(),
      items,
    });
  }
  return purchases;
};

export const seedAdjustments = (): StockAdjustment[] => {
  return [
    { id: genId("adj"), medicineId: "med_3", medicineName: "Augmentin 625", batchId: "bat_old_1", batchNumber: "AUG01X", type: "EXPIRED_WRITE_OFF", quantity: 6, reason: "Expired stock quarantine", createdAt: dateOffset(-3) },
    { id: genId("adj"), medicineId: "med_7", medicineName: "Calpol Syrup", batchId: "bat_old_2", batchNumber: "CAL01B", type: "DAMAGE", quantity: 2, reason: "Bottle leaked in transit", createdAt: dateOffset(-2) },
    { id: genId("adj"), medicineId: "med_11", medicineName: "Volini Gel", batchId: "bat_old_3", batchNumber: "VOL01A", type: "INVENTORY_AUDIT", quantity: -3, reason: "Physical count correction", createdAt: dateOffset(-1) },
  ];
};
