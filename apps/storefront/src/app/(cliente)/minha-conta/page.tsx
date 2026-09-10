"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export default function MinhaContaPage() {
  const { usuario } = useAuth();

  if (!usuario) return null;

  return (
    <div className="max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">Minha conta</h1>

      <div className="card mb-6 p-6">
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Nome</dt>
            <dd className="font-medium">{usuario.nome}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">E-mail</dt>
            <dd className="font-medium">{usuario.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Tipo de conta</dt>
            <dd className="font-medium capitalize">{usuario.tipo}</dd>
          </div>
        </dl>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/minhas-compras" className="card p-4 hover:shadow-md">
          <p className="font-medium text-slate-900">Minhas compras</p>
          <p className="text-sm text-slate-500">Ver histórico e baixar conteúdos</p>
        </Link>
        <Link href="/minhas-compras" className="card p-4 hover:shadow-md">
          <p className="font-medium text-slate-900">Devoluções</p>
          <p className="text-sm text-slate-500">Solicitar ou acompanhar uma devolução</p>
        </Link>
      </div>
    </div>
  );
}
