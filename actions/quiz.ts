"use server";

import { revalidatePath } from "next/cache";
import type { QuestionResponseData } from "@/types/pasanku";
import { requireUser } from "@/lib/auth/session";
import {
  evaluateQuizAttempt,
  type QuizEvaluationResult,
} from "@/lib/data/repository";

export async function submitQuizEvaluationAction(params: {
  unitId: string;
  responses: Record<string, QuestionResponseData>;
  isPreview: boolean;
}): Promise<QuizEvaluationResult> {
  const user = await requireUser();
  if (params.isPreview && !["admin", "validator"].includes(user.role)) {
    throw new Error("Mode Pratinjau hanya untuk Admin atau Validator.");
  }

  const result = evaluateQuizAttempt({
    userId: user.id,
    unitId: params.unitId,
    responses: params.responses,
    isPreview: params.isPreview,
  });

  if (!params.isPreview) {
    revalidatePath("/learner");
    revalidatePath("/learner/profil");
    revalidatePath("/learner/papan-skor");
    revalidatePath(`/learner/quizzes/${params.unitId}`);
  }

  return result;
}
