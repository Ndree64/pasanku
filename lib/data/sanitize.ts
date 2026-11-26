import type {
  LessonQuestion,
  PublicQuestion,
  QuizQuestion,
} from "@/types/pasanku";

export function toPublicLessonQuestion(q: LessonQuestion): PublicQuestion {
  return {
    id: q.id,
    questionType: q.questionType,
    questionText: q.questionText,
    questionData: q.questionData,
    points: q.points,
    orderNumber: q.orderNumber,
  };
}

export function toPublicQuizQuestion(q: QuizQuestion): PublicQuestion {
  return {
    id: q.id,
    questionType: q.questionType,
    questionText: q.questionText,
    questionData: q.questionData,
    points: q.points,
    orderNumber: q.orderNumber,
    primaryLessonId: q.primaryLessonId,
  };
}
