"use client";

import { RequireAuth } from "@/components/guards/RequireAuth";
import { ClienteLayout } from "@/components/layouts/ClienteLayout";

export default function ClienteRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <ClienteLayout>{children}</ClienteLayout>
    </RequireAuth>
  );
}
