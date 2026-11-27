"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, Eye, Globe, KeyRound, Plus, Send } from "lucide-react";
import {
  addQuizQuestionAction,
  cancelValidationAction,
  publishContentAction,
  submitForValidationAction,
} from "@/actions/content";
import {
  formatAnswerKeySummary,
  QUESTION_TYPE_LABELS,
} from "@/lib/data/question-builder";
import type { getAdminQuizzesOverview } from "@/lib/data/repository";
import { Button, Card, ContentStatusBadge } from "@/components/ui/Primitives";
import { EmptyState } from "@/components/ui/States";
import { QuestionComposerFields } from "@/features/content/QuestionComposerFields";

type QuizzesOverview = Awaited<ReturnType<typeof getAdminQuizzesOverview>>;

export function QuizManagerClient({
  overview,
}: {
  overview: QuizzesOverview;
}) {
  const router = useRouter();
  const [selectedUnitId, setSelectedUnitId] = useState(
    overview[0]?.unit.id ?? ""
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const activeItem =
    overview.find((o) => o.unit.id === selectedUnitId) ?? overview[0];

  const runAction = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string
  ) => {
    setNotice(null);
    startTransition(async () => {
      const res = await fn();
      setNotice(res.ok ? okMsg : res.error ?? "Terjadi kesalahan.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-ink">
          Manajemen Quiz Unit
        </h1>
        <p className="text-sm text-ink-soft">
          Setiap Quiz Unit menampung 15 sampai 20 soal yang masing-masing
          dipetakan ke satu lesson sumber utama untuk rekomendasi remedial.
        </p>
      </div>

      {/* Selector Unit */}
      <div className="flex flex-wrap gap-2">
        {overview.map((item) => {
          const active = item.unit.id === activeItem?.unit.id;
          return (
            <button
              key={item.unit.id}
              type="button"
              onClick={() => setSelectedUnitId(item.unit.id)}
              className={`min-h-[40px] px-3.5 rounded-chip border text-xs font-extrabold cursor-pointer ${
                active
                  ? "bg-brand text-white border-brand-lip"
                  : "bg-surface text-ink-soft border-border-control hover:bg-surface-soft"
              }`}
            >
              Unit {item.unit.orderNumber} ({item.questions.length} soal)
            </button>
          );
        })}
      </div>

      {notice ? (
        <div
          role="status"
          className="p-3.5 rounded-control bg-accent-tint border border-accent-border text-sm font-bold text-ink"
        >
          {notice}
        </div>
      ) : null}

      {!activeItem?.quiz ? (
        <EmptyState
          title={`Quiz Unit ${activeItem?.unit.orderNumber ?? ""} Belum Dibuat`}
          description="Unit ini belum memiliki paket Quiz Unit di basis data awal. Gunakan Unit 1 atau Unit 2 untuk mengelola soal quiz."
        />
      ) : (
        <div className="space-y-5">
          <Card focal className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <ContentStatusBadge status={activeItem.quiz.status} />
                <span className="text-xs font-extrabold text-ink-soft">
                  {activeItem.questions.length} / 15-20 Soal · Ambang Lulus{" "}
                  {activeItem.quiz.passingScore}
                </span>
              </div>
              <h2 className="font-display text-xl font-extrabold text-ink">
                {activeItem.quiz.title}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/learner/quizzes/${activeItem.unit.id}?mode=preview`}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-control bg-accent-tint border border-accent-border text-ink text-xs font-extrabold"
              >
                <Eye className="w-4 h-4" aria-hidden="true" />
                Pratinjau Quiz
              </Link>

              {activeItem.quiz.status === "pending_review" ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    runAction(
                      () =>
                        cancelValidationAction({
                          type: "quiz",
                          targetId: activeItem.quiz!.id,
                        }),
                      "Pengajuan review quiz dibatalkan."
                    )
                  }
                >
                  Batalkan Pengajuan
                </Button>
              ) : null}

              {(activeItem.quiz.status === "draft" ||
                activeItem.quiz.status === "changes_requested") ? (
                <Button
                  type="button"
                  variant="accent"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    runAction(
                      () =>
                        submitForValidationAction({
                          type: "quiz",
                          targetId: activeItem.quiz!.id,
                        }),
                      "Quiz Unit dikirim ke antrean Validator."
                    )
                  }
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  Ajukan Validasi
                </Button>
              ) : null}

              {activeItem.quiz.status === "approved" ? (
                <Button
                  type="button"
                  variant="success"
                  size="sm"
                  disabled={isPending}
                  onClick={() =>
                    runAction(
                      () =>
                        publishContentAction({
                          type: "quiz",
                          targetId: activeItem.quiz!.id,
                        }),
                      "Quiz Unit resmi diterbitkan!"
                    )
                  }
                >
                  <Globe className="w-4 h-4" aria-hidden="true" />
                  Terbitkan
                </Button>
              ) : null}
            </div>
          </Card>

          {activeItem.questions.length < 15 ||
          activeItem.questions.length > 20 ? (
            <div className="p-3.5 rounded-card bg-brand-tint border border-brand/40 flex items-center gap-2 text-xs font-bold text-brand">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              Jumlah soal saat ini {activeItem.questions.length}. Wajib antara 15
              sampai 20 soal agar memenuhi aturan kelayakan Quiz Unit.
            </div>
          ) : null}

          {/* Form Tambah Soal Quiz */}
          {activeItem.quiz.status !== "pending_review" &&
          activeItem.questions.length < 20 ? (
            <Card className="space-y-3">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-brand" aria-hidden="true" />
                Tambah Soal Quiz Unit
              </h3>
              <form
                action={(fd) =>
                  runAction(
                    () => addQuizQuestionAction(fd),
                    "Soal Quiz Unit baru berhasil ditambahkan."
                  )
                }
                className="space-y-3"
              >
                <input
                  type="hidden"
                  name="quizId"
                  value={activeItem.quiz.id}
                />
                <div className="space-y-1">
                  <label className="text-xs font-extrabold uppercase text-ink-soft">
                    Pemetaan Lesson Sumber (Wajib)
                  </label>
                  <select
                    name="primaryLessonId"
                    required
                    className="w-full h-11 px-3 rounded-control border border-border-control bg-canvas text-xs text-ink"
                  >
                    {activeItem.unitLessons.map((l) => (
                      <option key={l.id} value={l.id}>
                        {activeItem.unit.orderNumber}.{l.orderNumber} {l.title}
                      </option>
                    ))}
                  </select>
                </div>

                <QuestionComposerFields />

                <Button type="submit" variant="primary" size="sm" disabled={isPending}>
                  + Simpan Soal ke Quiz
                </Button>
              </form>
            </Card>
          ) : null}

          {/* Bank Soal Quiz */}
          <div className="space-y-2.5">
            {activeItem.questions.map(({ question, answerKey }, idx) => {
              const mappedLesson = activeItem.unitLessons.find(
                (l) => l.id === question.primaryLessonId
              );
              return (
                <Card key={question.id} className="space-y-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-extrabold text-brand">
                      Soal #{idx + 1} ·{" "}
                      {QUESTION_TYPE_LABELS[question.questionType]}
                    </span>
                    <span className="px-2 py-0.5 rounded-chip bg-surface-soft border border-border-subtle font-bold text-ink-soft">
                      Lesson {activeItem.unit.orderNumber}.
                      {mappedLesson?.orderNumber ?? "?"}
                    </span>
                  </div>
                  <p className="font-bold text-sm text-ink">
                    {question.questionText}
                  </p>
                  <p className="text-xs font-bold text-success flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    Kunci:{" "}
                    {formatAnswerKeySummary(answerKey, question.questionData)}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
