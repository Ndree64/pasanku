import { Suspense } from "react";
import { requireRole } from "@/lib/auth/session";
import { listValidators } from "@/lib/data/repository";
import { AppShell } from "@/components/layout/AppShell";
import { PageSkeleton } from "@/components/ui/States";
import { ValidatorsManagerClient } from "@/features/content/ValidatorsManagerClient";

async function AdminValidatorsContent() {
  const user = await requireRole(["admin"]);
  const validators = listValidators();

  return (
    <AppShell user={user}>
      <ValidatorsManagerClient validators={validators} />
    </AppShell>
  );
}

export default function AdminValidatorsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-4xl mx-auto">
          <PageSkeleton />
        </div>
      }
    >
      <AdminValidatorsContent />
    </Suspense>
  );
}
