"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { usuario, carregando } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (carregando) return;
    if (!usuario) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (usuario.tipo !== "admin") {
      router.replace("/login");
    }
  }, [carregando, usuario, router, pathname]);

  if (carregando || !usuario || usuario.tipo !== "admin") {
    return <div className="py-16 text-center text-slate-500">Carregando...</div>;
  }

  return <>{children}</>;
}
