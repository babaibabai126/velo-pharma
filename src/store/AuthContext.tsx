import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/* ============================================================
   Auth context — local pharmacy login panel.
   - Credentials are stored in localStorage (no server).
   - Browser autofill is supported via proper <form> + <input
     type="email"/"password" + autoComplete> attributes.
   - "Remember me" persists the session so the user stays logged
     in across reloads; "Save credentials" lets the browser offer
     to save them on submit.
   ============================================================ */

export interface User {
  id: string;
  name: string;
  email: string;
  role: "Owner" | "Pharmacist" | "Cashier";
  avatar?: string;
}

interface AuthState {
  user: User | null;
  login: (email: string, password: string, remember: boolean) => { ok: boolean; error?: string };
  logout: () => void;
  changePassword: (current: string, next: string) => { ok: boolean; error?: string };
  users: User[]; // staff directory for the demo
}

const CREDS_KEY = "velo_pharma_creds";
const SESSION_KEY = "velo_pharma_session";

// Default demo users. Passwords are stored hashed-lite (base64) only to
// avoid plaintext in localStorage — this is a local demo, NOT real auth.
const b64 = (s: string) => { try { return btoa(unescape(encodeURIComponent(s))); } catch { return s; } };
const unb64 = (s: string) => { try { return decodeURIComponent(escape(atob(s))); } catch { return s; } };

interface StoredCred { email: string; password: string; user: User; }

const defaultCreds: StoredCred[] = [
  { email: "admin@velopharma.in", password: b64("admin123"), user: { id: "u1", name: "Pharmacy Owner", email: "admin@velopharma.in", role: "Owner" } },
  { email: "pharma@velopharma.in", password: b64("pharma123"), user: { id: "u2", name: "Dr. Anitha Rao", email: "pharma@velopharma.in", role: "Pharmacist" } },
  { email: "cashier@velopharma.in", password: b64("cashier123"), user: { id: "u3", name: "Counter Staff", email: "cashier@velopharma.in", role: "Cashier" } },
];

const loadCreds = (): StoredCred[] => {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  localStorage.setItem(CREDS_KEY, JSON.stringify(defaultCreds));
  return defaultCreds;
};

const saveCreds = (c: StoredCred[]) => localStorage.setItem(CREDS_KEY, JSON.stringify(c));

const Ctx = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [creds, setCreds] = useState<StoredCred[]>(() => loadCreds());

  // Restore session if "remember me" was used
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const login: AuthState["login"] = (email, password, remember) => {
    const e = email.trim().toLowerCase();
    const found = creds.find((c) => c.email.toLowerCase() === e);
    if (!found) return { ok: false, error: "No account found for that email" };
    if (unb64(found.password) !== password) return { ok: false, error: "Incorrect password" };
    setUser(found.user);
    if (remember) localStorage.setItem(SESSION_KEY, JSON.stringify(found.user));
    else sessionStorage.setItem(SESSION_KEY, JSON.stringify(found.user));
    return { ok: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  };

  const changePassword: AuthState["changePassword"] = (current, next) => {
    if (!user) return { ok: false, error: "Not logged in" };
    const idx = creds.findIndex((c) => c.email === user.email);
    if (idx < 0) return { ok: false, error: "Account missing" };
    if (unb64(creds[idx].password) !== current) return { ok: false, error: "Current password incorrect" };
    if (next.length < 6) return { ok: false, error: "New password must be at least 6 characters" };
    const updated = [...creds];
    updated[idx] = { ...updated[idx], password: b64(next) };
    setCreds(updated);
    saveCreds(updated);
    return { ok: true };
  };

  return (
    <Ctx.Provider value={{ user, login, logout, changePassword, users: creds.map((c) => c.user) }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = (): AuthState => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const demoAccounts = [
  { email: "admin@velopharma.in", password: "admin123", role: "Owner" },
  { email: "pharma@velopharma.in", password: "pharma123", role: "Pharmacist" },
  { email: "cashier@velopharma.in", password: "cashier123", role: "Cashier" },
];
