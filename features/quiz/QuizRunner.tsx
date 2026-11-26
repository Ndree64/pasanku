"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Eye,
  Trophy,
  Unlock,
  X,
  XCircle,
} from "lucide-react";
import type { QuestionResponseData } from "@/types/pasanku";
import type {
  QuizEvaluationResult,
  QuizRunnerPayload,
} from "@/lib/data/repository";
import { submitQuizEvaluationAction } from "@/actions/quiz";
import { Button, ProgressBar, XpBadge } from "@/components/ui/Primitives";
import { QuestionWidget } from "@/features/learning/QuestionWidget";

export function QuizRunner({ payload }: { payload: QuizRunnerPayload }) {
  const { quiz, unit, questions, isPreview } = payload;
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<
    Record<string, QuestionResponseData>
  >({});
  const [result, setResult] = useState<QuizEvaluationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const exitHref = isPreview ? "/preview" : "/learner";
  const currentQ = questions[currentIdx];

  const isQuestionAnswered = (qId: string): boolean => {
    const r = responses[qId];
    if (!r) return false;
    if ("pairs" in r) return Object.keys(r.pairs).length > 0;
    return Boolean(r.selectedOption);
  };

  const answeredCount = questions.filter((q) => isQuestionAnswered(q.id)).length;

  const handleSubmitQuiz = () => {
    setErrorMsg(null);
    if (answeredCount < questions.length) {
      setErrorMsg(
        `Masih ada ${questions.length - answeredCount} soal yang belum dijawab.`
      );
      return;
    }

    startTransition(async () => {
      try {
        const res = await submitQuizEvaluationAction({
          unitId: unit.id,
          responses,
          isPreview,
        });
        setResult(res);
      } catch {
        setErrorMsg("Gagal memeriksa jawaban quiz. Coba ulangi.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      {isPreview ? (
        <div className="bg-accent-tint border-b border-accent-border px-4 py-2.5">
          <div className="max-w-[960px] mx-auto flex items-center justify-between text-xs font-bold text-ink">
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-accent-lip" aria-hidden="true" />
              Mode Pratinjau Quiz Unit: hasil tidak dicatat ke data Learner.
            </span>
            <Link href="/preview" className="underline text-brand">
              Keluar Pratinjau
            </Link>
          </div>
        </div>
      ) : null}

      <header className="bg-surface border-b border-border-subtle px-4 py-3">
        <div className="max-w-[960px] mx-auto flex items-center gap-4">
          <Link
            href={exitHref}
            aria-label="Keluar dari quiz"
            className="w-10 h-10 rounded-control border border-border-control flex items-center justify-center text-ink-soft hover:bg-surface-soft shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </Link>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-ink-soft">
              <span className="truncate">{quiz.title}</span>
              <span className="shrink-0 ml-2">
                {result
                  ? "Evaluasi Selesai"
                  : `Soal ${currentIdx + 1} / ${questions.length}`}
              </span>
            </div>
            <ProgressBar
              value={result ? questions.length : currentIdx + 1}
              max={Math.max(1, questions.length)}
              color="accent"
            />
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 md:py-10">
        <div className="max-w-[960px] mx-auto">
          {result ? (
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
                    <Trophy
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
                    {result.passed
                      ? "Quiz Lulus (>= 75)"
                      : "Belum Lulus (< 75)"}
                  </span>
                  <h1 className="font-display text-3xl md:text-4xl font-extrabold text-ink pt-1">
                    Nilai Quiz: {result.score} / 100
                  </h1>
                  <p className="text-sm text-ink-soft max-w-lg mx-auto">
                    {result.passed
                      ? "Selamat! Kamu menguasai materi unit ini dengan baik."
                      : "Nilai belum mencapai 75. Sistem menganalisis kesalahanmu dan merekomendasikan lesson prioritas di bawah ini."}
                  </p>
                </div>

                {result.xpAwarded > 0 ? (
                  <div className="flex items-center justify-center gap-2">
                    <Award className="w-5 h-5 text-accent-lip" aria-hidden="true" />
                    <XpBadge amount={result.xpAwarded} />
                  </div>
                ) : null}

                {result.unlockedUnitTitle ? (
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-control bg-surface border border-success/40 text-sm font-bold text-success">
                    <Unlock className="w-4 h-4" aria-hidden="true" />
                    Terbuka: {result.unlockedUnitTitle}
                  </div>
                ) : null}
              </div>

              {/* Rekomendasi Remedial Adaptif jika Belum Lulus */}
              {!result.passed && result.recommendations.length > 0 ? (
                <div className="bg-accent-tint border-2 border-accent-border rounded-panel p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className="w-5 h-5 text-accent-lip shrink-0 mt-0.5"
                      aria-hidden="true"
                    />
                    <div>
                      <h2 className="font-display text-lg font-extrabold text-ink">
                        Rekomendasi Remedial Adaptif (Maks 3 Lesson)
                      </h2>
                      <p className="text-sm text-ink-soft">
                        {isPreview
                          ? "Simulasi analisis kesalahan (progres pratinjau tidak disimpan)."
                          : "Selesaikan seluruh lesson di bawah ini agar dapat mengulang Quiz Unit."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {result.recommendations.map((rec) => (
                      <div
                        key={rec.lessonId}
                        className="bg-surface border border-border-subtle rounded-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <span className="text-xs font-extrabold text-brand">
                            Prioritas #{rec.priorityOrder} - {rec.errorCount}{" "}
                            kesalahan pada quiz
                          </span>
                          <p className="font-bold text-ink text-base">
                            {rec.lessonTitle}
                          </p>
                        </div>
                        {!isPreview ? (
                          <Link
                            href="/learner"
                            className="inline-flex items-center justify-center min-h-[42px] px-4 rounded-control bg-accent text-ink border border-accent-border font-extrabold text-xs tactile-btn tactile-accent shrink-0"
                          >
                            Buka di Learning Path
                          </Link>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="flex justify-center">
                <Link
                  href={exitHref}
                  className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-control bg-brand text-white font-bold text-sm tactile-btn tactile-brand"
                >
                  Kembali ke Learning Path
                </Link>
              </div>

              {/* Ringkasan Jawaban */}
              <div className="space-y-2.5 pt-2">
                <h2 className="font-display text-lg font-bold text-ink">
                  Ringkasan Per Soal
                </h2>
                <div className="space-y-2">
                  {result.feedbacks.map((fb, idx) => (
                    <div
                      key={fb.questionId}
                      className={`rounded-card p-4 border flex items-start gap-3 ${
                        fb.isCorrect
                          ? "bg-success-tint border-success/30"
                          : "bg-brand-tint border-brand/30"
                      }`}
                    >
                      {fb.isCorrect ? (
                        <CheckCircle2
                          className="w-5 h-5 text-success shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      ) : (
                        <XCircle
                          className="w-5 h-5 text-brand shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                      )}
                      <div className="space-y-0.5 text-sm">
                        <p className="font-bold text-ink">
                          Soal {idx + 1} ({fb.primaryLessonTitle})
                        </p>
                        <p className="text-ink-soft">
                          Kunci: <strong className="text-ink">{fb.correctSummary}</strong>
                        </p>
                        {fb.explanation ? (
                          <p className="text-xs text-ink-soft">
                            {fb.explanation}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : currentQ ? (
            <div className="space-y-6">
              {/* Mini Navigator Nomor Soal */}
              <div className="flex flex-wrap gap-1.5">
                {questions.map((q, idx) => {
                  const answered = isQuestionAnswered(q.id);
                  const active = idx === currentIdx;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIdx(idx)}
                      className={`w-9 h-9 rounded-chip text-xs font-extrabold border cursor-pointer ${
                        active
                          ? "bg-brand text-white border-brand-lip"
                          : answered
                            ? "bg-success-tint text-success border-success/40"
                            : "bg-surface text-ink-soft border-border-control"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {errorMsg ? (
                <div
                  role="alert"
                  className="p-3.5 rounded-control bg-brand-tint border border-brand/40 text-sm font-semibold text-brand"
                >
                  {errorMsg}
                </div>
              ) : null}

              <div className="bg-surface border border-border-subtle rounded-panel p-5 md:p-6 space-y-4 shadow-(--shadow-focal)">
                <div className="flex items-center justify-between text-xs font-bold text-ink-soft">
                  <span className="text-brand uppercase font-extrabold">
                    Soal {currentIdx + 1} dari {questions.length}
                  </span>
                  <span>
                    Terjawab: {answeredCount}/{questions.length}
                  </span>
                </div>

                <h1 className="font-display text-lg md:text-xl font-bold text-ink">
                  {currentQ.questionText}
                </h1>

                <QuestionWidget
                  question={currentQ}
                  value={responses[currentQ.id]}
                  onChange={(val) =>
                    setResponses((prev) => ({ ...prev, [currentQ.id]: val }))
                  }
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  Sebelumnya
                </Button>

                {currentIdx < questions.length - 1 ? (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() =>
                      setCurrentIdx((i) =>
                        Math.min(questions.length - 1, i + 1)
                      )
                    }
                  >
                    Soal Berikutnya
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="success"
                    disabled={isPending}
                    onClick={handleSubmitQuiz}
                  >
                    {isPending ? "Menilai Quiz..." : "Kumpulkan Quiz"}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-soft">
              Belum ada soal pada Quiz Unit ini.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
