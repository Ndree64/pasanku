"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit3, Globe, Plus, Send } from "lucide-react";
import {
  createLessonAction,
  publishContentAction,
  submitForValidationAction,
} from "@/actions/content";
import type { getAdminUnitsOverview } from "@/lib/data/repository";
import { Button, Card, ContentStatusBadge } from "@/components/ui/Primitives";

type UnitsOverview = ReturnType<typeof getAdminUnitsOverview>;

export function UnitsManagerClient({
  overview,
}: {
  overview: UnitsOverview;
}) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleCreateLesson = (formData: FormData) => {
    setMsg(null);
    startTransition(async () => {
      const res = await createLessonAction(formData);
      if (!res.ok) {
        setMsg(res.error ?? "Gagal membuat lesson.");
      } else {
        setShowCreate(false);
        setMsg("Lesson baru berstatus Draf berhasil dibuat.");
        router.refresh();
      }
    });
  };

  const handleSubmitValidation = (lessonId: string) => {
    setMsg(null);
    startTransition(async () => {
      const res = await submitForValidationAction({
        type: "lesson",
        targetId: lessonId,
      });
      setMsg(
        res.ok
          ? "Konten diajukan ke antrean Validator."
          : res.error ?? "Gagal mengajukan."
      );
      router.refresh();
    });
  };

  const handlePublish = (lessonId: string) => {
    setMsg(null);
    startTransition(async () => {
      const res = await publishContentAction({
        type: "lesson",
        targetId: lessonId,
      });
      setMsg(
        res.ok
          ? "Lesson resmi diterbitkan untuk Learner."
          : res.error ?? "Gagal menerbitkan."
      );
      router.refresh();
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-extrabold text-ink">
            Manajemen Unit &amp; Lesson
          </h1>
          <p className="text-sm text-ink-soft">
            Kelola 5 unit kurikulum, susun materi lesson, ajukan validasi, dan
            terbitkan konten yang telah disetujui.
          </p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={() => setShowCreate((v) => !v)}
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Buat Lesson
        </Button>
      </div>

      {msg ? (
        <div
          role="status"
          className="p-3.5 rounded-control bg-accent-tint border border-accent-border text-sm font-bold text-ink"
        >
          {msg}
        </div>
      ) : null}

      {showCreate ? (
        <Card focal className="space-y-4">
          <h2 className="font-display text-lg font-bold text-ink">
            Tambah Lesson Baru
          </h2>
          <form action={handleCreateLesson} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="unitId"
                  className="text-xs font-extrabold uppercase text-ink-soft"
                >
                  Pilih Unit
                </label>
                <select
                  id="unitId"
                  name="unitId"
                  className="w-full h-11 px-3 rounded-control border border-border-control bg-canvas text-sm text-ink"
                >
                  {overview.map((item) => (
                    <option key={item.unit.id} value={item.unit.id}>
                      Unit {item.unit.orderNumber}: {item.unit.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label
                  htmlFor="lessonTitle"
                  className="text-xs font-extrabold uppercase text-ink-soft"
                >
                  Judul Lesson
                </label>
                <input
                  id="lessonTitle"
                  name="title"
                  required
                  placeholder="Contoh: Sapaan Sore Hari"
                  className="w-full h-11 px-3 rounded-control border border-border-control bg-canvas text-sm text-ink"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label
                htmlFor="lessonDesc"
                className="text-xs font-extrabold uppercase text-ink-soft"
              >
                Deskripsi Singkat
              </label>
              <input
                id="lessonDesc"
                name="description"
                placeholder="Ringkasan kompetensi lesson"
                className="w-full h-11 px-3 rounded-control border border-border-control bg-canvas text-sm text-ink"
              />
            </div>
            <div className="space-y-1">
              <label
                htmlFor="lessonObj"
                className="text-xs font-extrabold uppercase text-ink-soft"
              >
                Tujuan Pembelajaran
              </label>
              <input
                id="lessonObj"
                name="objective"
                placeholder="Contoh: Learner mampu menggunakan sapaan sore"
                className="w-full h-11 px-3 rounded-control border border-border-control bg-canvas text-sm text-ink"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowCreate(false)}
              >
                Batal
              </Button>
              <Button type="submit" variant="success" size="sm" disabled={isPending}>
                Simpan Lesson Draf
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <div className="space-y-5">
        {overview.map(({ unit, lessons, quiz }) => (
          <Card key={unit.id} className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border-subtle pb-3">
              <div>
                <p className="text-xs font-extrabold uppercase text-brand">
                  Unit {unit.orderNumber}
                </p>
                <h2 className="font-display text-lg font-extrabold text-ink">
                  {unit.title}
                </h2>
                <p className="text-xs text-ink-soft">{unit.description}</p>
              </div>
              {quiz ? <ContentStatusBadge status={quiz.status} /> : null}
            </div>

            <div className="divide-y divide-border-subtle">
              {lessons.map(({ lesson, activityCount }) => (
                <div
                  key={lesson.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <ContentStatusBadge status={lesson.status} />
                      <span className="text-xs font-bold text-ink-soft">
                        v{lesson.contentVersion} · {activityCount} aktivitas
                      </span>
                    </div>
                    <p className="font-bold text-sm text-ink">
                      {unit.orderNumber}.{lesson.orderNumber} {lesson.title}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Link
                      href={`/admin/lessons/${lesson.id}`}
                      className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-chip border border-border-control bg-surface-soft text-xs font-extrabold text-ink hover:bg-surface-highlight"
                    >
                      <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                      Builder
                    </Link>

                    {(lesson.status === "draft" ||
                      lesson.status === "changes_requested") ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleSubmitValidation(lesson.id)}
                        className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-chip bg-accent text-ink border border-accent-border text-xs font-extrabold cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" aria-hidden="true" />
                        Ajukan
                      </button>
                    ) : null}

                    {lesson.status === "approved" ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handlePublish(lesson.id)}
                        className="inline-flex items-center gap-1.5 min-h-[38px] px-3 rounded-chip bg-success text-white text-xs font-extrabold cursor-pointer"
                      >
                        <Globe className="w-3.5 h-3.5" aria-hidden="true" />
                        Terbitkan
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
