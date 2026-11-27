import { useState } from "react";
import { Lock, Mail, Eye, EyeOff, LogIn, ShieldCheck, Sparkles, UserRound, ChevronRight } from "lucide-react";
import { useAuth, demoAccounts } from "../store/AuthContext";

/* ============================================================
   Login panel.
   - Wrapped in a real <form> with autoComplete attributes so the
     browser's password manager / autofill works on desktop Chrome,
     Safari, mobile Chrome, iOS keychain, etc.
   - Demo accounts are one-tap fill buttons.
   - "Remember me" persists the session across reloads.
   ============================================================ */

export const LoginPanel = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    // small delay for UX feedback
    setTimeout(() => {
      const r = login(email, password, remember);
      if (!r.ok) setError(r.error || "Login failed");
      setLoading(false);
    }, 350);
  };

  const quickFill = (em: string, pw: string) => {
    setEmail(em);
    setPassword(pw);
    setError("");
  };

  return (
    <div className="login-shell">
      {/* Left brand panel (desktop) */}
      <div className="login-hero">
        <div className="login-hero__top">
          <div className="login-hero__logo">v</div>
          <div>
            <div className="login-hero__name">velo <span>Pharma</span></div>
            <div className="login-hero__tag">Pharmacy ERP & POS</div>
          </div>
        </div>
        <div className="login-hero__mid">
          <h2>Run your pharmacy with precision.</h2>
          <p>FEFO batch billing, GST invoices, expiry watch, GSTR-1 reports, supplier ledgers and customer credit — all in one fast, offline-first counter.</p>
          <ul className="login-hero__feats">
            <li><Sparkles size={14} /> Keyboard-first POS checkout (F1, F3, F8-F10)</li>
            <li><Sparkles size={14} /> Batch-level expiry alerts & stock adjustments</li>
            <li><Sparkles size={14} /> Dark / light theme, mobile-friendly</li>
          </ul>
        </div>
        <div className="login-hero__foot">
          <ShieldCheck size={13} /> Data stays in your browser (localStorage). No server, no tracking.
        </div>
      </div>

      {/* Right form panel */}
      <div className="login-form-side">
        <form className="login-card" onSubmit={submit} autoComplete="on">
          <div className="login-card__head">
            <div className="login-card__logo">v</div>
            <h1>Welcome back</h1>
            <p>Sign in to your pharmacy counter</p>
          </div>

          <div className="login-field">
            <label htmlFor="lemail">Email address</label>
            <div className="login-input">
              <Mail size={16} />
              <input
                id="lemail"
                name="email"
                type="email"
                autoComplete="username"
                placeholder="you@pharma.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="lpw">Password</label>
            <div className="login-input">
              <Lock size={16} />
              <input
                id="lpw"
                name="password"
                type={showPw ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" className="login-input__toggle" onClick={() => setShowPw((s) => !s)} aria-label="Toggle password visibility">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="login-row">
            <label className="login-check">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span>Remember me on this device</span>
            </label>
            <button type="button" className="login-link" onClick={() => setError("Demo mode — ask the owner to reset via Settings → Staff.")}>
              Forgot password?
            </button>
          </div>

          {error && <div className="login-error">{error}</div>}

          <button type="submit" className="btn btn--accent btn--lg w-full login-submit" disabled={loading}>
            <LogIn size={17} /> {loading ? "Signing in…" : "Sign in"}
          </button>

          {/* Demo accounts — one-tap fill so the browser can also save them */}
          <div className="login-demo">
            <div className="login-demo__label">
              <UserRound size={12} /> Demo accounts — tap to autofill
            </div>
            <div className="login-demo__grid">
              {demoAccounts.map((d) => (
                <button
                  key={d.email}
                  type="button"
                  className="login-demo__chip"
                  onClick={() => quickFill(d.email, d.password)}
                >
                  <span className="login-demo__role">{d.role}</span>
                  <span className="login-demo__email">{d.email}</span>
                  <ChevronRight size={12} />
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
