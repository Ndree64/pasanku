import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Eye } from "lucide-react";
import { getDefaultHomeByRole, requireRole } from "@/lib/auth/session";
import { getLearningPathData } from "@/lib/data/repository";
import { AppShell } from "@/components/layout/AppShell";
import { PageSkeleton } from "@/components/ui/States";
import { LearningPathView } from "@/features/learning/LearningPathView";

async function PreviewContent({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireRole(["admin", "validator"]);
  const sp = await searchParams;
  const includeUnpublished = sp.status !== "published";
  const pathData = getLearningPathData(user.id, {
    isPreview: true,
    includeUnpublished,
  });

  const backHref = getDefaultHomeByRole(user.role);

  return (
    <AppShell user={user}>
      <div className="space-y-6">
        {/* Banner Sticky Mode Pratinjau */}
        <div className="sticky top-16 md:top-4 z-20 bg-accent-tint border-2 border-accent-border rounded-card p-4 shadow-(--shadow-focal) flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <Eye
              className="w-5 h-5 text-accent-lip shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <p className="font-display font-extrabold text-sm text-ink">
                Mode Pratinjau: progres tidak disimpan
              </p>
              <p className="text-xs text-ink-soft">
                Seluruh 5 unit, lesson, dan Quiz Unit terbuka untuk ditinjau
                tanpa memengaruhi data atau XP Learner.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="inline-flex rounded-chip border border-accent-border bg-surface p-0.5 text-xs font-extrabold">
              <Link
                href="/preview?status=all"
                className={`px-3 py-1.5 rounded-chip ${
                  includeUnpublished
                    ? "bg-accent text-ink"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Semua Status
              </Link>
              <Link
                href="/preview?status=published"
                className={`px-3 py-1.5 rounded-chip ${
                  !includeUnpublished
                    ? "bg-accent text-ink"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                Hanya Terbit
              </Link>
            </div>

            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 rounded-control bg-brand text-white text-xs font-extrabold tactile-btn tactile-brand"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              Keluar Pratinjau
            </Link>
          </div>
        </div>

        <LearningPathView data={pathData} isPreview />
      </div>
    </AppShell>
  );
}

export default function PreviewPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-4xl mx-auto">
          <PageSkeleton />
        </div>
      }
    >
      <PreviewContent searchParams={props.searchParams} />
    </Suspense>
  );
}
