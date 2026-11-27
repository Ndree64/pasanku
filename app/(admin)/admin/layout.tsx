import { Suspense } from "react";
import { requireRole } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardSkeleton, ShellSkeleton } from "@/components/ui/States";

async function AdminShell({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["admin"]);
  return <AppShell user={user}>{children}</AppShell>;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <ShellSkeleton label="Memuat panel admin">
          <DashboardSkeleton />
        </ShellSkeleton>
      }
    >
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
