"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-bold text-brand-700">
          Gameroom
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {!loading && user && (
            <>
              <Link href="/carrinho" className="text-slate-600 hover:text-brand-700">
                Carrinho
              </Link>
              <span className="text-slate-400">|</span>
              <span className="text-slate-500">{user.email}</span>
              <button onClick={handleLogout} className="btn-secondary py-1">
                Sair
              </button>
            </>
          )}
          {!loading && !user && (
            <>
              <Link href="/carrinho" className="text-slate-600 hover:text-brand-700">
                Carrinho
              </Link>
              <Link href="/login" className="text-slate-600 hover:text-brand-700">
                Entrar
              </Link>
              <Link href="/registro" className="btn-primary py-1">
                Criar conta
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
