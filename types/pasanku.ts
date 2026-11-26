export type UserRole = "admin" | "validator" | "learner";

export type ContentStatus =
  | "draft"
  | "pending_review"
  | "changes_requested"
  | "approved"
  | "published";

export type ActivityType = "material" | "exercise";

export type QuestionType =
  | "multiple_choice_pasan_to_id"
  | "multiple_choice_id_to_pasan"
  | "matching"
  | "fill_blank"
  | "dialogue";

export type AttemptStatus = "in_progress" | "passed" | "failed";
export type ProgressType = "regular" | "remedial";
export type RemedialStatus = "pending" | "in_progress" | "completed";
export type XpActivityType = "lesson" | "remedial" | "quiz";
export type ReviewStatus = "pending" | "approved" | "changes_requested";

export interface Profile {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Unit {
  id: string;
  title: string;
  description: string;
  orderNumber: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  id: string;
  unitId: string;
  title: string;
  description: string;
  objective: string;
  orderNumber: number;
  contentVersion: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface LessonActivity {
  id: string;
  lessonId: string;
  activityType: ActivityType;
  title: string;
  instruction: string;
  orderNumber: number;
  isRequired: boolean;
  createdAt: string;
}

export interface LessonMaterial {
  id: string;
  activityId: string;
  content: string;
  explanation: string;
  estimatedDuration: number;
}

export interface Vocabulary {
  id: string;
  pasanWord: string;
  indonesianMeaning: string;
  category: string;
  firstLessonId: string | null;
  unitNumber: number;
  exampleSentence: string;
  exampleTranslation: string;
  sourceNote: string;
  validationStatus: ContentStatus;
  createdAt: string;
}

export interface MaterialVocabulary {
  id: string;
  materialId: string;
  vocabularyId: string;
  orderNumber: number;
}

export interface MaterialExample {
  id: string;
  materialId: string;
  pasanText: string;
  indonesianTranslation: string;
  orderNumber: number;
}

export interface MultipleChoiceQuestionData {
  type: "multiple_choice_pasan_to_id" | "multiple_choice_id_to_pasan";
  promptWord?: string;
  options: Array<{ id: string; label: string }>;
}

export interface MatchingQuestionData {
  type: "matching";
  leftItems: Array<{ id: string; text: string }>;
  rightItems: Array<{ id: string; text: string }>;
}

export interface FillBlankQuestionData {
  type: "fill_blank";
  sentenceBefore: string;
  sentenceAfter: string;
  translationHint: string;
  options: Array<{ id: string; label: string }>;
}

export interface DialogueQuestionData {
  type: "dialogue";
  dialogueLines: Array<{ speaker: string; pasan: string; indonesian: string }>;
  options: Array<{ id: string; label: string }>;
}

export type QuestionData =
  | MultipleChoiceQuestionData
  | MatchingQuestionData
  | FillBlankQuestionData
  | DialogueQuestionData;

export type AnswerKey =
  | { correctOption: string }
  | { pairs: Record<string, string> };

export type QuestionResponseData =
  | { selectedOption: string }
  | { pairs: Record<string, string> };

export interface LessonQuestion {
  id: string;
  activityId: string;
  questionType: QuestionType;
  questionText: string;
  questionData: QuestionData;
  explanation: string;
  points: number;
  orderNumber: number;
}

export interface LessonQuestionAnswerKey {
  questionId: string;
  answerKey: AnswerKey;
}

/** Client-safe question payload for Learners (never includes answer keys) */
export interface PublicQuestion {
  id: string;
  questionType: QuestionType;
  questionText: string;
  questionData: QuestionData;
  points: number;
  orderNumber: number;
  primaryLessonId?: string;
}

export interface UnitQuiz {
  id: string;
  unitId: string;
  title: string;
  description: string;
  passingScore: number;
  contentVersion: number;
  status: ContentStatus;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  primaryLessonId: string;
  questionType: QuestionType;
  questionText: string;
  questionData: QuestionData;
  explanation: string;
  points: number;
  orderNumber: number;
}

export interface QuizQuestionAnswerKey {
  questionId: string;
  answerKey: AnswerKey;
}

export interface ContentReview {
  id: string;
  lessonId: string | null;
  quizId: string | null;
  contentTitle: string;
  unitTitle: string;
  contentVersion: number;
  status: ReviewStatus;
  submittedBy: string;
  submittedByName: string;
  reviewedBy: string | null;
  reviewedByName: string | null;
  reviewNote: string;
  submittedAt: string;
  reviewedAt: string | null;
}

export interface UnitUnlock {
  id: string;
  userId: string;
  unitId: string;
  unlockedAt: string;
}

export interface LearnerLessonProgress {
  id: string;
  userId: string;
  lessonId: string;
  completedContentVersion: number;
  bestScore: number;
  status: "in_progress" | "completed";
  completedAt: string | null;
}

export interface LessonActivityProgress {
  id: string;
  userId: string;
  lessonId: string;
  activityId: string;
  progressType: ProgressType;
  remedialAssignmentId: string | null;
  status: "not_started" | "completed";
  completedAt: string | null;
}

export interface LessonAttempt {
  id: string;
  userId: string;
  lessonId: string;
  attemptType: ProgressType;
  remedialAssignmentId: string | null;
  attemptNumber: number;
  score: number;
  status: AttemptStatus;
  contentVersion: number;
  startedAt: string;
  completedAt: string | null;
}

export interface LessonResponse {
  id: string;
  attemptId: string;
  questionId: string;
  responseData: QuestionResponseData;
  isCorrect: boolean;
  earnedPoints: number;
  submittedAt: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  attemptNumber: number;
  score: number;
  status: AttemptStatus;
  contentVersion: number;
  startedAt: string;
  completedAt: string | null;
}

export interface QuizResponse {
  id: string;
  attemptId: string;
  questionId: string;
  responseData: QuestionResponseData;
  isCorrect: boolean;
  earnedPoints: number;
  submittedAt: string;
}

export interface RemedialAssignment {
  id: string;
  userId: string;
  quizAttemptId: string;
  unitId: string;
  lessonId: string;
  errorCount: number;
  priorityOrder: number;
  contentVersion: number;
  status: RemedialStatus;
  createdAt: string;
  completedAt: string | null;
}

export interface XpTransaction {
  id: string;
  userId: string;
  activityType: XpActivityType;
  referenceId: string;
  xpAmount: number;
  label: string;
  createdAt: string;
}
