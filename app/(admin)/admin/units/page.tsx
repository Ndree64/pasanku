import { Suspense } from "react";
import { getAdminUnitsOverview } from "@/lib/data/repository";
import { ListDetailSkeleton } from "@/components/ui/States";
import { UnitsManagerClient } from "@/features/content/UnitsManagerClient";

async function AdminUnitsContent() {
  const overview = await getAdminUnitsOverview();
  return <UnitsManagerClient overview={overview} />;
}

export default function AdminUnitsPage() {
  return (
    <Suspense fallback={<ListDetailSkeleton />}>
      <AdminUnitsContent />
    </Suspense>
  );
}
