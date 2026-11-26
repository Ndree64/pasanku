import Link from "next/link";
import {
  AlertTriangle,
  BookOpen,
  Check,
  Lock,
  Play,
  RotateCcw,
  Star,
  Trophy,
} from "lucide-react";
import type { LearningPathPayload } from "@/lib/data/repository";
import { ContentStatusBadge } from "@/components/ui/Primitives";

const ZIGZAG_OFFSETS = [
  "translate-x-0",
  "translate-x-7 sm:translate-x-10",
  "translate-x-12 sm:translate-x-14",
  "translate-x-5 sm:translate-x-7",
  "-translate-x-6 sm:-translate-x-8",
];

export function LearningPathView({
  data,
  isPreview = false,
}: {
  data: LearningPathPayload;
  isPreview?: boolean;
}) {
  return (
    <div className="space-y-8">
      {data.units.map((unitItem) => {
        const { unit, unlocked, lessons, quiz, quizUnlocked, quizPassed, latestQuizAttempt, pendingRemedials } =
          unitItem;

        return (
          <section
            key={unit.id}
            aria-labelledby={`unit-title-${unit.id}`}
            className="space-y-6"
          >
            {/* Unit Banner */}
            <div
              className={`rounded-panel p-5 border ${
                unlocked
                  ? "bg-brand text-white border-brand-lip shadow-(--shadow-focal)"
                  : "bg-surface-soft text-ink-soft border-border-subtle"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p
                    className={`text-xs font-extrabold uppercase tracking-wider ${
                      unlocked ? "text-accent-tint" : "text-ink-soft"
                    }`}
                  >
                    Unit {unit.orderNumber}
                  </p>
                  <h2
                    id={`unit-title-${unit.id}`}
                    className="font-display text-xl md:text-2xl font-extrabold"
                  >
                    {unit.title}
                  </h2>
                  <p
                    className={`text-sm ${
                      unlocked ? "text-white/90" : "text-ink-soft"
                    }`}
                  >
                    {unit.description}
                  </p>
                </div>

                <span
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-chip text-xs font-bold ${
                    quizPassed
                      ? "bg-success text-white"
                      : unlocked
                        ? "bg-white/15 text-white"
                        : "bg-locked text-ink-soft"
                  }`}
                >
                  {quizPassed ? (
                    <>
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      Lulus
                    </>
                  ) : unlocked ? (
                    <>
                      <Star className="w-3.5 h-3.5" aria-hidden="true" />
                      {isPreview ? "Pratinjau" : "Aktif"}
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" aria-hidden="true" />
                      Terkunci
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Vertical Zig-Zag Lesson Path */}
            <div className="flex flex-col items-center space-y-6 py-2">
              {lessons.length === 0 ? (
                <p className="text-sm text-ink-soft py-4">
                  Belum ada lesson berstatus yang cocok untuk filter ini.
                </p>
              ) : null}

              {lessons.map((item, idx) => {
                const offsetClass =
                  ZIGZAG_OFFSETS[idx % ZIGZAG_OFFSETS.length];
                const href = isPreview
                  ? `/learner/lessons/${item.lesson.id}?mode=preview`
                  : item.activeRemedialId
                    ? `/learner/lessons/${item.lesson.id}?mode=remedial&assignmentId=${item.activeRemedialId}`
                    : `/learner/lessons/${item.lesson.id}`;

                const isClickable = item.unlocked || isPreview;

                const nodeStyle =
                  item.status === "completed"
                    ? "w-[72px] h-[72px] bg-success text-white tactile-btn tactile-success"
                    : isClickable
                      ? "w-[82px] h-[82px] bg-accent text-ink border-2 border-accent-border tactile-btn tactile-accent"
                      : "w-[72px] h-[72px] bg-locked text-ink-soft border-2 border-border-control cursor-not-allowed";

                return (
                  <div
                    key={item.lesson.id}
                    className={`flex flex-col items-center text-center max-w-[230px] ${offsetClass}`}
                  >
                    {isClickable && item.status !== "completed" ? (
                      <span className="mb-2 px-3 py-0.5 rounded-chip bg-surface border border-accent-border text-ink text-[11px] font-extrabold uppercase tracking-wide shadow-xs">
                        {isPreview
                          ? "Buka"
                          : item.activeRemedialId
                            ? "Remedial"
                            : "Mulai"}
                      </span>
                    ) : null}

                    {isClickable ? (
                      <Link
                        href={href}
                        aria-label={`Lesson ${unit.orderNumber}.${item.lesson.orderNumber}: ${item.lesson.title}`}
                        className={`rounded-full flex items-center justify-center ${nodeStyle}`}
                      >
                        {item.status === "completed" ? (
                          <Check className="w-8 h-8 stroke-[3]" aria-hidden="true" />
                        ) : item.activeRemedialId ? (
                          <RotateCcw className="w-7 h-7" aria-hidden="true" />
                        ) : (
                          <Play className="w-7 h-7 fill-current ml-0.5" aria-hidden="true" />
                        )}
                      </Link>
                    ) : (
                      <div
                        aria-label={`Lesson ${unit.orderNumber}.${item.lesson.orderNumber} terkunci`}
                        className={`rounded-full flex items-center justify-center ${nodeStyle}`}
                      >
                        <Lock className="w-6 h-6" aria-hidden="true" />
                      </div>
                    )}

                    <p className="mt-2.5 text-xs font-extrabold text-ink-soft">
                      Lesson {unit.orderNumber}.{item.lesson.orderNumber}
                    </p>
                    <p className="text-sm font-bold text-ink leading-snug">
                      {item.lesson.title}
                    </p>

                    {item.status === "unpublished" && !isPreview ? (
                      <span className="mt-1 text-[11px] font-semibold text-ink-soft bg-surface-soft px-2 py-0.5 rounded-chip border border-border-subtle">
                        Segera hadir (dalam validasi)
                      </span>
                    ) : null}

                    {isPreview ? (
                      <div className="mt-1.5">
                        <ContentStatusBadge status={item.lesson.status} />
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {/* Quiz Unit Node */}
              {quiz ? (
                <div className="flex flex-col items-center text-center max-w-sm pt-2 w-full">
                  {quizUnlocked || isPreview ? (
                    <Link
                      href={`/learner/quizzes/${unit.id}${isPreview ? "?mode=preview" : ""}`}
                      aria-label={`Quiz Unit ${unit.orderNumber}: ${quiz.title}`}
                      className={`w-[84px] h-[84px] rounded-full flex items-center justify-center ${
                        quizPassed
                          ? "bg-success text-white tactile-btn tactile-success"
                          : "bg-accent text-ink border-2 border-accent-border tactile-btn tactile-accent"
                      }`}
                    >
                      <Trophy className="w-8 h-8" aria-hidden="true" />
                    </Link>
                  ) : (
                    <div
                      aria-label={`Quiz Unit ${unit.orderNumber} terkunci`}
                      className="w-[76px] h-[76px] rounded-full bg-locked text-ink-soft border-2 border-border-control flex items-center justify-center"
                    >
                      <Trophy className="w-7 h-7" aria-hidden="true" />
                    </div>
                  )}

                  <p className="mt-2.5 text-xs font-extrabold uppercase tracking-wide text-brand">
                    Quiz Unit {unit.orderNumber}
                  </p>
                  <p className="text-sm font-bold text-ink">{quiz.title}</p>
                  {isPreview ? (
                    <div className="mt-1.5">
                      <ContentStatusBadge status={quiz.status} />
                    </div>
                  ) : null}

                  {/* State Remedial Quiz Unit (tepat di bawah Quiz Unit) */}
                  {!isPreview && pendingRemedials.length > 0 ? (
                    <div className="mt-4 w-full text-left bg-accent-tint border-2 border-accent-border rounded-card p-4 space-y-3 shadow-(--shadow-focal)">
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle
                          className="w-5 h-5 text-accent-lip shrink-0 mt-0.5"
                          aria-hidden="true"
                        />
                        <div>
                          <p className="font-display font-extrabold text-sm text-ink">
                            Rekomendasi Remedial Diperlukan
                          </p>
                          <p className="text-xs text-ink-soft mt-0.5">
                            Skor Quiz terakhir:{" "}
                            <strong className="text-ink">
                              {latestQuizAttempt?.score ?? 0}
                            </strong>{" "}
                            (minimal 75). Selesaikan {pendingRemedials.length}{" "}
                            lesson berikut agar dapat mengulang Quiz Unit:
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {pendingRemedials.map((rem) => (
                          <div
                            key={rem.id}
                            className="bg-surface border border-border-subtle rounded-control p-3 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-brand">
                                Prioritas #{rem.priorityOrder} ({rem.errorCount}{" "}
                                salah)
                              </p>
                              <p className="text-sm font-bold text-ink truncate">
                                Lesson {unit.orderNumber}.{rem.lessonOrder}:{" "}
                                {rem.lessonTitle}
                              </p>
                            </div>
                            <Link
                              href={`/learner/lessons/${rem.lessonId}?mode=remedial&assignmentId=${rem.id}`}
                              className="shrink-0 inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-control bg-accent text-ink border border-accent-border font-extrabold text-xs tactile-btn tactile-accent"
                            >
                              <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                              Mulai Remedial
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}
