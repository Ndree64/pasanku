"use server";

import { revalidatePath } from "next/cache";
import type { QuestionResponseData } from "@/types/pasanku";
import { requireUser } from "@/lib/auth/session";
import {
  evaluateLessonAttempt,
  markLessonMaterialDone,
  type LessonEvaluationResult,
} from "@/lib/data/repository";

export async function completeMaterialStepAction(params: {
  lessonId: string;
  activityId: string;
  mode: "regular" | "remedial" | "preview";
  assignmentId?: string;
}): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (params.mode === "preview" && !["admin", "validator"].includes(user.role)) {
    throw new Error("Akses pratinjau ditolak.");
  }

  markLessonMaterialDone({
    userId: user.id,
    lessonId: params.lessonId,
    activityId: params.activityId,
    mode: params.mode,
    assignmentId: params.assignmentId,
  });

  revalidatePath(`/learner/lessons/${params.lessonId}`);
  return { ok: true };
}

export async function submitLessonEvaluationAction(params: {
  lessonId: string;
  responses: Record<string, QuestionResponseData>;
  completedMaterialIds: string[];
  mode: "regular" | "remedial" | "preview";
  assignmentId?: string;
}): Promise<LessonEvaluationResult> {
  const user = await requireUser();
  if (params.mode === "preview" && !["admin", "validator"].includes(user.role)) {
    throw new Error("Mode Pratinjau hanya untuk Admin atau Validator.");
  }

  const result = evaluateLessonAttempt({
    userId: user.id,
    lessonId: params.lessonId,
    responses: params.responses,
    completedMaterialIds: params.completedMaterialIds,
    mode: params.mode,
    assignmentId: params.assignmentId,
  });

  if (params.mode !== "preview") {
    revalidatePath("/learner");
    revalidatePath("/learner/profil");
    revalidatePath("/learner/papan-skor");
    revalidatePath(`/learner/lessons/${params.lessonId}`);
  }

  return result;
}
