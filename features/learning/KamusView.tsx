"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Vocabulary } from "@/types/pasanku";
import { ContentStatusBadge } from "@/components/ui/Primitives";
import { EmptyState } from "@/components/ui/States";

type UnitFilter = "all" | "1" | "2" | "3" | "4-5";

export function KamusView({
  vocabularies,
  showValidationStatus = false,
}: {
  vocabularies: Vocabulary[];
  showValidationStatus?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState<UnitFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return vocabularies.filter((v) => {
      const matchUnit =
        unitFilter === "all"
          ? true
          : unitFilter === "4-5"
            ? v.unitNumber >= 4
            : String(v.unitNumber) === unitFilter;

      const matchQuery =
        !q ||
        v.pasanWord.toLowerCase().includes(q) ||
        v.indonesianMeaning.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q);

      return matchUnit && matchQuery;
    });
  }, [vocabularies, query, unitFilter]);

  const filters: Array<{ id: UnitFilter; label: string }> = [
    { id: "all", label: "Semua" },
    { id: "1", label: "Unit 1" },
    { id: "2", label: "Unit 2" },
    { id: "3", label: "Unit 3" },
    { id: "4-5", label: "Unit 4-5" },
  ];

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="relative">
          <Search
            className="w-4 h-4 text-ink-soft absolute left-3.5 top-1/2 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            id="kamus-search"
            name="q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kata Bahasa Pasan atau arti Indonesia..."
            aria-label="Cari kosakata Bahasa Pasan"
            className="w-full h-12 pl-10 pr-4 rounded-control border border-border-control bg-surface text-sm text-ink placeholder:text-ink-soft/60"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((f) => {
            const active = unitFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setUnitFilter(f.id)}
                className={`min-h-[38px] px-3.5 rounded-chip border text-xs font-extrabold cursor-pointer ${
                  active
                    ? "bg-brand text-white border-brand-lip"
                    : "bg-surface text-ink-soft border-border-control hover:bg-surface-soft"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Kosakata Tidak Ditemukan"
          description="Coba kata kunci lain atau pilih filter unit Semua."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtered.map((voc) => (
            <article
              key={voc.id}
              className="bg-surface border border-border-subtle rounded-card p-4 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-extrabold text-ink">
                    {voc.pasanWord}
                  </h2>
                  <p className="text-sm font-semibold text-ink-soft">
                    {voc.indonesianMeaning}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="px-2 py-0.5 rounded-chip bg-surface-soft border border-border-subtle text-[11px] font-bold text-ink-soft">
                    Unit {voc.unitNumber} · {voc.category}
                  </span>
                  {showValidationStatus ? (
                    <ContentStatusBadge status={voc.validationStatus} />
                  ) : null}
                </div>
              </div>

              {voc.exampleSentence ? (
                <div className="bg-surface-soft rounded-control p-2.5 text-xs space-y-0.5">
                  <p className="font-bold text-ink">{voc.exampleSentence}</p>
                  <p className="text-ink-soft">{voc.exampleTranslation}</p>
                </div>
              ) : null}

              {voc.sourceNote ? (
                <p className="text-[11px] text-ink-soft">{voc.sourceNote}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
