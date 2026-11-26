import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getDefaultHomeByRole, requireRole } from "@/lib/auth/session";
import { getQuizForRunner } from "@/lib/data/repository";
import { ErrorState, PageSkeleton } from "@/components/ui/States";
import { QuizRunner } from "@/features/quiz/QuizRunner";

async function QuizLoader({
  params,
  searchParams,
}: {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const user = await requireRole(["learner", "admin", "validator"]);
  const { unitId } = await params;
  const sp = await searchParams;
  const isPreview = sp.mode === "preview";

  if (isPreview && user.role === "learner") {
    redirect("/learner");
  }
  if (!isPreview && user.role !== "learner") {
    redirect(getDefaultHomeByRole(user.role));
  }

  const payload = getQuizForRunner(user.id, unitId, { isPreview });

  if (!payload) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <ErrorState
          title="Quiz Unit Tidak Ditemukan"
          message="Quiz untuk unit ini belum disiapkan."
          retryHref={isPreview ? "/preview" : "/learner"}
        />
      </div>
    );
  }

  if (!payload.access.allowed) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <ErrorState
          title="Quiz Unit Belum Dapat Diikuti"
          message={
            payload.access.reason ??
            "Penuhi seluruh syarat unit dan remedial terlebih dahulu."
          }
          retryHref="/learner"
          retryLabel="Kembali ke Learning Path"
        />
      </div>
    );
  }

  return <QuizRunner payload={payload} />;
}

export default function QuizPage(props: {
  params: Promise<{ unitId: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="max-w-[960px] mx-auto p-6">
          <PageSkeleton />
        </div>
      }
    >
      <QuizLoader params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
