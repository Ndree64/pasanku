export interface RemedialCandidate {
  lessonId: string;
  errorCount: number;
  priorityOrder: number;
}

/**
 * Menghasilkan maksimal 3 rekomendasi lesson remedial berdasarkan kesalahan quiz.
 * Urutan prioritas: errorCount terbanyak, lalu orderNumber lesson lebih awal.
 */
export function generateRemedialPlan(params: {
  wrongPrimaryLessonIds: string[];
  lessonOrderById: Record<string, number>;
}): RemedialCandidate[] {
  const counts = new Map<string, number>();
  for (const lessonId of params.wrongPrimaryLessonIds) {
    if (!lessonId) continue;
    counts.set(lessonId, (counts.get(lessonId) ?? 0) + 1);
  }

  const sorted = Array.from(counts.entries())
    .filter(([, count]) => count > 0)
    .sort(([lessonA, countA], [lessonB, countB]) => {
      if (countB !== countA) {
        return countB - countA;
      }
      const orderA = params.lessonOrderById[lessonA] ?? Number.MAX_SAFE_INTEGER;
      const orderB = params.lessonOrderById[lessonB] ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    })
    .slice(0, 3);

  return sorted.map(([lessonId, errorCount], index) => ({
    lessonId,
    errorCount,
    priorityOrder: index + 1,
  }));
}
