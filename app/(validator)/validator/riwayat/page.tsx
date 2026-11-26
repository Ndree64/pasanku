import { Suspense } from "react";
import { Check, Edit3 } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getValidatorQueueData } from "@/lib/data/repository";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Primitives";
import { EmptyState, PageSkeleton } from "@/components/ui/States";

async function ValidatorHistoryContent() {
  const user = await requireRole(["validator"]);
  const { reviews } = getValidatorQueueData();
  const completed = reviews.filter((r) => r.status !== "pending");

  return (
    <AppShell user={user}>
      <div className="space-y-5">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-ink">
            Riwayat Review Validasi
          </h1>
          <p className="text-sm text-ink-soft">
            Catatan seluruh keputusan pemeriksaan konten Bahasa Pasan beserta
            alasannya.
          </p>
        </div>

        {completed.length === 0 ? (
          <EmptyState
            title="Belum Ada Riwayat Pemeriksaan"
            description="Konten yang telah disetujui atau diminta revisi akan muncul di sini."
            actionLabel="Buka Antrean"
            actionHref="/validator"
          />
        ) : (
          <div className="space-y-3">
            {completed.map((rev) => (
              <Card key={rev.id} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-chip text-xs font-bold border ${
                      rev.status === "approved"
                        ? "bg-success-tint text-success border-success/40"
                        : "bg-brand-tint text-brand border-brand/40"
                    }`}
                  >
                    {rev.status === "approved" ? (
                      <>
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        Disetujui
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                        Minta Revisi
                      </>
                    )}
                  </span>
                  <span className="text-xs text-ink-soft">
                    Pemeriksa: {rev.reviewedByName ?? user.fullName} · v
                    {rev.contentVersion}
                  </span>
                </div>

                <h2 className="font-display font-bold text-base text-ink">
                  {rev.contentTitle}
                </h2>
                <p className="text-xs text-ink-soft">{rev.unitTitle}</p>
                {rev.reviewNote ? (
                  <p className="text-xs bg-surface-soft border border-border-subtle rounded-control p-3 text-ink">
                    <strong>Catatan:</strong> {rev.reviewNote}
                  </p>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function ValidatorRiwayatPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-4xl mx-auto">
          <PageSkeleton />
        </div>
      }
    >
      <ValidatorHistoryContent />
    </Suspense>
  );
}
