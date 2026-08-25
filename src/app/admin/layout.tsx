"use client";

import { RequireAdmin } from "@/components/guards/RequireAdmin";
import { AdminLayout } from "@/components/layouts/AdminLayout";

export default function AdminRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAdmin>
      <AdminLayout>{children}</AdminLayout>
    </RequireAdmin>
  );
}
