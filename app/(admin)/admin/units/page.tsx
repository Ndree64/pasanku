import { Suspense } from "react";
import { requireRole } from "@/lib/auth/session";
import { getAdminUnitsOverview } from "@/lib/data/repository";
import { AppShell } from "@/components/layout/AppShell";
import { PageSkeleton } from "@/components/ui/States";
import { UnitsManagerClient } from "@/features/content/UnitsManagerClient";

async function AdminUnitsContent() {
  const user = await requireRole(["admin"]);
  const overview = getAdminUnitsOverview();

  return (
    <AppShell user={user}>
      <UnitsManagerClient overview={overview} />
    </AppShell>
  );
}

export default function AdminUnitsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-4xl mx-auto">
          <PageSkeleton />
        </div>
      }
    >
      <AdminUnitsContent />
    </Suspense>
  );
}
