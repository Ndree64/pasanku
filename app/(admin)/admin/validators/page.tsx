import { Suspense } from "react";
import { listValidators } from "@/lib/data/repository";
import { ListDetailSkeleton } from "@/components/ui/States";
import { ValidatorsManagerClient } from "@/features/content/ValidatorsManagerClient";

async function AdminValidatorsContent() {
  const validators = await listValidators();
  return <ValidatorsManagerClient validators={validators} />;
}

export default function AdminValidatorsPage() {
  return (
    <Suspense fallback={<ListDetailSkeleton />}>
      <AdminValidatorsContent />
    </Suspense>
  );
}
