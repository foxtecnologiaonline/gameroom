'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();

  function sair() {
    logout();
    router.push('/');
  }

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold text-zinc-900">
          GameRoom
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-zinc-600 hover:text-zinc-900">
            Loja
          </Link>
          {user?.tipo === 'cliente' && (
            <Link href="/minhas-compras" className="text-zinc-600 hover:text-zinc-900">
              Minhas compras
            </Link>
          )}
          {user?.tipo === 'admin' && (
            <Link href="/admin" className="text-zinc-600 hover:text-zinc-900">
              Painel admin
            </Link>
          )}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-zinc-500">{user.email}</span>
              <button onClick={sair} className="rounded-md border border-zinc-300 px-3 py-1.5 text-zinc-700 hover:bg-zinc-50">
                Sair
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-zinc-600 hover:text-zinc-900">
                Entrar
              </Link>
              <Link href="/registrar" className="rounded-md bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-700">
                Criar conta
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
