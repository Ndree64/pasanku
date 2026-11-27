"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import { parseQuestionFormData } from "@/lib/data/question-builder";
import {
  addExerciseQuestionActivity,
  addMaterialActivity,
  addQuizQuestionItem,
  cancelPendingReviewSubmission,
  createNewLesson,
  createValidatorProfile,
  moveLessonActivityOrder,
  publishApprovedContent,
  submitContentForValidation,
  toggleValidatorStatus,
  updateLessonDetails,
  updateMaterialActivity,
} from "@/lib/data/repository";

const field = (formData: FormData, key: string) => String(formData.get(key) ?? "");

function revalidateCurriculum(...paths: string[]) {
  revalidateTag("curriculum", "max");
  for (const path of paths) revalidatePath(path);
}

export async function createLessonAction(formData: FormData) {
  await requireRole(["admin"]);
  const res = await createNewLesson({
    unitId: field(formData, "unitId"),
    title: field(formData, "title"),
    description: field(formData, "description"),
    objective: field(formData, "objective"),
  });
  revalidateCurriculum("/admin", "/admin/units");
  return res;
}

export async function updateLessonMetaAction(formData: FormData) {
  await requireRole(["admin"]);
  const lessonId = field(formData, "lessonId");
  const res = await updateLessonDetails({
    lessonId,
    title: field(formData, "title"),
    description: field(formData, "description"),
    objective: field(formData, "objective"),
  });
  revalidateCurriculum(`/admin/lessons/${lessonId}`, "/admin/units");
  return res;
}

export async function addMaterialActivityAction(formData: FormData) {
  await requireRole(["admin"]);
  const lessonId = field(formData, "lessonId");
  const res = await addMaterialActivity({
    lessonId,
    title: field(formData, "title"),
    instruction: field(formData, "instruction"),
    content: field(formData, "content"),
    explanation: field(formData, "explanation"),
    examplePasan: field(formData, "examplePasan"),
    exampleTranslation: field(formData, "exampleTranslation"),
  });
  revalidateCurriculum(`/admin/lessons/${lessonId}`);
  return res;
}

export async function updateMaterialActivityAction(formData: FormData) {
  await requireRole(["admin"]);
  const lessonId = field(formData, "lessonId");
  const res = await updateMaterialActivity({
    lessonId,
    activityId: field(formData, "activityId"),
    title: field(formData, "title"),
    content: field(formData, "content"),
    explanation: field(formData, "explanation"),
  });
  revalidateCurriculum(`/admin/lessons/${lessonId}`);
  return res;
}

export async function addExerciseActivityAction(formData: FormData) {
  await requireRole(["admin"]);
  const lessonId = field(formData, "lessonId");
  const parsed = parseQuestionFormData(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const res = await addExerciseQuestionActivity({
    lessonId,
    existingActivityId: field(formData, "existingActivityId") || undefined,
    title: field(formData, "title"),
    ...parsed.data,
  });
  revalidateCurriculum(`/admin/lessons/${lessonId}`);
  return res;
}

export async function moveActivityAction(params: {
  lessonId: string;
  activityId: string;
  direction: "up" | "down";
}) {
  await requireRole(["admin"]);
  const res = await moveLessonActivityOrder(params);
  revalidateCurriculum(`/admin/lessons/${params.lessonId}`);
  return res;
}

export async function submitForValidationAction(params: {
  type: "lesson" | "quiz";
  targetId: string;
}) {
  const admin = await requireRole(["admin"]);
  const res = await submitContentForValidation({
    ...params,
    adminId: admin.id,
  });
  revalidateCurriculum(
    "/admin",
    "/admin/units",
    "/admin/quizzes",
    `/admin/lessons/${params.targetId}`,
    "/validator"
  );
  return res;
}

export async function cancelValidationAction(params: {
  type: "lesson" | "quiz";
  targetId: string;
}) {
  await requireRole(["admin"]);
  const res = await cancelPendingReviewSubmission(params);
  revalidateCurriculum(
    "/admin",
    "/admin/units",
    "/admin/quizzes",
    `/admin/lessons/${params.targetId}`,
    "/validator"
  );
  return res;
}

export async function publishContentAction(params: {
  type: "lesson" | "quiz";
  targetId: string;
}) {
  await requireRole(["admin"]);
  const res = await publishApprovedContent(params);
  revalidateCurriculum(
    "/admin",
    "/admin/units",
    "/admin/quizzes",
    `/admin/lessons/${params.targetId}`,
    "/learner"
  );
  return res;
}

export async function addQuizQuestionAction(formData: FormData) {
  await requireRole(["admin"]);
  const parsed = parseQuestionFormData(formData);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const res = await addQuizQuestionItem({
    quizId: field(formData, "quizId"),
    primaryLessonId: field(formData, "primaryLessonId"),
    ...parsed.data,
  });
  revalidateCurriculum("/admin/quizzes");
  return res;
}

export async function createValidatorAction(formData: FormData) {
  await requireRole(["admin"]);
  const res = await createValidatorProfile({
    fullName: field(formData, "fullName"),
    email: field(formData, "email"),
    password: field(formData, "password"),
  });
  revalidateTag("profiles", "max");
  revalidatePath("/admin/validators");
  revalidatePath("/admin");
  return res;
}

export async function toggleValidatorAction(userId: string) {
  await requireRole(["admin"]);
  const res = await toggleValidatorStatus(userId);
  revalidateTag("profiles", "max");
  revalidatePath("/admin/validators");
  return res;
}
