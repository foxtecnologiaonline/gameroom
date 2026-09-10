"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { usuario, carregando } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!carregando && !usuario) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [carregando, usuario, router, pathname]);

  if (carregando || !usuario) {
    return <div className="py-16 text-center text-slate-500">Carregando...</div>;
  }

  return <>{children}</>;
}
