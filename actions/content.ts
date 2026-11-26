"use server";

import { revalidatePath } from "next/cache";
import type { QuestionType } from "@/types/pasanku";
import { requireRole } from "@/lib/auth/session";
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

export async function createLessonAction(formData: FormData) {
  await requireRole(["admin"]);
  const unitId = String(formData.get("unitId") ?? "");
  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  const objective = String(formData.get("objective") ?? "");

  const res = createNewLesson({ unitId, title, description, objective });
  revalidatePath("/admin");
  revalidatePath("/admin/units");
  return res;
}

export async function updateLessonMetaAction(formData: FormData) {
  await requireRole(["admin"]);
  const lessonId = String(formData.get("lessonId") ?? "");
  const title = String(formData.get("title") ?? "");
  const description = String(formData.get("description") ?? "");
  const objective = String(formData.get("objective") ?? "");

  const res = updateLessonDetails({ lessonId, title, description, objective });
  revalidatePath(`/admin/lessons/${lessonId}`);
  revalidatePath("/admin/units");
  return res;
}

export async function addMaterialActivityAction(formData: FormData) {
  await requireRole(["admin"]);
  const lessonId = String(formData.get("lessonId") ?? "");
  const title = String(formData.get("title") ?? "");
  const instruction = String(formData.get("instruction") ?? "");
  const content = String(formData.get("content") ?? "");
  const explanation = String(formData.get("explanation") ?? "");
  const examplePasan = String(formData.get("examplePasan") ?? "");
  const exampleTranslation = String(formData.get("exampleTranslation") ?? "");

  const res = addMaterialActivity({
    lessonId,
    title,
    instruction,
    content,
    explanation,
    examplePasan,
    exampleTranslation,
  });
  revalidatePath(`/admin/lessons/${lessonId}`);
  return res;
}

export async function updateMaterialActivityAction(formData: FormData) {
  await requireRole(["admin"]);
  const lessonId = String(formData.get("lessonId") ?? "");
  const activityId = String(formData.get("activityId") ?? "");
  const title = String(formData.get("title") ?? "");
  const content = String(formData.get("content") ?? "");
  const explanation = String(formData.get("explanation") ?? "");

  const res = updateMaterialActivity({
    lessonId,
    activityId,
    title,
    content,
    explanation,
  });
  revalidatePath(`/admin/lessons/${lessonId}`);
  return res;
}

export async function addExerciseActivityAction(formData: FormData) {
  await requireRole(["admin"]);
  const lessonId = String(formData.get("lessonId") ?? "");
  const title = String(formData.get("title") ?? "");
  const questionType = String(formData.get("questionType") ?? "multiple_choice_pasan_to_id") as QuestionType;
  const questionText = String(formData.get("questionText") ?? "");
  const optionA = String(formData.get("optionA") ?? "");
  const optionB = String(formData.get("optionB") ?? "");
  const optionC = String(formData.get("optionC") ?? "");
  const correctOption = (String(formData.get("correctOption") ?? "A") as "A" | "B" | "C");
  const explanation = String(formData.get("explanation") ?? "");

  const res = addExerciseQuestionActivity({
    lessonId,
    title,
    questionType,
    questionText,
    optionA,
    optionB,
    optionC,
    correctOption,
    explanation,
  });
  revalidatePath(`/admin/lessons/${lessonId}`);
  return res;
}

export async function moveActivityAction(params: {
  lessonId: string;
  activityId: string;
  direction: "up" | "down";
}) {
  await requireRole(["admin"]);
  const res = moveLessonActivityOrder(params);
  revalidatePath(`/admin/lessons/${params.lessonId}`);
  return res;
}

export async function submitForValidationAction(params: {
  type: "lesson" | "quiz";
  targetId: string;
}) {
  const admin = await requireRole(["admin"]);
  const res = submitContentForValidation({
    type: params.type,
    targetId: params.targetId,
    adminId: admin.id,
    adminName: admin.fullName,
  });
  revalidatePath("/admin");
  revalidatePath("/admin/units");
  revalidatePath("/admin/quizzes");
  revalidatePath(`/admin/lessons/${params.targetId}`);
  revalidatePath("/validator");
  return res;
}

export async function cancelValidationAction(params: {
  type: "lesson" | "quiz";
  targetId: string;
}) {
  await requireRole(["admin"]);
  const res = cancelPendingReviewSubmission(params);
  revalidatePath("/admin");
  revalidatePath("/admin/units");
  revalidatePath("/admin/quizzes");
  revalidatePath(`/admin/lessons/${params.targetId}`);
  revalidatePath("/validator");
  return res;
}

export async function publishContentAction(params: {
  type: "lesson" | "quiz";
  targetId: string;
}) {
  await requireRole(["admin"]);
  const res = publishApprovedContent(params);
  revalidatePath("/admin");
  revalidatePath("/admin/units");
  revalidatePath("/admin/quizzes");
  revalidatePath(`/admin/lessons/${params.targetId}`);
  revalidatePath("/learner");
  return res;
}

export async function addQuizQuestionAction(formData: FormData) {
  await requireRole(["admin"]);
  const quizId = String(formData.get("quizId") ?? "");
  const primaryLessonId = String(formData.get("primaryLessonId") ?? "");
  const questionText = String(formData.get("questionText") ?? "");
  const optionA = String(formData.get("optionA") ?? "");
  const optionB = String(formData.get("optionB") ?? "");
  const optionC = String(formData.get("optionC") ?? "");
  const correctOption = String(formData.get("correctOption") ?? "A") as "A" | "B" | "C";
  const explanation = String(formData.get("explanation") ?? "");

  const res = addQuizQuestionItem({
    quizId,
    primaryLessonId,
    questionText,
    optionA,
    optionB,
    optionC,
    correctOption,
    explanation,
  });
  revalidatePath("/admin/quizzes");
  return res;
}

export async function createValidatorAction(formData: FormData) {
  await requireRole(["admin"]);
  const fullName = String(formData.get("fullName") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const res = createValidatorProfile({ fullName, email, password });
  revalidatePath("/admin/validators");
  revalidatePath("/admin");
  return res;
}

export async function toggleValidatorAction(userId: string) {
  await requireRole(["admin"]);
  const res = toggleValidatorStatus(userId);
  revalidatePath("/admin/validators");
  return res;
}
