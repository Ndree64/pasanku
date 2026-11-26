"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Edit3,
  Eye,
  Info,
  KeyRound,
} from "lucide-react";
import type { AnswerKey } from "@/types/pasanku";
import { submitValidationDecisionAction } from "@/actions/validation";
import { Button, Card, ContentStatusBadge } from "@/components/ui/Primitives";
import type { getPrivilegedContentDetail } from "@/lib/data/repository";

type DetailPayload = NonNullable<ReturnType<typeof getPrivilegedContentDetail>>;

function formatAnswerKey(key: AnswerKey | null): string {
  if (!key) return "Belum diatur";
  if ("correctOption" in key) return `Opsi ${key.correctOption}`;
  if ("pairs" in key) {
    return Object.entries(key.pairs)
      .map(([l, r]) => `${l} -> ${r}`)
      .join(", ");
  }
  return "-";
}

export function ReviewDetailClient({
  detail,
  reviewId,
}: {
  detail: DetailPayload;
  reviewId?: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"materi" | "soal">("materi");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const latestReview =
    (reviewId
      ? detail.reviews.find((r) => r.id === reviewId)
      : detail.reviews.find((r) => r.status === "pending")) ??
    detail.reviews[0] ??
    null;

  const status =
    detail.type === "lesson" ? detail.lesson.status : detail.quiz.status;
  const title =
    detail.type === "lesson" ? detail.lesson.title : detail.quiz.title;
  const previewHref =
    detail.type === "lesson"
      ? `/learner/lessons/${detail.lesson.id}?mode=preview`
      : `/learner/quizzes/${detail.quiz.unitId}?mode=preview`;

  const handleDecision = (decision: "approved" | "changes_requested") => {
    setFeedback(null);
    if (!latestReview) {
      setFeedback({
        type: "error",
        text: "Tidak ada data pengajuan review aktif untuk item ini.",
      });
      return;
    }
    startTransition(async () => {
      const res = await submitValidationDecisionAction({
        reviewId: latestReview.id,
        decision,
        note,
      });
      if (!res.ok) {
        setFeedback({
          type: "error",
          text: res.error ?? "Gagal menyimpan hasil pemeriksaan.",
        });
      } else {
        setFeedback({
          type: "success",
          text:
            decision === "approved"
              ? "Konten disetujui. Admin kini dapat menerbitkan konten ini."
              : "Permintaan revisi dikirim beserta catatan ke Admin.",
        });
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <ContentStatusBadge status={status} />
            <span className="text-xs font-bold text-ink-soft">
              {detail.unit ? `Unit ${detail.unit.orderNumber}: ${detail.unit.title}` : ""}
            </span>
          </div>
          <h1 className="font-display text-2xl font-extrabold text-ink">
            {title}
          </h1>
        </div>

        <Link
          href={previewHref}
          className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-control bg-accent-tint border border-accent-border text-ink text-xs font-extrabold shrink-0"
        >
          <Eye className="w-4 h-4" aria-hidden="true" />
          Pratinjau Tampilan Learner
        </Link>
      </div>

      {/* Info Pembatasan Peran (FR-VALID-008) */}
      <div className="bg-surface-highlight border border-border-subtle rounded-card p-4 flex items-start gap-3 text-xs text-ink">
        <Info className="w-4 h-4 text-brand shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          <strong>Hak Akses Validator:</strong> Periksa keakuratan Bahasa
          Pasan, arti Indonesia, contoh kalimat, soal, dan kunci jawaban.
          Validator hanya menyetujui atau meminta revisi; penerbitan konten
          dilakukan oleh Admin.
        </p>
      </div>

      {/* Tabs Materi vs Soal & Kunci Jawaban (MV02 / MV02B) */}
      <div className="flex gap-2 border-b border-border-subtle pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("materi")}
          className={`min-h-[42px] px-4 rounded-chip border text-xs font-extrabold cursor-pointer ${
            activeTab === "materi"
              ? "bg-brand text-white border-brand-lip"
              : "bg-surface text-ink-soft border-border-control"
          }`}
        >
          {detail.type === "lesson"
            ? "Materi & Kosakata"
            : "Ringkasan Cakupan Quiz"}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("soal")}
          className={`min-h-[42px] px-4 rounded-chip border text-xs font-extrabold cursor-pointer ${
            activeTab === "soal"
              ? "bg-brand text-white border-brand-lip"
              : "bg-surface text-ink-soft border-border-control"
          }`}
        >
          Soal &amp; Kunci Jawaban
        </button>
      </div>

      {detail.type === "lesson" ? (
        activeTab === "materi" ? (
          <div className="space-y-4">
            {detail.activities
              .filter((a) => a.activity.activityType === "material")
              .map((item) => (
                <Card key={item.activity.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold uppercase text-brand">
                      Urutan #{item.activity.orderNumber} · Materi
                    </span>
                  </div>
                  <h2 className="font-display text-lg font-bold text-ink">
                    {item.activity.title}
                  </h2>
                  {item.material ? (
                    <>
                      <p className="text-sm text-ink leading-relaxed">
                        {item.material.content}
                      </p>
                      <p className="text-xs text-ink-soft bg-surface-soft p-3 rounded-control">
                        <strong>Penjelasan:</strong> {item.material.explanation}
                      </p>
                    </>
                  ) : null}
                  {item.vocabularies.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {item.vocabularies.map((v) => (
                        <div
                          key={v.id}
                          className="p-3 rounded-control bg-surface-soft border border-border-subtle text-xs"
                        >
                          <p className="font-extrabold text-ink text-sm">
                            {v.pasanWord}
                          </p>
                          <p className="text-ink-soft">{v.indonesianMeaning}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {item.examples.length > 0 ? (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-xs font-bold text-ink-soft">
                        Contoh Penggunaan:
                      </p>
                      {item.examples.map((ex) => (
                        <div
                          key={ex.id}
                          className="p-2.5 rounded-chip bg-surface-highlight text-xs"
                        >
                          <p className="font-bold text-ink">{ex.pasanText}</p>
                          <p className="text-ink-soft">
                            {ex.indonesianTranslation}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </Card>
              ))}
          </div>
        ) : (
          <div className="space-y-4">
            {detail.activities
              .filter((a) => a.activity.activityType === "exercise")
              .flatMap((a) => a.questions)
              .map(({ question, answerKey }, idx) => (
                <Card key={question.id} className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-brand uppercase">
                      Soal Latihan #{idx + 1} · {question.questionType}
                    </span>
                    <span className="font-bold text-ink-soft">
                      Bobot {question.points}
                    </span>
                  </div>
                  <p className="font-bold text-ink text-sm">
                    {question.questionText}
                  </p>
                  {"options" in question.questionData ? (
                    <ul className="text-xs text-ink-soft space-y-1 pl-4 list-disc">
                      {question.questionData.options.map((o) => (
                        <li key={o.id}>
                          <strong>{o.id}.</strong> {o.label}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <div className="flex items-center gap-2 p-2.5 rounded-control bg-success-tint border border-success/30 text-xs font-bold text-success">
                    <KeyRound className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Kunci Jawaban: {formatAnswerKey(answerKey)}</span>
                  </div>
                  {question.explanation ? (
                    <p className="text-xs text-ink-soft">
                      <strong>Pembahasan:</strong> {question.explanation}
                    </p>
                  ) : null}
                </Card>
              ))}
          </div>
        )
      ) : activeTab === "materi" ? (
        <Card className="space-y-4">
          <h2 className="font-display text-lg font-bold text-ink">
            Informasi Paket Quiz Unit
          </h2>
          <p className="text-sm text-ink-soft">{detail.quiz.description}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-control bg-surface-soft border border-border-subtle">
              <p className="text-ink-soft">Jumlah Soal</p>
              <p className="font-display text-lg font-extrabold text-ink">
                {detail.questions.length} Soal (Syarat 15-20)
              </p>
            </div>
            <div className="p-3 rounded-control bg-surface-soft border border-border-subtle">
              <p className="text-ink-soft">Ambang Lulus</p>
              <p className="font-display text-lg font-extrabold text-ink">
                {detail.quiz.passingScore}
              </p>
            </div>
            <div className="p-3 rounded-control bg-surface-soft border border-border-subtle">
              <p className="text-ink-soft">Versi Konten</p>
              <p className="font-display text-lg font-extrabold text-ink">
                v{detail.quiz.contentVersion}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {detail.questions.map(
            ({ question, answerKey, primaryLessonTitle }, idx) => (
              <Card key={question.id} className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-extrabold text-brand">
                    Soal Quiz #{idx + 1}
                  </span>
                  <span className="px-2 py-0.5 rounded-chip bg-surface-soft border border-border-subtle font-bold text-ink-soft">
                    Sumber Lesson: {primaryLessonTitle}
                  </span>
                </div>
                <p className="font-bold text-sm text-ink">
                  {question.questionText}
                </p>
                <div className="flex items-center gap-2 p-2.5 rounded-control bg-success-tint border border-success/30 text-xs font-bold text-success">
                  <KeyRound className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Kunci: {formatAnswerKey(answerKey)}</span>
                </div>
              </Card>
            )
          )}
        </div>
      )}

      {/* Panel Keputusan Validator */}
      <Card focal className="space-y-4">
        <h2 className="font-display text-lg font-extrabold text-ink">
          Keputusan Pemeriksaan Validator
        </h2>

        {feedback ? (
          <div
            role="status"
            className={`p-3.5 rounded-control border flex items-start gap-2.5 text-sm ${
              feedback.type === "success"
                ? "bg-success-tint border-success/40 text-success"
                : "bg-brand-tint border-brand/40 text-brand"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <span>{feedback.text}</span>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label
            htmlFor="review-note"
            className="block text-xs font-extrabold uppercase tracking-wider text-ink-soft"
          >
            Catatan Validasi (Wajib diisi bila meminta revisi)
          </label>
          <textarea
            id="review-note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tuliskan masukan ketepatan kosakata, contoh kalimat, atau kunci jawaban..."
            className="w-full p-3.5 rounded-control border border-border-control bg-canvas text-sm text-ink placeholder:text-ink-soft/60"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="success"
            className="flex-1"
            disabled={isPending}
            onClick={() => handleDecision("approved")}
          >
            <Check className="w-4 h-4" aria-hidden="true" />
            Setujui Konten
          </Button>
          <Button
            type="button"
            variant="primary"
            className="flex-1"
            disabled={isPending}
            onClick={() => handleDecision("changes_requested")}
          >
            <Edit3 className="w-4 h-4" aria-hidden="true" />
            Minta Revisi
          </Button>
        </div>
      </Card>
    </div>
  );
}
