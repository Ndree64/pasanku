export function isUnitUnlocked(params: {
  unitOrder: number;
  unitId: string;
  unlockedUnitIds: Set<string>;
  isPreview?: boolean;
}): boolean {
  if (params.isPreview) return true;
  if (params.unitOrder === 1) return true;
  return params.unlockedUnitIds.has(params.unitId);
}

export function isLessonUnlocked(params: {
  unitUnlocked: boolean;
  lessonOrder: number;
  previousLessonPassed: boolean;
  isPreview?: boolean;
}): boolean {
  if (params.isPreview) return true;
  if (!params.unitUnlocked) return false;
  if (params.lessonOrder === 1) return true;
  return params.previousLessonPassed;
}

export function canStartQuiz(params: {
  unitUnlocked: boolean;
  allFiveLessonsPassed: boolean;
  pendingRemedialCount: number;
  isPreview?: boolean;
}): { allowed: boolean; reason?: string } {
  if (params.isPreview) {
    return { allowed: true };
  }
  if (!params.unitUnlocked) {
    return {
      allowed: false,
      reason: "Unit ini masih terkunci. Selesaikan unit sebelumnya terlebih dahulu.",
    };
  }
  if (!params.allFiveLessonsPassed) {
    return {
      allowed: false,
      reason: "Selesaikan semua 5 lesson di unit ini sebelum mengikuti Quiz Unit.",
    };
  }
  if (params.pendingRemedialCount > 0) {
    return {
      allowed: false,
      reason:
        "Selesaikan seluruh lesson remedial yang direkomendasikan sebelum mengulang Quiz Unit.",
    };
  }
  return { allowed: true };
}
