"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { PublicQuestion, QuestionResponseData } from "@/types/pasanku";

export function QuestionWidget({
  question,
  value,
  onChange,
  disabled = false,
}: {
  question: PublicQuestion;
  value: QuestionResponseData | undefined;
  onChange: (next: QuestionResponseData) => void;
  disabled?: boolean;
}) {
  const [selectedLeftId, setSelectedLeftId] = useState<string | null>(null);
  const data = question.questionData;

  if (data.type === "matching") {
    const pairs = value && "pairs" in value ? value.pairs : {};
    const assignedRightIds = new Set(Object.values(pairs));

    const handleRightClick = (rightId: string) => {
      if (disabled || !selectedLeftId) return;
      const nextPairs = { ...pairs };
      // Hapus rightId jika sudah terpasang di leftId lain
      for (const [k, v] of Object.entries(nextPairs)) {
        if (v === rightId) delete nextPairs[k];
      }
      nextPairs[selectedLeftId] = rightId;
      onChange({ pairs: nextPairs });
      setSelectedLeftId(null);
    };

    const handleReset = () => {
      if (disabled) return;
      onChange({ pairs: {} });
      setSelectedLeftId(null);
    };

    const getLeftIndexForRight = (rightId: string): number | null => {
      const entry = Object.entries(pairs).find(([, r]) => r === rightId);
      if (!entry) return null;
      const idx = data.leftItems.findIndex((l) => l.id === entry[0]);
      return idx >= 0 ? idx + 1 : null;
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 text-xs text-ink-soft">
          <span>
            Ketuk kata di kiri lalu ketuk padanan artinya di kanan.
          </span>
          <button
            type="button"
            disabled={disabled}
            onClick={handleReset}
            className="inline-flex items-center gap-1 font-bold text-brand hover:underline cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Ulang Pasangan
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2.5">
            {data.leftItems.map((left, idx) => {
              const isSelected = selectedLeftId === left.id;
              const isPaired = Boolean(pairs[left.id]);
              return (
                <button
                  key={left.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => setSelectedLeftId(left.id)}
                  className={`w-full min-h-[56px] px-3.5 py-2.5 rounded-control border-2 text-left flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    isSelected
                      ? "border-brand bg-brand-tint text-ink font-extrabold"
                      : isPaired
                        ? "border-accent-border bg-accent-tint text-ink font-bold"
                        : "border-border-control bg-surface text-ink font-bold hover:bg-surface-soft"
                  }`}
                >
                  <span className="text-sm">{left.text}</span>
                  <span className="w-6 h-6 rounded-full bg-surface-soft border border-border-control text-xs font-extrabold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-2.5">
            {data.rightItems.map((right) => {
              const pairedNum = getLeftIndexForRight(right.id);
              const isUsed = assignedRightIds.has(right.id);
              return (
                <button
                  key={right.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleRightClick(right.id)}
                  className={`w-full min-h-[56px] px-3.5 py-2.5 rounded-control border-2 text-left flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    isUsed
                      ? "border-accent-border bg-accent-tint text-ink font-bold"
                      : selectedLeftId
                        ? "border-brand/60 bg-surface hover:bg-surface-highlight text-ink font-semibold"
                        : "border-border-control bg-surface text-ink-soft font-semibold"
                  }`}
                >
                  <span className="text-sm">{right.text}</span>
                  {pairedNum ? (
                    <span className="w-6 h-6 rounded-full bg-accent text-ink border border-accent-border text-xs font-extrabold flex items-center justify-center shrink-0">
                      {pairedNum}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const selectedOption =
    value && "selectedOption" in value ? value.selectedOption : "";

  return (
    <div className="space-y-4">
      {data.type === "multiple_choice_pasan_to_id" ||
      data.type === "multiple_choice_id_to_pasan" ? (
        data.promptWord ? (
          <div className="inline-block px-4 py-2 rounded-control bg-surface-soft border border-border-subtle">
            <span className="font-display font-extrabold text-lg text-ink">
              {data.promptWord}
            </span>
          </div>
        ) : null
      ) : null}

      {data.type === "fill_blank" ? (
        <div className="bg-surface-soft border border-border-subtle rounded-card p-4 space-y-2">
          <p className="text-base md:text-lg font-bold text-ink leading-relaxed">
            {data.sentenceBefore}{" "}
            <span className="inline-flex items-center px-3 py-0.5 mx-1 rounded-chip border-2 border-dashed border-accent-border bg-accent-tint font-extrabold text-ink min-w-[90px] justify-center">
              {selectedOption
                ? data.options.find((o) => o.id === selectedOption)?.label
                : "______"}
            </span>{" "}
            {data.sentenceAfter}
          </p>
          <p className="text-xs text-ink-soft">
            Arti: &ldquo;{data.translationHint}&rdquo;
          </p>
        </div>
      ) : null}

      {data.type === "dialogue" ? (
        <div className="bg-surface-soft border border-border-subtle rounded-card p-4 space-y-3">
          {data.dialogueLines.map((line, i) => (
            <div
              key={i}
              className="bg-surface border border-border-subtle rounded-control p-3 space-y-0.5"
            >
              <p className="text-xs font-extrabold text-brand uppercase">
                {line.speaker}
              </p>
              <p className="text-sm md:text-base font-bold text-ink">
                {line.pasan}
              </p>
              <p className="text-xs text-ink-soft">{line.indonesian}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-2.5">
        {data.options.map((opt) => {
          const isSelected = selectedOption === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ selectedOption: opt.id })}
              className={`w-full min-h-[56px] px-4 py-3 rounded-control border-2 text-left flex items-center gap-3 cursor-pointer transition-colors ${
                isSelected
                  ? "border-brand bg-brand-tint text-ink font-extrabold"
                  : "border-border-control bg-surface text-ink font-semibold hover:bg-surface-soft"
              }`}
            >
              <span
                className={`w-7 h-7 rounded-chip border text-xs font-extrabold flex items-center justify-center shrink-0 ${
                  isSelected
                    ? "bg-brand text-white border-brand-lip"
                    : "bg-surface-soft text-ink-soft border-border-control"
                }`}
              >
                {opt.id}
              </span>
              <span className="text-sm md:text-base">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
