import type {
  Lesson,
  LessonActivity,
  LessonMaterial,
  MaterialExample,
  PublicQuestion,
  QuizAttempt,
  RemedialAssignment,
  Unit,
  UnitQuiz,
  Vocabulary,
} from "@/types/pasanku";
import type { BadgeInfo, LevelInfo } from "@/lib/domain/gamification";

export interface PathLessonItem {
  lesson: Lesson;
  status: "completed" | "active" | "locked" | "unpublished";
  bestScore: number;
  unlocked: boolean;
  activeRemedialId: string | null;
}

export interface PathUnitItem {
  unit: Unit;
  unlocked: boolean;
  lessons: PathLessonItem[];
  quiz: UnitQuiz | null;
  quizUnlocked: boolean;
  quizPassed: boolean;
  latestQuizAttempt: QuizAttempt | null;
  pendingRemedials: Array<
    RemedialAssignment & { lessonTitle: string; lessonOrder: number }
  >;
}

export interface LearningPathPayload {
  units: PathUnitItem[];
  totalXp: number;
  level: LevelInfo;
  badges: BadgeInfo[];
  completedLessonsCount: number;
  totalPublishedLessons: number;
}

export interface RunnerActivityItem {
  activity: LessonActivity;
  material?: {
    data: LessonMaterial;
    vocabularies: Vocabulary[];
    examples: MaterialExample[];
  };
  questions: PublicQuestion[];
}

export interface LessonRunnerPayload {
  lesson: Lesson;
  unit: Unit;
  activities: RunnerActivityItem[];
  completedActivityIds: string[];
  mode: "regular" | "remedial" | "preview";
  remedialAssignmentId?: string;
  access: { allowed: boolean; reason?: string };
}

export interface QuestionFeedbackItem {
  questionId: string;
  isCorrect: boolean;
  earnedPoints: number;
  maxPoints: number;
  correctSummary: string;
  explanation: string;
}

export interface LessonEvaluationResult {
  score: number;
  passed: boolean;
  xpAwarded: number;
  feedbacks: QuestionFeedbackItem[];
  mode: "regular" | "remedial" | "preview";
}

export interface QuizRunnerPayload {
  quiz: UnitQuiz;
  unit: Unit;
  questions: PublicQuestion[];
  lessonTitles: Record<string, string>;
  access: { allowed: boolean; reason?: string };
  isPreview: boolean;
}

export interface QuizEvaluationResult {
  score: number;
  passed: boolean;
  xpAwarded: number;
  unlockedUnitTitle: string | null;
  recommendations: Array<{
    lessonId: string;
    lessonTitle: string;
    lessonOrder: number;
    errorCount: number;
    priorityOrder: number;
  }>;
  feedbacks: Array<QuestionFeedbackItem & { primaryLessonTitle: string }>;
  isPreview: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  fullName: string;
  totalXp: number;
  levelTitle: string;
  completedLessons: number;
  isCurrentUser: boolean;
}
