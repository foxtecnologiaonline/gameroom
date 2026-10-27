"use client";

import Link from "next/link";
import { RequireAdmin } from "@/components/guards/RequireAdmin";

function AdminDashboard() {
  return (
    <div className="mx-auto max-w-lg">
      <div className="card p-6">
        <h1 className="mb-4 text-xl font-semibold text-slate-900">Painel admin</h1>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href="/admin/sellers" className="btn-primary text-center">
            Aprovação de vendedores
          </Link>
          <Link href="/admin/produtos" className="btn-secondary text-center">
            Moderação de catálogo
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequireAdmin>
      <AdminDashboard />
    </RequireAdmin>
  );
}
