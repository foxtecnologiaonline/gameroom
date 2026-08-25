"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function Navbar() {
  const { usuario, logout, carregando } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/produtos" className="text-lg font-bold text-brand-700">
          Gameroom
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/produtos" className="text-slate-600 hover:text-brand-700">
            Produtos
          </Link>
          {!carregando && usuario && (
            <>
              <Link href="/minhas-compras" className="text-slate-600 hover:text-brand-700">
                Minhas compras
              </Link>
              <Link href="/minha-conta" className="text-slate-600 hover:text-brand-700">
                Minha conta
              </Link>
              {usuario.tipo === "admin" && (
                <Link href="/admin" className="text-slate-600 hover:text-brand-700">
                  Admin
                </Link>
              )}
              <span className="text-slate-400">|</span>
              <span className="text-slate-500">{usuario.nome}</span>
              <button onClick={handleLogout} className="btn-secondary py-1">
                Sair
              </button>
            </>
          )}
          {!carregando && !usuario && (
            <>
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
