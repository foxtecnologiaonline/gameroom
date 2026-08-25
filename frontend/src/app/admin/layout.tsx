'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const ITENS_NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/produtos', label: 'Produtos' },
  { href: '/admin/pedidos', label: 'Pedidos' },
  { href: '/admin/devolucoes', label: 'Devoluções' },
  { href: '/admin/fraude', label: 'Antifraude' },
  { href: '/admin/reabastecimentos', label: 'Reabastecimentos' },
  { href: '/admin/auditoria', label: 'Auditoria' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <ProtectedRoute role="admin">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[180px_1fr]">
        <aside className="space-y-1">
          {ITENS_NAV.map((item) => {
            const ativo = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm ${
                  ativo ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </aside>
        <div>{children}</div>
      </div>
    </ProtectedRoute>
  );
}
