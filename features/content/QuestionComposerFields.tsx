"use client";

import { useState } from "react";
import type { QuestionType } from "@/types/pasanku";
import { QUESTION_TYPE_LABELS } from "@/lib/data/question-builder";

export function QuestionComposerFields({
  disabled = false,
  defaultType = "multiple_choice_pasan_to_id",
}: {
  disabled?: boolean;
  defaultType?: QuestionType;
}) {
  const [questionType, setQuestionType] = useState<QuestionType>(defaultType);

  const isMatching = questionType === "matching";
  const isFillBlank = questionType === "fill_blank";
  const isMc =
    questionType === "multiple_choice_pasan_to_id" ||
    questionType === "multiple_choice_id_to_pasan";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="sm:col-span-2 space-y-1">
          <label className="block text-[11px] font-extrabold uppercase text-ink-soft">
            Bentuk Soal
          </label>
          <select
            name="questionType"
            value={questionType}
            disabled={disabled}
            onChange={(e) => setQuestionType(e.target.value as QuestionType)}
            className="w-full h-10 px-3 rounded-control border border-border-control bg-canvas text-xs font-bold text-ink"
          >
            {(
              Object.entries(QUESTION_TYPE_LABELS) as Array<
                [QuestionType, string]
              >
            ).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-extrabold uppercase text-ink-soft">
            Bobot Poin
          </label>
          <input
            name="points"
            type="number"
            min={1}
            max={100}
            key={questionType}
            defaultValue={isMatching ? 15 : 10}
            disabled={disabled}
            className="w-full h-10 px-3 rounded-control border border-border-control bg-canvas text-xs font-bold text-ink"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-[11px] font-extrabold uppercase text-ink-soft">
          Pertanyaan / Instruksi Soal
        </label>
        <input
          name="questionText"
          required
          disabled={disabled}
          placeholder={
            isMatching
              ? "Contoh: Cocokkan kata Bahasa Pasan dengan artinya."
              : isFillBlank
                ? "Contoh: Lengkapi ungkapan berikut dengan kata yang tepat."
                : "Tuliskan pertanyaan soal..."
          }
          className="w-full h-10 px-3 rounded-control border border-border-control bg-canvas text-xs text-ink"
        />
      </div>

      {isMc ? (
        <div className="space-y-1">
          <label className="block text-[11px] font-extrabold uppercase text-ink-soft">
            Kata / Ungkapan Sorotan (Opsional)
          </label>
          <input
            name="promptWord"
            disabled={disabled}
            placeholder="Contoh: Tabea"
            className="w-full h-10 px-3 rounded-control border border-border-control bg-canvas text-xs text-ink"
          />
        </div>
      ) : null}

      {isFillBlank ? (
        <div className="p-3 rounded-control bg-surface-soft border border-border-subtle space-y-2.5">
          <p className="text-[11px] font-extrabold uppercase text-brand">
            Susunan Kalimat Rumpang
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              name="sentenceBefore"
              disabled={disabled}
              placeholder="Teks sebelum bagian kosong (cth: Tabea,)"
              className="h-10 px-3 rounded-control border border-border-control bg-surface text-xs text-ink"
            />
            <input
              name="sentenceAfter"
              disabled={disabled}
              placeholder="Teks sesudah bagian kosong (cth: ko hari ini?)"
              className="h-10 px-3 rounded-control border border-border-control bg-surface text-xs text-ink"
            />
          </div>
          <input
            name="translationHint"
            required
            disabled={disabled}
            placeholder="Petunjuk arti Indonesia (cth: Halo, bagaimana kabarmu?)"
            className="w-full h-10 px-3 rounded-control border border-border-control bg-surface text-xs text-ink"
          />
        </div>
      ) : null}

      {isMatching ? (
        <div className="p-3 rounded-control bg-surface-soft border border-border-subtle space-y-2">
          <p className="text-[11px] font-extrabold uppercase text-brand">
            Pasangan Kata Pasan (Kiri) dan Arti (Kanan)
          </p>
          <p className="text-[11px] text-ink-soft">
            Minimal 2 pasangan wajib diisi (pasangan #3 dan #4 opsional). Posisi
            kanan akan diacak otomatis saat tampil ke Learner.
          </p>
          {[1, 2, 3, 4].map((num) => (
            <div key={num} className="grid grid-cols-2 gap-2">
              <input
                name={`pair${num}Left`}
                required={num <= 2}
                disabled={disabled}
                placeholder={`Kiri #${num} (Bahasa Pasan)`}
                className="h-10 px-2.5 rounded-control border border-border-control bg-surface text-xs text-ink"
              />
              <input
                name={`pair${num}Right`}
                required={num <= 2}
                disabled={disabled}
                placeholder={`Kanan #${num} (Arti Indonesia)`}
                className="h-10 px-2.5 rounded-control border border-border-control bg-surface text-xs text-ink"
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <input
              name="optionA"
              required
              disabled={disabled}
              placeholder="Pilihan A (Wajib)"
              className="h-10 px-2.5 rounded-control border border-border-control bg-canvas text-xs text-ink"
            />
            <input
              name="optionB"
              required
              disabled={disabled}
              placeholder="Pilihan B (Wajib)"
              className="h-10 px-2.5 rounded-control border border-border-control bg-canvas text-xs text-ink"
            />
            <input
              name="optionC"
              required
              disabled={disabled}
              placeholder="Pilihan C (Wajib)"
              className="h-10 px-2.5 rounded-control border border-border-control bg-canvas text-xs text-ink"
            />
            <input
              name="optionD"
              disabled={disabled}
              placeholder="Pilihan D (Opsional)"
              className="h-10 px-2.5 rounded-control border border-border-control bg-canvas text-xs text-ink"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-extrabold uppercase text-ink-soft">
              Kunci Jawaban Benar
            </label>
            <select
              name="correctOption"
              disabled={disabled}
              className="w-full h-10 px-3 rounded-control border border-border-control bg-canvas text-xs font-bold text-ink"
            >
              <option value="A">Opsi A</option>
              <option value="B">Opsi B</option>
              <option value="C">Opsi C</option>
              <option value="D">Opsi D</option>
            </select>
          </div>
        </div>
      )}

      <input
        name="explanation"
        disabled={disabled}
        placeholder="Pembahasan jawaban singkat (tampil setelah evaluasi)..."
        className="w-full h-10 px-3 rounded-control border border-border-control bg-canvas text-xs text-ink"
      />
    </div>
  );
}
