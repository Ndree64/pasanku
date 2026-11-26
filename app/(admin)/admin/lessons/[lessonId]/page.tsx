import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getPrivilegedContentDetail } from "@/lib/data/repository";
import { AppShell } from "@/components/layout/AppShell";
import { ErrorState, PageSkeleton } from "@/components/ui/States";
import { LessonBuilderClient } from "@/features/content/LessonBuilderClient";

async function LessonBuilderLoader({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const user = await requireRole(["admin"]);
  const { lessonId } = await params;
  const detail = getPrivilegedContentDetail("lesson", lessonId);

  if (!detail || detail.type !== "lesson") {
    return (
      <AppShell user={user}>
        <ErrorState
          title="Lesson Tidak Ditemukan"
          message="Data lesson yang dimaksud tidak tersedia."
          retryHref="/admin/units"
        />
      </AppShell>
    );
  }

  return (
    <AppShell user={user}>
      <div className="space-y-5">
        <Link
          href="/admin/units"
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-brand hover:underline"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          Kembali ke Manajemen Unit
        </Link>
        <LessonBuilderClient detail={detail} />
      </div>
    </AppShell>
  );
}

export default function AdminLessonBuilderPage(props: {
  params: Promise<{ lessonId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-4xl mx-auto">
          <PageSkeleton />
        </div>
      }
    >
      <LessonBuilderLoader params={props.params} />
    </Suspense>
  );
}
