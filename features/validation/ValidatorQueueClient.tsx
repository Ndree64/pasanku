"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Clock, Edit3, Eye, FileCheck } from "lucide-react";
import type { ContentReview, ReviewStatus } from "@/types/pasanku";
import { Card } from "@/components/ui/Primitives";
import { EmptyState } from "@/components/ui/States";

type FilterStatus = "all" | ReviewStatus;

export function ValidatorQueueClient({
  reviews,
}: {
  reviews: ContentReview[];
}) {
  const [filter, setFilter] = useState<FilterStatus>("pending");

  const filtered = reviews.filter((r) =>
    filter === "all" ? true : r.status === filter
  );

  const tabs: Array<{ id: FilterStatus; label: string; count: number }> = [
    {
      id: "pending",
      label: "Menunggu Review",
      count: reviews.filter((r) => r.status === "pending").length,
    },
    {
      id: "approved",
      label: "Disetujui",
      count: reviews.filter((r) => r.status === "approved").length,
    },
    {
      id: "changes_requested",
      label: "Perlu Revisi",
      count: reviews.filter((r) => r.status === "changes_requested").length,
    },
    { id: "all", label: "Semua", count: reviews.length },
  ];

  const statusPill = (status: ReviewStatus) => {
    if (status === "approved") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-chip bg-success-tint text-success border border-success/40 text-xs font-bold">
          <Check className="w-3.5 h-3.5" aria-hidden="true" />
          Disetujui
        </span>
      );
    }
    if (status === "changes_requested") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-chip bg-brand-tint text-brand border border-brand/40 text-xs font-bold">
          <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
          Perlu Revisi
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-chip bg-accent-tint text-ink border border-accent-border text-xs font-bold">
        <Clock className="w-3.5 h-3.5 text-accent-lip" aria-hidden="true" />
        Menunggu Review
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`min-h-[40px] px-3.5 rounded-chip border text-xs font-extrabold cursor-pointer ${
                active
                  ? "bg-brand text-white border-brand-lip"
                  : "bg-surface text-ink-soft border-border-control hover:bg-surface-soft"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Tidak Ada Konten di Kategori Ini"
          description="Pilih tab status lain atau buka Mode Pratinjau untuk melihat jalur belajar."
          actionLabel="Buka Mode Pratinjau"
          actionHref="/preview"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((rev) => {
            const type = rev.lessonId ? "lesson" : "quiz";
            const targetId = rev.lessonId ?? rev.quizId ?? "";
            return (
              <Card
                key={rev.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {statusPill(rev.status)}
                    <span className="text-xs font-bold text-ink-soft">
                      {type === "lesson" ? "Paket Lesson" : "Paket Quiz Unit"} ·
                      v{rev.contentVersion}
                    </span>
                  </div>
                  <h2 className="font-display text-base md:text-lg font-extrabold text-ink">
                    {rev.contentTitle}
                  </h2>
                  <p className="text-xs text-ink-soft">
                    {rev.unitTitle} · Diajukan oleh {rev.submittedByName}
                  </p>
                  {rev.reviewNote ? (
                    <p className="text-xs bg-surface-soft border border-border-subtle rounded-chip px-3 py-2 text-ink">
                      <strong>Catatan:</strong> {rev.reviewNote}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/validator/reviews/${type}/${targetId}?reviewId=${rev.id}`}
                    className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-control bg-brand text-white text-xs font-extrabold tactile-btn tactile-brand"
                  >
                    <FileCheck className="w-4 h-4" aria-hidden="true" />
                    Periksa Konten
                  </Link>
                  <Link
                    href="/preview"
                    title="Lihat dalam Mode Pratinjau"
                    className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-control border border-border-control bg-surface-soft text-ink hover:bg-surface-highlight"
                  >
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
