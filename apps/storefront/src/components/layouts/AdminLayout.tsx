"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/vendas", label: "Vendas" },
  { href: "/admin/reabastecimentos", label: "Reabastecimentos" },
  { href: "/admin/devolucoes", label: "Devoluções" },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="card h-fit w-full p-3 md:w-56">
      <p className="mb-2 px-3 text-xs font-semibold uppercase text-slate-400">Painel admin</p>
      <nav className="flex flex-col gap-1">
        {links.map((link) => {
          const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-md px-3 py-2 text-sm ${
                active ? "bg-brand-50 text-brand-700 font-medium" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <AdminSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
