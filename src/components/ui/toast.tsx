import { CheckCircle2, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface ToastItem {
  id: number;
  title: string;
  description?: string;
}

interface ToastContextValue {
  pushToast: (toast: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = Date.now();
    setToasts((current) => [...current, { ...toast, id }]);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) {
      return;
    }

    const latest = toasts[toasts.length - 1];
    const timeout = window.setTimeout(() => removeToast(latest.id), 3500);
    return () => window.clearTimeout(timeout);
  }, [removeToast, toasts]);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[120] space-y-3">
        {toasts.map((toast) => (
          <div key={toast.id} className="flex max-w-sm items-start gap-3 rounded-3xl border border-brand-green/30 bg-white px-4 py-4 shadow-glow">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-brand-green" />
            <div className="flex-1">
              <p className="font-semibold text-slate-950">{toast.title}</p>
              {toast.description ? <p className="mt-1 text-sm text-slate-600">{toast.description}</p> : null}
            </div>
            <button type="button" onClick={() => removeToast(toast.id)} aria-label="Dismiss notification">
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }

  return context;
}
