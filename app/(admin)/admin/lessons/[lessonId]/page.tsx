import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getPrivilegedContentDetail } from "@/lib/data/repository";
import { ErrorState, ListDetailSkeleton } from "@/components/ui/States";
import { LessonBuilderClient } from "@/features/content/LessonBuilderClient";

async function LessonBuilderLoader({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const detail = await getPrivilegedContentDetail("lesson", lessonId);

  if (!detail || detail.type !== "lesson") {
    return (
      <ErrorState
        title="Lesson Tidak Ditemukan"
        message="Data lesson yang dimaksud tidak tersedia."
        retryHref="/admin/units"
      />
    );
  }

  return (
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
  );
}

export default function AdminLessonBuilderPage(props: {
  params: Promise<{ lessonId: string }>;
}) {
  return (
    <Suspense fallback={<ListDetailSkeleton />}>
      <LessonBuilderLoader params={props.params} />
    </Suspense>
  );
}
