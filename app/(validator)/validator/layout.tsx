import { Suspense } from "react";
import { requireRole } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/AppShell";
import { DashboardSkeleton, ShellSkeleton } from "@/components/ui/States";

async function ValidatorShell({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["validator"]);
  return <AppShell user={user}>{children}</AppShell>;
}

export default function ValidatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <ShellSkeleton label="Memuat panel validator">
          <DashboardSkeleton />
        </ShellSkeleton>
      }
    >
      <ValidatorShell>{children}</ValidatorShell>
    </Suspense>
  );
}
