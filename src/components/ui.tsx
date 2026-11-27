import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";
export interface Toast { id: string; type: ToastType; title: string; message: string; }

const Ctx = createContext<{
  toast: (type: ToastType, title: string, message: string) => void;
} | null>(null);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = (type: ToastType, title: string, message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, type, title, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  };
  const dismiss = (id: string) => setToasts((t) => t.filter((x) => x.id !== id));
  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="toast-stack">
        {toasts.map((t) => {
          const Icon = t.type === "success" ? CheckCircle2 : t.type === "error" ? AlertCircle : t.type === "warning" ? AlertTriangle : Info;
          const color = t.type === "success" ? "var(--teal)" : t.type === "error" ? "var(--rose)" : t.type === "warning" ? "var(--amber)" : "var(--cyan)";
          return (
            <div key={t.id} className={`toast toast--${t.type}`}>
              <Icon className="toast__icon" size={18} color={color} />
              <div style={{ flex: 1 }}>
                <div className="toast__title">{t.title}</div>
                <div className="toast__msg">{t.message}</div>
              </div>
              <button className="toast__close" onClick={() => dismiss(t.id)} style={{ color: "var(--text-dim)" }}><X size={14} /></button>
            </div>
          );
        })}
      </div>
    </Ctx.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx.toast;
};

// Modal helper
export const Modal = ({
  title, onClose, children, footer, size = "md",
}: {
  title: string; onClose: () => void; children: ReactNode;
  footer?: ReactNode; size?: "md" | "lg" | "xl";
}) => (
  <div className="modal-overlay" onClick={onClose}>
    <div className={`modal ${size === "lg" ? "modal--lg" : size === "xl" ? "modal--xl" : ""}`} onClick={(e) => e.stopPropagation()}>
      <div className="modal__head">
        <h3>{title}</h3>
        <button className="modal__close" onClick={onClose}><X size={16} /></button>
      </div>
      <div className="modal__body">{children}</div>
      {footer && <div className="modal__foot">{footer}</div>}
    </div>
  </div>
);

export const useModal = () => {
  const [open, setOpen] = useState(false);
  const openModal = useCallback(() => setOpen(true), []);
  const closeModal = useCallback(() => setOpen(false), []);
  return { open, openModal, closeModal };
};
