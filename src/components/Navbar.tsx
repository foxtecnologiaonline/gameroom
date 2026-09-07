"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";

function LogoMark() {
  return (
    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-violet-600 text-sm font-bold text-white shadow-sm">
      G
    </span>
  );
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
      {open ? (
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
      )}
    </svg>
  );
}

export function Navbar() {
  const { usuario, logout, carregando } = useAuth();
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);
  const [busca, setBusca] = useState("");

  function handleLogout() {
    logout();
    setMenuAberto(false);
    router.push("/login");
  }

  function handleBusca(e: React.FormEvent) {
    e.preventDefault();
    setMenuAberto(false);
    router.push(busca.trim() ? `/produtos?busca=${encodeURIComponent(busca.trim())}` : "/produtos");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex flex-none items-center gap-2" onClick={() => setMenuAberto(false)}>
          <LogoMark />
          <span className="text-lg font-bold tracking-tight text-slate-900">Gameroom</span>
        </Link>

        <form onSubmit={handleBusca} className="hidden flex-1 md:block">
          <div className="relative max-w-sm">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                clipRule="evenodd"
              />
            </svg>
            <input
              className="input pl-9"
              placeholder="Buscar chaves, gift cards, assinaturas..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </form>

        <nav className="ml-auto hidden items-center gap-1 text-sm md:flex">
          <Link href="/produtos" className="btn-ghost">
            Produtos
          </Link>
          {!carregando && usuario && (
            <>
              <Link href="/minhas-compras" className="btn-ghost">
                Minhas compras
              </Link>
              {usuario.tipo === "admin" && (
                <Link href="/admin" className="btn-ghost">
                  Admin
                </Link>
              )}
              <Link href="/minha-conta" className="ml-1 flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
                  {usuario.nome.charAt(0).toUpperCase()}
                </span>
                <span className="max-w-[8rem] truncate text-slate-700">{usuario.nome}</span>
              </Link>
              <button onClick={handleLogout} className="btn-secondary py-1.5">
                Sair
              </button>
            </>
          )}
          {!carregando && !usuario && (
            <>
              <Link href="/login" className="btn-ghost">
                Entrar
              </Link>
              <Link href="/registro" className="btn-primary py-1.5">
                Criar conta
              </Link>
            </>
          )}
        </nav>

        <button
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={() => setMenuAberto((v) => !v)}
          aria-label="Abrir menu"
        >
          <MenuIcon open={menuAberto} />
        </button>
      </div>

      {menuAberto && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <form onSubmit={handleBusca} className="mb-3">
            <input
              className="input"
              placeholder="Buscar produtos..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </form>
          <nav className="flex flex-col gap-1 text-sm">
            <Link href="/produtos" className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={() => setMenuAberto(false)}>
              Produtos
            </Link>
            {!carregando && usuario && (
              <>
                <Link href="/minhas-compras" className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={() => setMenuAberto(false)}>
                  Minhas compras
                </Link>
                <Link href="/minha-conta" className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={() => setMenuAberto(false)}>
                  Minha conta ({usuario.nome})
                </Link>
                {usuario.tipo === "admin" && (
                  <Link href="/admin" className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50" onClick={() => setMenuAberto(false)}>
                    Admin
                  </Link>
                )}
                <button onClick={handleLogout} className="btn-secondary mt-2 justify-center">
                  Sair
                </button>
              </>
            )}
            {!carregando && !usuario && (
              <div className="mt-2 flex gap-2">
                <Link href="/login" className="btn-secondary flex-1 justify-center" onClick={() => setMenuAberto(false)}>
                  Entrar
                </Link>
                <Link href="/registro" className="btn-primary flex-1 justify-center" onClick={() => setMenuAberto(false)}>
                  Criar conta
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
