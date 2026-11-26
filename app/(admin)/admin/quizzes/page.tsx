import { Suspense } from "react";
import { requireRole } from "@/lib/auth/session";
import { getAdminQuizzesOverview } from "@/lib/data/repository";
import { AppShell } from "@/components/layout/AppShell";
import { PageSkeleton } from "@/components/ui/States";
import { QuizManagerClient } from "@/features/content/QuizManagerClient";

async function AdminQuizzesContent() {
  const user = await requireRole(["admin"]);
  const overview = getAdminQuizzesOverview();

  return (
    <AppShell user={user}>
      <QuizManagerClient overview={overview} />
    </AppShell>
  );
}

export default function AdminQuizzesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-4xl mx-auto">
          <PageSkeleton />
        </div>
      }
    >
      <AdminQuizzesContent />
    </Suspense>
  );
}
