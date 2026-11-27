import { useMemo, useState } from "react";
import {
  Users, UserPlus, Truck, Stethoscope, Plus, Edit3, Trash2, Search,
  Phone, Mail, MapPin, Wallet, Building2, User,
} from "lucide-react";
import { useStore } from "../store/StoreContext";
import { useToast, Modal } from "../components/ui";
import { formatCurrency, formatDate } from "../utils/formatters";
import type { Customer, Supplier, Doctor, CustomerType } from "../types";

type SubTab = "customers" | "suppliers" | "doctors";

export const PartyManager = ({ globalSearch }: { globalSearch: string }) => {
  const { db, addCustomer, updateCustomer, deleteCustomer, addSupplier, updateSupplier, deleteSupplier, addDoctor } = useStore();
  const toast = useToast();
  const [sub, setSub] = useState<SubTab>("customers");
  const [search, setSearch] = useState(globalSearch || "");
  const [custModal, setCustModal] = useState<{ cust?: Customer } | null>(null);
  const [supModal, setSupModal] = useState<{ sup?: Supplier } | null>(null);
  const [docModal, setDocModal] = useState(false);

  const q = (search || globalSearch).trim().toLowerCase();
  const customers = db.customers.filter((c) => !q || c.name.toLowerCase().includes(q) || (c.phone || "").includes(q) || (c.gstin || "").toLowerCase().includes(q));
  const suppliers = db.suppliers.filter((s) => !q || s.name.toLowerCase().includes(q) || s.phone.includes(q) || (s.gstin || "").toLowerCase().includes(q));
  const doctors = db.doctors.filter((d) => !q || d.name.toLowerCase().includes(q) || (d.specialization || "").toLowerCase().includes(q));

  return (
    <div className="page">
      <div className="page__head">
        <div>
          <h2>Customers, Vendors & Doctors</h2>
          <p>Wholesale B2B, retail patients, vendor ledgers, prescribing physicians</p>
        </div>
        <div className="page__actions">
          {sub === "customers" && <button className="btn btn--accent" onClick={() => setCustModal({})}><Plus size={14} /> Add Customer</button>}
          {sub === "suppliers" && <button className="btn btn--accent" onClick={() => setSupModal({})}><Plus size={14} /> Add Supplier</button>}
          {sub === "doctors" && <button className="btn btn--accent" onClick={() => setDocModal(true)}><Plus size={14} /> Add Doctor</button>}
        </div>
      </div>

      {/* Sub tabs + search */}
      <div className="card" style={{ padding: 12 }}>
        <div className="flex items-center gap-3" style={{ flexWrap: "wrap" }}>
          <div className="flex gap-2 subtabs-scroll" style={{ flexWrap: "nowrap", overflowX: "auto", paddingBottom: 2 }}>
            <button className={`btn btn--sm ${sub === "customers" ? "btn--primary" : "btn--ghost"}`} onClick={() => setSub("customers")}><User size={13} /> Customers ({db.customers.length})</button>
            <button className={`btn btn--sm ${sub === "suppliers" ? "btn--primary" : "btn--ghost"}`} onClick={() => setSub("suppliers")}><Truck size={13} /> Suppliers ({db.suppliers.length})</button>
            <button className={`btn btn--sm ${sub === "doctors" ? "btn--primary" : "btn--ghost"}`} onClick={() => setSub("doctors")}><Stethoscope size={13} /> Doctors ({db.doctors.length})</button>
          </div>
          <div style={{ flex: 1, minWidth: 180, display: "flex", alignItems: "center", gap: 8, background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-pill)", padding: "8px 14px" }}>
            <Search size={14} color="var(--text-dim)" />
            <input placeholder="Search name, phone, GSTIN…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ border: "none", background: "transparent", flex: 1, color: "var(--text-main)", fontSize: 13 }} />
          </div>
        </div>
      </div>

      {sub === "customers" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap" style={{ border: "none", borderRadius: 0, maxHeight: "none" }}>
            <table className="table">
              <thead><tr><th>Name</th><th>Type</th><th data-hide="mobile">Phone</th><th data-hide="mobile">GSTIN / DL</th><th data-hide="mobile">Credit Limit</th><th>Outstanding</th><th data-hide="mobile">Since</th><th></th></tr></thead>
              <tbody>
                {customers.length === 0 && <tr><td colSpan={8}><div className="empty-state"><div className="empty-state__icon"><Users size={22} /></div><div>No customers</div></div></td></tr>}
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td><div style={{ fontWeight: 600 }}>{c.name}</div>{c.email && <div className="text-xs text-dim">{c.email}</div>}</td>
                    <td><span className={`pill ${c.type === "RETAIL" ? "pill--green" : c.type === "WHOLESALE" ? "pill--purple" : c.type === "HOSPITAL" ? "pill--blue" : "pill--amber"}`}>{c.type}</span></td>
                    <td className="text-sm" data-hide="mobile">{c.phone || "—"}</td>
                    <td className="mono text-xs text-muted" data-hide="mobile">{c.gstin || c.dlNumber || "—"}</td>
                    <td className="mono text-sm" data-hide="mobile">{c.creditLimit ? formatCurrency(c.creditLimit) : "—"}</td>
                    <td className="mono" style={{ fontWeight: 700, color: c.outstandingBalance > 0 ? "var(--rose)" : "var(--text-main)" }}>{formatCurrency(c.outstandingBalance)}</td>
                    <td className="text-sm text-muted" data-hide="mobile">{formatDate(c.createdAt)}</td>
                    <td><div className="flex gap-2">
                      <button className="btn btn--ghost btn--icon btn--sm" onClick={() => setCustModal({ cust: c })}><Edit3 size={13} /></button>
                      {c.name !== "Walk-in Customer" && <button className="btn btn--danger btn--icon btn--sm" onClick={() => { if (confirm(`Delete ${c.name}?`)) { deleteCustomer(c.id); toast("success", "Deleted", `${c.name} removed`); } }}><Trash2 size={13} /></button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sub === "suppliers" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="table-wrap" style={{ border: "none", borderRadius: 0, maxHeight: "none" }}>
            <table className="table">
              <thead><tr><th>Supplier</th><th data-hide="mobile">Contact</th><th>Phone</th><th data-hide="mobile">GSTIN</th><th data-hide="mobile">City</th><th data-hide="mobile">Credit Days</th><th>Outstanding</th><th></th></tr></thead>
              <tbody>
                {suppliers.length === 0 && <tr><td colSpan={8}><div className="empty-state"><div className="empty-state__icon"><Truck size={22} /></div><div>No suppliers</div></div></td></tr>}
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td><div style={{ fontWeight: 600 }}>{s.name}</div>{s.contactPerson && <div className="text-xs text-dim">{s.contactPerson}</div>}</td>
                    <td className="text-sm" data-hide="mobile">{s.contactPerson || "—"}</td>
                    <td className="text-sm">{s.phone}</td>
                    <td className="mono text-xs text-muted" data-hide="mobile">{s.gstin || "—"}</td>
                    <td className="text-sm" data-hide="mobile">{s.city || "—"}</td>
                    <td className="mono text-sm" data-hide="mobile">{s.creditPeriodDays}d</td>
                    <td className="mono" style={{ fontWeight: 700, color: s.outstandingBalance > 0 ? "var(--rose)" : "var(--text-main)" }}>{formatCurrency(s.outstandingBalance)}</td>
                    <td><div className="flex gap-2">
                      <button className="btn btn--ghost btn--icon btn--sm" onClick={() => setSupModal({ sup: s })}><Edit3 size={13} /></button>
                      <button className="btn btn--danger btn--icon btn--sm" onClick={() => { if (confirm(`Delete ${s.name}?`)) { deleteSupplier(s.id); toast("success", "Deleted", `${s.name} removed`); } }}><Trash2 size={13} /></button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sub === "doctors" && (
        <div className="grid grid-3">
          {doctors.length === 0 && <div className="card" style={{ gridColumn: "1/-1" }}><div className="empty-state"><div className="empty-state__icon"><Stethoscope size={22} /></div><div>No doctors registered</div></div></div>}
          {doctors.map((d) => (
            <div key={d.id} className="card" style={{ padding: 18 }}>
              <div className="flex items-center gap-3 mb-2">
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--tile-blue)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border-subtle)" }}>
                  <Stethoscope size={20} color="var(--cyan)" />
                </div>
                <div>
                  <div style={{ fontWeight: 700 }}>{d.name}</div>
                  <div className="text-xs text-dim">{d.specialization}</div>
                </div>
              </div>
              <div className="text-sm" style={{ color: "var(--text-muted)" }}>
                {d.hospital && <div className="flex items-center gap-2 mt-2"><Building2 size={12} /> {d.hospital}</div>}
                {d.phone && <div className="flex items-center gap-2 mt-2"><Phone size={12} /> {d.phone}</div>}
                {d.regNumber && <div className="flex items-center gap-2 mt-2"><Stethoscope size={12} /> Reg: {d.regNumber}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {custModal && <CustomerModal cust={custModal.cust} onClose={() => setCustModal(null)} onSave={(data) => {
        if (custModal.cust) { updateCustomer(custModal.cust.id, data); toast("success", "Updated", `${data.name} saved`); }
        else { addCustomer(data); toast("success", "Created", `${data.name} added`); }
        setCustModal(null);
      }} />}
      {supModal && <SupplierModal sup={supModal.sup} onClose={() => setSupModal(null)} onSave={(data) => {
        if (supModal.sup) { updateSupplier(supModal.sup.id, data); toast("success", "Updated", `${data.name} saved`); }
        else { addSupplier(data); toast("success", "Created", `${data.name} added`); }
        setSupModal(null);
      }} />}
      {docModal && <DoctorModal onClose={() => setDocModal(false)} onSave={(data) => { addDoctor(data); toast("success", "Created", `${data.name} added`); setDocModal(false); }} />}
    </div>
  );
};

const CustomerModal = ({ cust, onClose, onSave }: { cust?: Customer; onClose: () => void; onSave: (c: Partial<Customer>) => void }) => {
  const [f, setF] = useState<Partial<Customer>>(cust || { name: "", type: "RETAIL", phone: "", email: "", address: "", gstin: "", dlNumber: "", creditLimit: 0 });
  const set = (k: keyof Customer, v: any) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Modal title={cust ? "Edit Customer" : "Add Customer"} onClose={onClose} footer={<><button className="btn btn--ghost" onClick={onClose}>Cancel</button><button className="btn btn--accent" onClick={() => onSave(f)} disabled={!f.name}>Save</button></>}>
      <div className="flex-col gap-3">
        <div className="field-row">
          <div className="field"><label className="label">Name</label><input className="input" value={f.name || ""} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="field"><label className="label">Type</label><select className="select" value={f.type || "RETAIL"} onChange={(e) => set("type", e.target.value as CustomerType)}><option value="RETAIL">Retail</option><option value="WHOLESALE">Wholesale B2B</option><option value="HOSPITAL">Hospital</option><option value="DOCTOR">Doctor</option></select></div>
        </div>
        <div className="field-row">
          <div className="field"><label className="label">Phone</label><input className="input" value={f.phone || ""} onChange={(e) => set("phone", e.target.value)} /></div>
          <div className="field"><label className="label">Email</label><input className="input" value={f.email || ""} onChange={(e) => set("email", e.target.value)} /></div>
        </div>
        <div className="field"><label className="label">Address</label><input className="input" value={f.address || ""} onChange={(e) => set("address", e.target.value)} /></div>
        <div className="field-row">
          <div className="field"><label className="label">GSTIN (B2B)</label><input className="input" value={f.gstin || ""} onChange={(e) => set("gstin", e.target.value)} /></div>
          <div className="field"><label className="label">DL Number</label><input className="input" value={f.dlNumber || ""} onChange={(e) => set("dlNumber", e.target.value)} /></div>
          <div className="field"><label className="label">Credit Limit</label><input className="input" type="number" value={f.creditLimit || 0} onChange={(e) => set("creditLimit", parseFloat(e.target.value) || 0)} /></div>
        </div>
      </div>
    </Modal>
  );
};

const SupplierModal = ({ sup, onClose, onSave }: { sup?: Supplier; onClose: () => void; onSave: (s: Partial<Supplier>) => void }) => {
  const [f, setF] = useState<Partial<Supplier>>(sup || { name: "", contactPerson: "", phone: "", email: "", gstin: "", dlNumber: "", address: "", city: "Bengaluru", state: "Karnataka", pincode: "", creditPeriodDays: 30 });
  const set = (k: keyof Supplier, v: any) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Modal title={sup ? "Edit Supplier" : "Add Supplier"} onClose={onClose} footer={<><button className="btn btn--ghost" onClick={onClose}>Cancel</button><button className="btn btn--accent" onClick={() => onSave(f)} disabled={!f.name}>Save</button></>}>
      <div className="flex-col gap-3">
        <div className="field-row">
          <div className="field"><label className="label">Company Name</label><input className="input" value={f.name || ""} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="field"><label className="label">Contact Person</label><input className="input" value={f.contactPerson || ""} onChange={(e) => set("contactPerson", e.target.value)} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label className="label">Phone</label><input className="input" value={f.phone || ""} onChange={(e) => set("phone", e.target.value)} /></div>
          <div className="field"><label className="label">Email</label><input className="input" value={f.email || ""} onChange={(e) => set("email", e.target.value)} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label className="label">GSTIN</label><input className="input" value={f.gstin || ""} onChange={(e) => set("gstin", e.target.value)} /></div>
          <div className="field"><label className="label">DL Number</label><input className="input" value={f.dlNumber || ""} onChange={(e) => set("dlNumber", e.target.value)} /></div>
        </div>
        <div className="field"><label className="label">Address</label><input className="input" value={f.address || ""} onChange={(e) => set("address", e.target.value)} /></div>
        <div className="field-row">
          <div className="field"><label className="label">City</label><input className="input" value={f.city || ""} onChange={(e) => set("city", e.target.value)} /></div>
          <div className="field"><label className="label">State</label><input className="input" value={f.state || ""} onChange={(e) => set("state", e.target.value)} /></div>
          <div className="field"><label className="label">Pincode</label><input className="input" value={f.pincode || ""} onChange={(e) => set("pincode", e.target.value)} /></div>
          <div className="field"><label className="label">Credit Days</label><input className="input" type="number" value={f.creditPeriodDays || 30} onChange={(e) => set("creditPeriodDays", parseInt(e.target.value) || 30)} /></div>
        </div>
      </div>
    </Modal>
  );
};

const DoctorModal = ({ onClose, onSave }: { onClose: () => void; onSave: (d: Partial<Doctor>) => void }) => {
  const [f, setF] = useState<Partial<Doctor>>({ name: "", specialization: "", hospital: "", regNumber: "", phone: "" });
  const set = (k: keyof Doctor, v: any) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Modal title="Add Doctor" onClose={onClose} footer={<><button className="btn btn--ghost" onClick={onClose}>Cancel</button><button className="btn btn--accent" onClick={() => onSave(f)} disabled={!f.name}>Save</button></>}>
      <div className="flex-col gap-3">
        <div className="field-row">
          <div className="field"><label className="label">Doctor Name</label><input className="input" value={f.name || ""} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="field"><label className="label">Specialization</label><input className="input" value={f.specialization || ""} onChange={(e) => set("specialization", e.target.value)} /></div>
        </div>
        <div className="field-row">
          <div className="field"><label className="label">Hospital / Clinic</label><input className="input" value={f.hospital || ""} onChange={(e) => set("hospital", e.target.value)} /></div>
          <div className="field"><label className="label">Reg Number</label><input className="input" value={f.regNumber || ""} onChange={(e) => set("regNumber", e.target.value)} /></div>
          <div className="field"><label className="label">Phone</label><input className="input" value={f.phone || ""} onChange={(e) => set("phone", e.target.value)} /></div>
        </div>
      </div>
    </Modal>
  );
};
