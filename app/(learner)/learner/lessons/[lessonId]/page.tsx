import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getDefaultHomeByRole, requireRole } from "@/lib/auth/session";
import { getLessonForRunner } from "@/lib/data/repository";
import { ErrorState, PageSkeleton } from "@/components/ui/States";
import { LessonRunner } from "@/features/learning/LessonRunner";

async function LessonLoader({
  params,
  searchParams,
}: {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ mode?: string; assignmentId?: string }>;
}) {
  const user = await requireRole(["learner", "admin", "validator"]);
  const { lessonId } = await params;
  const sp = await searchParams;

  const requestedMode =
    sp.mode === "preview"
      ? "preview"
      : sp.mode === "remedial"
        ? "remedial"
        : "regular";

  if (requestedMode === "preview" && user.role === "learner") {
    redirect("/learner");
  }
  if (requestedMode !== "preview" && user.role !== "learner") {
    redirect(getDefaultHomeByRole(user.role));
  }

  const payload = getLessonForRunner(user.id, lessonId, {
    mode: requestedMode,
    assignmentId: sp.assignmentId,
  });

  if (!payload) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <ErrorState
          title="Lesson Tidak Ditemukan"
          message="Lesson yang kamu cari belum tersedia."
          retryHref={requestedMode === "preview" ? "/preview" : "/learner"}
        />
      </div>
    );
  }

  if (!payload.access.allowed) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <ErrorState
          title="Lesson Terkunci"
          message={
            payload.access.reason ??
            "Selesaikan lesson sebelumnya terlebih dahulu."
          }
          retryHref="/learner"
          retryLabel="Kembali ke Learning Path"
        />
      </div>
    );
  }

  return <LessonRunner payload={payload} />;
}

export default function LessonPage(props: {
  params: Promise<{ lessonId: string }>;
  searchParams: Promise<{ mode?: string; assignmentId?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-[960px] mx-auto p-6">
          <PageSkeleton />
        </div>
      }
    >
      <LessonLoader params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
