// Formatting helpers
export const formatCurrency = (n: number, currency = "₹"): string => {
  if (n == null || isNaN(n)) return `${currency}0`;
  const v = Math.abs(n);
  const formatted = v.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  return `${n < 0 ? "-" : ""}${currency}${formatted}`;
};

export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const daysBetween = (dateStr: string): number => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const genId = (prefix = "id"): string =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const genBillNumber = (count: number): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `VEL${y}${m}${String(count + 1).padStart(5, "0")}`;
};

export const genInvoiceNumber = (count: number): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `PO${y}${m}${String(count + 1).padStart(4, "0")}`;
};

export const classifyBatch = (expiryDate: string): BatchState => {
  const days = daysBetween(expiryDate);
  if (days < 0) return "EXPIRED";
  if (days <= 60) return "NEAR_EXPIRY";
  return "ACTIVE";
};

export type BatchState = "ACTIVE" | "NEAR_EXPIRY" | "EXPIRED" | "DEPLETED";

export const roundTo2 = (n: number): number => Math.round(n * 100) / 100;

export const roundTo = (n: number): number => Math.round(n);
