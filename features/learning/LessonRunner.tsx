"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Eye,
  RotateCcw,
  X,
  XCircle,
} from "lucide-react";
import type { QuestionResponseData } from "@/types/pasanku";
import type {
  LessonEvaluationResult,
  LessonRunnerPayload,
} from "@/lib/data/repository";
import {
  completeMaterialStepAction,
  submitLessonEvaluationAction,
} from "@/actions/learning";
import { Button, ProgressBar, XpBadge } from "@/components/ui/Primitives";
import { QuestionWidget } from "@/features/learning/QuestionWidget";

export function LessonRunner({ payload }: { payload: LessonRunnerPayload }) {
  const { lesson, unit, activities, mode, remedialAssignmentId } = payload;

  const [stepIndex, setStepIndex] = useState(0);
  const [completedMaterials, setCompletedMaterials] = useState<string[]>(
    payload.completedActivityIds
  );
  const [responses, setResponses] = useState<
    Record<string, QuestionResponseData>
  >({});
  const [result, setResult] = useState<LessonEvaluationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const exitHref = mode === "preview" ? "/preview" : "/learner";

  if (activities.length === 0) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-surface border border-border-subtle rounded-panel p-6 text-center space-y-4">
          <h1 className="font-display text-xl font-extrabold text-ink">
            {lesson.title}
          </h1>
          <p className="text-sm text-ink-soft">
            Lesson ini belum memiliki aktivitas materi atau latihan.
          </p>
          <Link
            href={exitHref}
            className="inline-flex items-center justify-center min-h-[48px] px-5 rounded-control bg-brand text-white font-bold text-sm"
          >
            Kembali
          </Link>
        </div>
      </div>
    );
  }

  const allExerciseQuestions = activities.flatMap((a) => a.questions);
  const totalSteps = activities.length;
  const currentItem = activities[stepIndex];

  const handleMarkMaterialAndNext = () => {
    setErrorMessage(null);
    const actId = currentItem.activity.id;
    const nextMaterials = completedMaterials.includes(actId)
      ? completedMaterials
      : [...completedMaterials, actId];
    setCompletedMaterials(nextMaterials);

    startTransition(async () => {
      try {
        await completeMaterialStepAction({
          lessonId: lesson.id,
          activityId: actId,
          mode,
          assignmentId: remedialAssignmentId,
        });
        if (stepIndex < totalSteps - 1) {
          setStepIndex(stepIndex + 1);
        } else {
          // Jika aktivitas terakhir ternyata materi (tanpa latihan)
          const evalRes = await submitLessonEvaluationAction({
            lessonId: lesson.id,
            responses,
            completedMaterialIds: nextMaterials,
            mode,
            assignmentId: remedialAssignmentId,
          });
          setResult(evalRes);
        }
      } catch {
        setErrorMessage("Gagal menyimpan progres materi. Coba lagi.");
      }
    });
  };

  const handleSubmitExercises = () => {
    setErrorMessage(null);
    const currentQuestions = currentItem.questions;
    const unansweredHere = currentQuestions.some((q) => {
      const r = responses[q.id];
      if (!r) return true;
      if ("pairs" in r) return Object.keys(r.pairs).length === 0;
      return !r.selectedOption;
    });

    if (unansweredHere) {
      setErrorMessage("Jawab seluruh soal latihan pada bagian ini dulu.");
      return;
    }

    if (stepIndex < totalSteps - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }

    const allAnswered = allExerciseQuestions.every((q) =>
      Boolean(responses[q.id])
    );
    if (!allAnswered) {
      setErrorMessage("Masih ada soal yang belum terjawab.");
      return;
    }

    startTransition(async () => {
      try {
        const evalRes = await submitLessonEvaluationAction({
          lessonId: lesson.id,
          responses,
          completedMaterialIds: completedMaterials,
          mode,
          assignmentId: remedialAssignmentId,
        });
        setResult(evalRes);
      } catch {
        setErrorMessage("Gagal menilai latihan. Coba ulangi beberapa saat.");
      }
    });
  };

  const handleRetryExercises = () => {
    setResult(null);
    setResponses({});
    const firstExerciseIdx = activities.findIndex(
      (a) => a.activity.activityType === "exercise"
    );
    setStepIndex(firstExerciseIdx >= 0 ? firstExerciseIdx : 0);
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      {mode === "preview" ? (
        <div className="bg-accent-tint border-b border-accent-border px-4 py-2.5">
          <div className="max-w-[960px] mx-auto flex items-center justify-between gap-3 text-xs font-bold text-ink">
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-accent-lip" aria-hidden="true" />
              Mode Pratinjau: progres dan XP tidak disimpan.
            </span>
            <Link href="/preview" className="underline text-brand">
              Keluar Pratinjau
            </Link>
          </div>
        </div>
      ) : null}

      {mode === "remedial" ? (
        <div className="bg-accent-tint border-b border-accent-border px-4 py-2">
          <div className="max-w-[960px] mx-auto text-xs font-extrabold text-ink flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-accent-lip" aria-hidden="true" />
            Mode Remedial: Selesaikan materi &amp; latihan dengan nilai minimal 75.
          </div>
        </div>
      ) : null}

      {/* Header Belajar Fokus */}
      <header className="bg-surface border-b border-border-subtle px-4 py-3">
        <div className="max-w-[960px] mx-auto flex items-center gap-4">
          <Link
            href={exitHref}
            aria-label="Tutup lesson dan kembali"
            className="w-10 h-10 rounded-control border border-border-control flex items-center justify-center text-ink-soft hover:bg-surface-soft shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </Link>

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-ink-soft">
              <span className="truncate">
                Unit {unit.orderNumber}.{lesson.orderNumber}: {lesson.title}
              </span>
              <span className="shrink-0 ml-2">
                {result
                  ? "Selesai"
                  : `Langkah ${stepIndex + 1} / ${totalSteps}`}
              </span>
            </div>
            <ProgressBar
              value={result ? totalSteps : stepIndex + 1}
              max={totalSteps}
              color="success"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 md:py-10">
        <div className="max-w-[960px] mx-auto">
          {result ? (
            /* HASIL LESSON */
            <div className="space-y-6 animate-feedback-up">
              <div
                className={`rounded-panel p-6 md:p-8 border-2 text-center space-y-4 ${
                  result.passed
                    ? "bg-success-tint border-success/40"
                    : "bg-brand-tint border-brand/40"
                }`}
              >
                <div className="flex justify-center">
                  {result.passed ? (
                    <CheckCircle2
                      className="w-14 h-14 text-success"
                      aria-hidden="true"
                    />
                  ) : (
                    <XCircle
                      className="w-14 h-14 text-brand"
                      aria-hidden="true"
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <span
                    className={`inline-block px-3 py-1 rounded-chip text-xs font-extrabold uppercase ${
                      result.passed
                        ? "bg-success text-white"
                        : "bg-brand text-white"
                    }`}
                  >
                    {result.passed ? "Lesson Lulus" : "Belum Lulus"}
                  </span>
                  <h1 className="font-display text-3xl md:text-4xl font-extrabold text-ink pt-1">
                    Skor Akhir: {result.score} / 100
                  </h1>
                  <p className="text-sm text-ink-soft">
                    {result.passed
                      ? "Bagus! Seluruh syarat penyelesaian lesson (nilai minimal 75) terpenuhi."
                      : "Nilai kelulusan minimal adalah 75. Kamu bisa langsung mengulang latihan tanpa batas percobaan."}
                  </p>
                </div>

                {result.xpAwarded > 0 ? (
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <Award className="w-5 h-5 text-accent-lip" aria-hidden="true" />
                    <XpBadge amount={result.xpAwarded} />
                    <span className="text-xs font-bold text-ink">
                      ditambahkan ke profilmu!
                    </span>
                  </div>
                ) : null}

                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  {!result.passed ? (
                    <Button variant="primary" onClick={handleRetryExercises}>
                      <RotateCcw className="w-4 h-4" aria-hidden="true" />
                      Ulangi Latihan Sekarang
                    </Button>
                  ) : null}
                  <Link
                    href={exitHref}
                    className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-control bg-surface border-2 border-border-control text-ink font-bold text-sm hover:bg-surface-soft tactile-btn tactile-neutral"
                  >
                    Kembali ke Learning Path
                  </Link>
                </div>
              </div>

              {/* Umpan Balik Tiap Soal */}
              {result.feedbacks.length > 0 ? (
                <div className="space-y-3">
                  <h2 className="font-display text-lg font-bold text-ink">
                    Pembahasan Jawaban
                  </h2>
                  {result.feedbacks.map((fb, i) => (
                    <div
                      key={fb.questionId}
                      className={`rounded-card p-4 border ${
                        fb.isCorrect
                          ? "bg-success-tint border-success/30"
                          : "bg-brand-tint border-brand/30"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold uppercase text-ink">
                          Soal #{i + 1}
                        </span>
                        <span
                          className={`text-xs font-extrabold ${
                            fb.isCorrect ? "text-success" : "text-brand"
                          }`}
                        >
                          {fb.isCorrect ? "Benar" : "Kurang Tepat"} (
                          {fb.earnedPoints}/{fb.maxPoints} poin)
                        </span>
                      </div>
                      <p className="text-sm font-bold text-ink mt-1">
                        Kunci: {fb.correctSummary}
                      </p>
                      {fb.explanation ? (
                        <p className="text-xs text-ink-soft mt-1">
                          {fb.explanation}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            /* LANGKAH AKTIVITAS: MATERI ATAU LATIHAN */
            <div className="space-y-6">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-chip bg-surface-highlight border border-border-subtle text-xs font-extrabold text-brand">
                  <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                  {currentItem.activity.activityType === "material"
                    ? "Materi Singkat"
                    : "Latihan Interaktif"}
                </span>
                <h1 className="font-display text-2xl md:text-3xl font-extrabold text-ink">
                  {currentItem.activity.title}
                </h1>
                <p className="text-sm text-ink-soft">
                  {currentItem.activity.instruction}
                </p>
              </div>

              {errorMessage ? (
                <div
                  role="alert"
                  className="p-3.5 rounded-control bg-brand-tint border border-brand/40 text-sm font-semibold text-brand"
                >
                  {errorMessage}
                </div>
              ) : null}

              {currentItem.activity.activityType === "material" &&
              currentItem.material ? (
                <div className="space-y-5">
                  <div className="bg-surface border border-border-subtle rounded-panel p-5 md:p-6 space-y-3 shadow-(--shadow-focal)">
                    <p className="text-base text-ink leading-relaxed">
                      {currentItem.material.data.content}
                    </p>
                    {currentItem.material.data.explanation ? (
                      <div className="bg-surface-soft border border-border-subtle rounded-control p-3.5 text-sm text-ink-soft">
                        <strong className="text-ink">Catatan: </strong>
                        {currentItem.material.data.explanation}
                      </div>
                    ) : null}
                  </div>

                  {currentItem.material.vocabularies.length > 0 ? (
                    <div className="space-y-2.5">
                      <h2 className="font-display text-base font-bold text-ink">
                        Kosakata Bahasa Pasan
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {currentItem.material.vocabularies.map((voc) => (
                          <div
                            key={voc.id}
                            className="bg-surface border border-border-subtle rounded-card p-4 space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-display text-lg font-extrabold text-ink">
                                {voc.pasanWord}
                              </span>
                              <span className="text-[11px] font-bold px-2 py-0.5 rounded-chip bg-surface-soft text-ink-soft">
                                {voc.category}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-ink-soft">
                              {voc.indonesianMeaning}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {currentItem.material.examples.length > 0 ? (
                    <div className="space-y-2.5">
                      <h2 className="font-display text-base font-bold text-ink">
                        Contoh Penggunaan
                      </h2>
                      <div className="space-y-2">
                        {currentItem.material.examples.map((ex) => (
                          <div
                            key={ex.id}
                            className="bg-surface-highlight border border-border-subtle rounded-card p-4"
                          >
                            <p className="font-bold text-ink text-base">
                              {ex.pasanText}
                            </p>
                            <p className="text-sm text-ink-soft mt-0.5">
                              {ex.indonesianTranslation}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    {stepIndex > 0 ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setStepIndex(stepIndex - 1)}
                      >
                        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                        Sebelumnya
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="success"
                      className="flex-1"
                      disabled={isPending}
                      onClick={handleMarkMaterialAndNext}
                    >
                      {isPending
                        ? "Menyimpan..."
                        : stepIndex < totalSteps - 1
                          ? "Tandai Selesai & Lanjut"
                          : "Selesaikan Lesson"}
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              ) : (
                /* AKTIVITAS LATIHAN */
                <div className="space-y-6">
                  {currentItem.questions.map((q, qIdx) => (
                    <div
                      key={q.id}
                      className="bg-surface border border-border-subtle rounded-panel p-5 md:p-6 space-y-4 shadow-(--shadow-focal)"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold uppercase tracking-wide text-brand">
                          Pertanyaan {qIdx + 1} dari{" "}
                          {currentItem.questions.length}
                        </span>
                        <span className="text-xs font-bold text-ink-soft">
                          {q.points} poin
                        </span>
                      </div>
                      <h2 className="font-display text-lg font-bold text-ink">
                        {q.questionText}
                      </h2>
                      <QuestionWidget
                        question={q}
                        value={responses[q.id]}
                        onChange={(nextVal) =>
                          setResponses((prev) => ({ ...prev, [q.id]: nextVal }))
                        }
                      />
                    </div>
                  ))}

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    {stepIndex > 0 ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setStepIndex(stepIndex - 1)}
                      >
                        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                        Sebelumnya
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="primary"
                      className="flex-1"
                      disabled={isPending}
                      onClick={handleSubmitExercises}
                    >
                      {isPending
                        ? "Menilai Jawaban..."
                        : stepIndex < totalSteps - 1
                          ? "Simpan & Lanjut"
                          : "Kirim & Lihat Hasil"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
