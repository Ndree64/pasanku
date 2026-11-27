"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { applyReviewDecision } from "@/lib/data/repository";

export async function submitValidationDecisionAction(params: {
  reviewId: string;
  decision: "approved" | "changes_requested";
  note: string;
}): Promise<{ ok: boolean; error?: string }> {
  const validator = await requireRole(["validator"]);

  const res = await applyReviewDecision({
    reviewId: params.reviewId,
    reviewerId: validator.id,
    decision: params.decision,
    note: params.note,
  });

  if (res.ok) {
    revalidateTag("curriculum", "max");
    revalidatePath("/validator");
    revalidatePath("/validator/riwayat");
    revalidatePath("/admin");
    revalidatePath("/admin/units");
    revalidatePath("/admin/quizzes");
  }

  return res;
}
