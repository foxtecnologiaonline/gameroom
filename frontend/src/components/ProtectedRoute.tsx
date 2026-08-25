'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export function ProtectedRoute({
  role,
  children,
}: {
  role?: 'admin' | 'cliente';
  children: React.ReactNode;
}) {
  const { user, carregando } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (carregando) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (role && user.tipo !== role) {
      router.replace('/');
    }
  }, [user, carregando, role, router]);

  if (carregando || !user || (role && user.tipo !== role)) {
    return <div className="p-10 text-center text-sm text-zinc-500">Carregando…</div>;
  }

  return <>{children}</>;
}
