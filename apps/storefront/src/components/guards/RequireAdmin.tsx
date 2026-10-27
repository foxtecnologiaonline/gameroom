"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, router, pathname]);

  if (loading || !user) {
    return <div className="py-16 text-center text-slate-500">Carregando...</div>;
  }

  if (!user.roles.includes("admin")) {
    return (
      <div className="card mx-auto max-w-lg p-6 text-center text-slate-500">
        Esta área é restrita a administradores.
        <div className="mt-4">
          <Link href="/" className="btn-primary">
            Voltar para a loja
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
