"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Eye,
  Globe,
  Info,
  KeyRound,
  Plus,
  Send,
  XCircle,
} from "lucide-react";
import {
  addExerciseActivityAction,
  addMaterialActivityAction,
  cancelValidationAction,
  moveActivityAction,
  publishContentAction,
  submitForValidationAction,
  updateLessonMetaAction,
  updateMaterialActivityAction,
} from "@/actions/content";
import {
  formatAnswerKeySummary,
  QUESTION_TYPE_LABELS,
} from "@/lib/data/question-builder";
import type { getPrivilegedContentDetail } from "@/lib/data/repository";
import { Button, Card, ContentStatusBadge } from "@/components/ui/Primitives";
import { QuestionComposerFields } from "@/features/content/QuestionComposerFields";

type LessonDetail = Extract<
  NonNullable<Awaited<ReturnType<typeof getPrivilegedContentDetail>>>,
  { type: "lesson" }
>;

export function LessonBuilderClient({ detail }: { detail: LessonDetail }) {
  const router = useRouter();
  const [tab, setTab] = useState<"edit" | "order">("edit");
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const { lesson, unit, activities, reviews } = detail;
  const isLockedReview = lesson.status === "pending_review";
  const latestReview = reviews[0] ?? null;

  const runAction = async (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string) => {
    setNotice(null);
    startTransition(async () => {
      const res = await fn();
      setNotice(res.ok ? okText : res.error ?? "Terjadi kesalahan.");
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      {/* Header & Aksi Workflow */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <ContentStatusBadge status={lesson.status} />
            <span className="text-xs font-extrabold text-ink-soft">
              Versi Konten v{lesson.contentVersion} ·{" "}
              {unit ? `Unit ${unit.orderNumber}.${lesson.orderNumber}` : ""}
            </span>
          </div>
          <h1 className="font-display text-2xl font-extrabold text-ink">
            {lesson.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/learner/lessons/${lesson.id}?mode=preview`}
            className="inline-flex items-center gap-1.5 min-h-[42px] px-3.5 rounded-control bg-accent-tint border border-accent-border text-ink text-xs font-extrabold"
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
            Pratinjau
          </Link>

          {lesson.status === "pending_review" ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isPending}
              onClick={() =>
                runAction(
                  () =>
                    cancelValidationAction({
                      type: "lesson",
                      targetId: lesson.id,
                    }),
                  "Pengajuan review dibatalkan. Lesson kembali menjadi Draf."
                )
              }
            >
              <XCircle className="w-4 h-4" aria-hidden="true" />
              Batalkan Pengajuan
            </Button>
          ) : null}

          {lesson.status === "draft" ||
          lesson.status === "changes_requested" ? (
            <Button
              type="button"
              variant="accent"
              size="sm"
              disabled={isPending}
              onClick={() =>
                runAction(
                  () =>
                    submitForValidationAction({
                      type: "lesson",
                      targetId: lesson.id,
                    }),
                  "Lesson dikirim ke antrean pemeriksaan Validator."
                )
              }
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              Ajukan Validasi
            </Button>
          ) : null}

          {lesson.status === "approved" ? (
            <Button
              type="button"
              variant="success"
              size="sm"
              disabled={isPending}
              onClick={() =>
                runAction(
                  () =>
                    publishContentAction({
                      type: "lesson",
                      targetId: lesson.id,
                    }),
                  "Lesson resmi diterbitkan kepada Learner!"
                )
              }
            >
              <Globe className="w-4 h-4" aria-hidden="true" />
              Terbitkan
            </Button>
          ) : null}
        </div>
      </div>

      {notice ? (
        <div
          role="status"
          className="p-3.5 rounded-control bg-accent-tint border border-accent-border text-sm font-bold text-ink"
        >
          {notice}
        </div>
      ) : null}

      {isLockedReview ? (
        <div className="p-4 rounded-card bg-accent-tint border border-accent-border flex items-start gap-2.5 text-xs text-ink">
          <Info className="w-4 h-4 text-accent-lip shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            Konten sedang <strong>Menunggu Review</strong> Validator sehingga
            terkunci dari perubahan. Gunakan tombol{" "}
            <strong>Batalkan Pengajuan</strong> di atas bila perlu merevisi
            sebelum diperiksa.
          </p>
        </div>
      ) : null}

      {lesson.status === "published" ? (
        <div className="p-4 rounded-card bg-surface-highlight border border-border-control flex items-start gap-2.5 text-xs text-ink">
          <AlertTriangle
            className="w-4 h-4 text-brand shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p>
            Lesson ini sudah <strong>Terbit</strong>. Jika Anda menyimpan
            perubahan baru, nomor versi naik otomatis ke{" "}
            <strong>v{lesson.contentVersion + 1}</strong>, status kembali ke
            Draf, dan harus divalidasi ulang sebelum terbit lagi.
          </p>
        </div>
      ) : null}

      {lesson.status === "changes_requested" && latestReview?.reviewNote ? (
        <div className="p-4 rounded-card bg-brand-tint border border-brand/40 text-xs text-ink space-y-1">
          <p className="font-extrabold text-brand uppercase">
            Catatan Revisi dari {latestReview.reviewedByName ?? "Validator"}:
          </p>
          <p className="font-semibold">{latestReview.reviewNote}</p>
        </div>
      ) : null}

      {/* Tabs Edit Materi vs Urutan Aktivitas (MA03 / MA03B) */}
      <div className="flex gap-2 border-b border-border-subtle pb-3">
        <button
          type="button"
          onClick={() => setTab("edit")}
          className={`min-h-[42px] px-4 rounded-chip border text-xs font-extrabold cursor-pointer ${
            tab === "edit"
              ? "bg-brand text-white border-brand-lip"
              : "bg-surface text-ink-soft border-border-control"
          }`}
        >
          Edit Materi &amp; Soal
        </button>
        <button
          type="button"
          onClick={() => setTab("order")}
          className={`min-h-[42px] px-4 rounded-chip border text-xs font-extrabold cursor-pointer ${
            tab === "order"
              ? "bg-brand text-white border-brand-lip"
              : "bg-surface text-ink-soft border-border-control"
          }`}
        >
          Urutan Aktivitas ({activities.length})
        </button>
      </div>

      {tab === "edit" ? (
        <div className="space-y-5">
          {/* Identitas Lesson */}
          <Card className="space-y-4">
            <h2 className="font-display text-lg font-bold text-ink">
              Identitas Lesson
            </h2>
            <form
              action={(fd) =>
                runAction(
                  () => updateLessonMetaAction(fd),
                  "Identitas lesson diperbarui."
                )
              }
              className="space-y-3"
            >
              <input type="hidden" name="lessonId" value={lesson.id} />
              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-ink-soft">
                  Judul Lesson
                </label>
                <input
                  name="title"
                  defaultValue={lesson.title}
                  disabled={isLockedReview}
                  className="w-full h-11 px-3 rounded-control border border-border-control bg-canvas text-sm text-ink disabled:opacity-60"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-ink-soft">
                  Deskripsi
                </label>
                <input
                  name="description"
                  defaultValue={lesson.description}
                  disabled={isLockedReview}
                  className="w-full h-11 px-3 rounded-control border border-border-control bg-canvas text-sm text-ink disabled:opacity-60"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase text-ink-soft">
                  Tujuan Pembelajaran
                </label>
                <input
                  name="objective"
                  defaultValue={lesson.objective}
                  disabled={isLockedReview}
                  className="w-full h-11 px-3 rounded-control border border-border-control bg-canvas text-sm text-ink disabled:opacity-60"
                />
              </div>
              <Button
                type="submit"
                variant="secondary"
                size="sm"
                disabled={isLockedReview || isPending}
              >
                Simpan Identitas
              </Button>
            </form>
          </Card>

          {/* Daftar Aktivitas Materi & Latihan */}
          {activities.map((item) => (
            <Card key={item.activity.id} className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold uppercase text-brand">
                  Aktivitas #{item.activity.orderNumber} ·{" "}
                  {item.activity.activityType === "material"
                    ? "Materi"
                    : "Latihan"}
                </span>
              </div>

              {item.activity.activityType === "material" && item.material ? (
                <form
                  action={(fd) =>
                    runAction(
                      () => updateMaterialActivityAction(fd),
                      `Materi "${item.activity.title}" disimpan.`
                    )
                  }
                  className="space-y-3"
                >
                  <input type="hidden" name="lessonId" value={lesson.id} />
                  <input
                    type="hidden"
                    name="activityId"
                    value={item.activity.id}
                  />
                  <input
                    name="title"
                    defaultValue={item.activity.title}
                    disabled={isLockedReview}
                    className="w-full h-11 px-3 rounded-control border border-border-control bg-canvas font-bold text-sm text-ink"
                  />
                  <textarea
                    name="content"
                    rows={3}
                    defaultValue={item.material.content}
                    disabled={isLockedReview}
                    className="w-full p-3 rounded-control border border-border-control bg-canvas text-sm text-ink"
                  />
                  <input
                    name="explanation"
                    defaultValue={item.material.explanation}
                    disabled={isLockedReview}
                    placeholder="Penjelasan singkat"
                    className="w-full h-11 px-3 rounded-control border border-border-control bg-canvas text-xs text-ink-soft"
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    size="sm"
                    disabled={isLockedReview || isPending}
                  >
                    Simpan Materi Ini
                  </Button>
                </form>
              ) : (
                <div className="space-y-2.5">
                  <p className="font-bold text-sm text-ink">
                    {item.activity.title} ({item.questions.length} soal)
                  </p>
                  {item.questions.map(({ question, answerKey }, qIdx) => (
                    <div
                      key={question.id}
                      className="p-3 rounded-control bg-surface-soft border border-border-subtle text-xs space-y-1"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-extrabold text-brand">
                          {QUESTION_TYPE_LABELS[question.questionType]}
                        </span>
                        <span className="font-bold text-ink-soft">
                          {question.points} poin
                        </span>
                      </div>
                      <p className="font-bold text-ink">
                        {qIdx + 1}. {question.questionText}
                      </p>
                      <p className="text-success font-bold flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        Kunci:{" "}
                        {formatAnswerKeySummary(
                          answerKey,
                          question.questionData
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        /* TAB URUTAN AKTIVITAS & TAMBAH (MA03B) */
        <div className="space-y-6">
          <Card className="space-y-3">
            <h2 className="font-display text-lg font-bold text-ink">
              Urutan Penyajian Materi &amp; Latihan
            </h2>
            <p className="text-xs text-ink-soft">
              Susun materi dan latihan secara bergantian sesuai kebutuhan
              kompetensi lesson ini.
            </p>

            <div className="space-y-2">
              {activities.map((item, idx) => (
                <div
                  key={item.activity.id}
                  className="p-3.5 rounded-control bg-surface-soft border border-border-subtle flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <span className="text-[11px] font-extrabold uppercase text-brand">
                      #{idx + 1} ·{" "}
                      {item.activity.activityType === "material"
                        ? "Materi"
                        : "Latihan"}
                    </span>
                    <p className="font-bold text-sm text-ink truncate">
                      {item.activity.title}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      disabled={isLockedReview || isPending || idx === 0}
                      onClick={() =>
                        runAction(
                          () =>
                            moveActivityAction({
                              lessonId: lesson.id,
                              activityId: item.activity.id,
                              direction: "up",
                            }),
                          "Urutan aktivitas dinaikkan."
                        )
                      }
                      aria-label="Naikkan urutan"
                      className="min-h-[38px] px-2.5 rounded-chip border border-border-control bg-surface text-xs font-bold text-ink disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                      Naik
                    </button>
                    <button
                      type="button"
                      disabled={
                        isLockedReview ||
                        isPending ||
                        idx === activities.length - 1
                      }
                      onClick={() =>
                        runAction(
                          () =>
                            moveActivityAction({
                              lessonId: lesson.id,
                              activityId: item.activity.id,
                              direction: "down",
                            }),
                          "Urutan aktivitas diturunkan."
                        )
                      }
                      aria-label="Turunkan urutan"
                      className="min-h-[38px] px-2.5 rounded-chip border border-border-control bg-surface text-xs font-bold text-ink disabled:opacity-40 cursor-pointer flex items-center gap-1"
                    >
                      <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                      Turun
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Form Tambah Materi */}
            <Card className="space-y-3">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-brand" aria-hidden="true" />
                Tambah Aktivitas Materi
              </h3>
              <form
                action={(fd) =>
                  runAction(
                    () => addMaterialActivityAction(fd),
                    "Aktivitas materi baru ditambahkan."
                  )
                }
                className="space-y-2.5"
              >
                <input type="hidden" name="lessonId" value={lesson.id} />
                <input
                  name="title"
                  required
                  disabled={isLockedReview}
                  placeholder="Judul bagian materi"
                  className="w-full h-11 px-3 rounded-control border border-border-control bg-canvas text-sm"
                />
                <textarea
                  name="content"
                  required
                  rows={3}
                  disabled={isLockedReview}
                  placeholder="Isi materi singkat Bahasa Pasan..."
                  className="w-full p-3 rounded-control border border-border-control bg-canvas text-sm"
                />
                <input
                  name="explanation"
                  disabled={isLockedReview}
                  placeholder="Catatan penjelasan tambahan"
                  className="w-full h-10 px-3 rounded-control border border-border-control bg-canvas text-xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    name="examplePasan"
                    disabled={isLockedReview}
                    placeholder="Contoh Bahasa Pasan"
                    className="w-full h-10 px-3 rounded-control border border-border-control bg-canvas text-xs"
                  />
                  <input
                    name="exampleTranslation"
                    disabled={isLockedReview}
                    placeholder="Arti Indonesia"
                    className="w-full h-10 px-3 rounded-control border border-border-control bg-canvas text-xs"
                  />
                </div>
                <Button
                  type="submit"
                  variant="success"
                  size="sm"
                  fullWidth
                  disabled={isLockedReview || isPending}
                >
                  + Tambah Materi
                </Button>
              </form>
            </Card>

            {/* Form Tambah Latihan */}
            <Card className="space-y-3">
              <h3 className="font-display text-base font-bold text-ink flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-brand" aria-hidden="true" />
                Tambah Soal / Aktivitas Latihan
              </h3>
              <form
                action={(fd) =>
                  runAction(
                    () => addExerciseActivityAction(fd),
                    "Soal latihan berhasil ditambahkan."
                  )
                }
                className="space-y-3"
              >
                <input type="hidden" name="lessonId" value={lesson.id} />

                <div className="space-y-1">
                  <label className="block text-[11px] font-extrabold uppercase text-ink-soft">
                    Target Aktivitas Latihan
                  </label>
                  <select
                    name="existingActivityId"
                    disabled={isLockedReview}
                    className="w-full h-10 px-3 rounded-control border border-border-control bg-canvas text-xs text-ink"
                  >
                    <option value="">
                      + Buat Aktivitas Latihan Baru
                    </option>
                    {activities
                      .filter((a) => a.activity.activityType === "exercise")
                      .map((a) => (
                        <option key={a.activity.id} value={a.activity.id}>
                          Tambahkan ke: #{a.activity.orderNumber}{" "}
                          {a.activity.title} ({a.questions.length} soal)
                        </option>
                      ))}
                  </select>
                </div>

                <input
                  name="title"
                  disabled={isLockedReview}
                  placeholder="Judul aktivitas baru (abaikan jika menambah ke aktivitas yang ada)"
                  className="w-full h-10 px-3 rounded-control border border-border-control bg-canvas text-xs text-ink"
                />

                <QuestionComposerFields disabled={isLockedReview} />

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  fullWidth
                  disabled={isLockedReview || isPending}
                >
                  + Tambah Soal Latihan
                </Button>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
