"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((cur) => cur.filter((i) => i.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = nextId++;
      setItems((cur) => [...cur, { id, message, type }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-md px-4 py-3 text-sm text-white shadow-lg ${
              item.type === "success"
                ? "bg-green-600"
                : item.type === "error"
                  ? "bg-red-600"
                  : "bg-slate-800"
            }`}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de <ToastProvider>");
  return ctx;
}
