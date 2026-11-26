"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { applyReviewDecision } from "@/lib/data/repository";

export async function submitValidationDecisionAction(params: {
  reviewId: string;
  decision: "approved" | "changes_requested";
  note: string;
}): Promise<{ ok: boolean; error?: string }> {
  const validator = await requireRole(["validator"]);

  const res = applyReviewDecision({
    reviewId: params.reviewId,
    reviewerId: validator.id,
    reviewerName: validator.fullName,
    decision: params.decision,
    note: params.note,
  });

  if (res.ok) {
    revalidatePath("/validator");
    revalidatePath("/validator/riwayat");
    revalidatePath("/admin");
    revalidatePath("/admin/units");
    revalidatePath("/admin/quizzes");
  }

  return res;
}
