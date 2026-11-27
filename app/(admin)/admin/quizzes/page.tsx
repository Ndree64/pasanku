import { Suspense } from "react";
import { getAdminQuizzesOverview } from "@/lib/data/repository";
import { ListDetailSkeleton } from "@/components/ui/States";
import { QuizManagerClient } from "@/features/content/QuizManagerClient";

async function AdminQuizzesContent() {
  const overview = await getAdminQuizzesOverview();
  return <QuizManagerClient overview={overview} />;
}

export default function AdminQuizzesPage() {
  return (
    <Suspense fallback={<ListDetailSkeleton />}>
      <AdminQuizzesContent />
    </Suspense>
  );
}
