import crypto from "node:crypto";
import type {
  AnswerKey,
  ContentStatus,
  LearnerLessonProgress,
  Lesson,
  LessonActivity,
  LessonMaterial,
  MaterialExample,
  Profile,
  PublicQuestion,
  QuestionData,
  QuestionResponseData,
  QuestionType,
  QuizAttempt,
  RemedialAssignment,
  Unit,
  UnitQuiz,
  Vocabulary,
} from "@/types/pasanku";
import { readLocalDb, mutateLocalDb } from "@/lib/data/local-store";
import { toPublicLessonQuestion, toPublicQuizQuestion } from "@/lib/data/sanitize";
import { canStartQuiz, isLessonUnlocked, isUnitUnlocked } from "@/lib/domain/access";
import {
  calculateLevel,
  computeBadges,
  getXpAwardIfEligible,
  type BadgeInfo,
  type LevelInfo,
} from "@/lib/domain/gamification";
import { generateRemedialPlan } from "@/lib/domain/recommendation";
import {
  calculatePercentageScore,
  gradeQuestion,
  isScorePassed,
} from "@/lib/domain/scoring";

function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

// ==========================================
// AUTH & PROFILE QUERIES
// ==========================================

export function findProfileByIdentifier(identifier: string): Profile | null {
  const norm = identifier.trim().toLowerCase();
  const db = readLocalDb();
  return (
    db.profiles.find(
      (p) =>
        p.email.toLowerCase() === norm || p.username.toLowerCase() === norm
    ) ?? null
  );
}

export function verifyCredentials(
  identifier: string,
  password: string
): { profile: Profile | null; error?: string } {
  const profile = findProfileByIdentifier(identifier);
  if (!profile) {
    return { profile: null, error: "Email atau username tidak ditemukan." };
  }
  if (!profile.isActive) {
    return {
      profile: null,
      error: "Akun ini dinonaktifkan. Hubungi Admin kurikulum.",
    };
  }
  const db = readLocalDb();
  const expected = db.passwords[profile.email.toLowerCase()];
  if (!expected || expected !== password) {
    return { profile: null, error: "Kata sandi tidak sesuai." };
  }
  return { profile };
}

export function registerLearnerAccount(params: {
  fullName: string;
  email: string;
  password: string;
}): { profile?: Profile; error?: string } {
  const email = params.email.trim().toLowerCase();
  const fullName = params.fullName.trim();
  if (!fullName || !email || params.password.length < 6) {
    return {
      error: "Nama lengkap, email valid, dan kata sandi minimal 6 karakter wajib diisi.",
    };
  }

  return mutateLocalDb((db) => {
    const exists = db.profiles.some((p) => p.email.toLowerCase() === email);
    if (exists) {
      return { error: "Email sudah terdaftar. Silakan masuk." };
    }
    const baseUsername = email.split("@")[0].replace(/[^a-z0-9]/g, "");
    const username = `${baseUsername || "learner"}${Math.floor(10 + Math.random() * 89)}`;
    const now = new Date().toISOString();
    const profile: Profile = {
      id: newId("user"),
      email,
      username,
      fullName,
      role: "learner", // Selalu learner pada registrasi mandiri (PRD 3.3)
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    db.profiles.push(profile);
    db.passwords[email] = params.password;

    const unit1 = db.units.find((u) => u.orderNumber === 1);
    if (unit1) {
      db.unitUnlocks.push({
        id: newId("uu"),
        userId: profile.id,
        unitId: unit1.id,
        unlockedAt: now,
      });
    }
    return { profile };
  });
}

// ==========================================
// LEARNING PATH (LEARNER & PREVIEW MODE)
// ==========================================

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

export function getLearningPathData(
  userId: string,
  options?: { isPreview?: boolean; includeUnpublished?: boolean }
): LearningPathPayload {
  const db = readLocalDb();
  const isPreview = Boolean(options?.isPreview);
  const includeUnpublished = Boolean(options?.includeUnpublished);

  const unlockedSet = new Set(
    db.unitUnlocks.filter((u) => u.userId === userId).map((u) => u.unitId)
  );

  const userProgressMap = new Map<string, LearnerLessonProgress>();
  for (const prog of db.lessonProgress) {
    if (prog.userId === userId) {
      userProgressMap.set(prog.lessonId, prog);
    }
  }

  const userRemedials = db.remedialAssignments.filter(
    (r) => r.userId === userId && r.status !== "completed"
  );

  const sortedUnits = [...db.units].sort(
    (a, b) => a.orderNumber - b.orderNumber
  );

  let foundFirstActive = false;

  const pathUnits: PathUnitItem[] = sortedUnits.map((unit) => {
    const unitUnlocked = isUnitUnlocked({
      unitOrder: unit.orderNumber,
      unitId: unit.id,
      unlockedUnitIds: unlockedSet,
      isPreview,
    });

    const unitLessons = db.lessons
      .filter((l) => l.unitId === unit.id)
      .filter((l) =>
        isPreview
          ? includeUnpublished || l.status === "published"
          : true
      )
      .sort((a, b) => a.orderNumber - b.orderNumber);

    let prevPassed = true;
    const mappedLessons: PathLessonItem[] = unitLessons.map((lesson) => {
      const isPublished = lesson.status === "published";
      if (!isPreview && !isPublished) {
        prevPassed = false;
        return {
          lesson,
          status: "unpublished",
          bestScore: 0,
          unlocked: false,
          activeRemedialId: null,
        };
      }

      const prog = userProgressMap.get(lesson.id);
      const passedCurrentVersion =
        !isPreview &&
        Boolean(
          prog &&
            prog.status === "completed" &&
            prog.completedContentVersion >= lesson.contentVersion
        );

      const unlocked = isLessonUnlocked({
        unitUnlocked,
        lessonOrder: lesson.orderNumber,
        previousLessonPassed: prevPassed,
        isPreview,
      });

      const remedial = !isPreview
        ? userRemedials.find((r) => r.lessonId === lesson.id) ?? null
        : null;

      let status: PathLessonItem["status"] = "locked";
      if (isPreview) {
        status = "active";
      } else if (passedCurrentVersion) {
        status = "completed";
      } else if (unlocked) {
        if (!foundFirstActive) {
          status = "active";
          foundFirstActive = true;
        } else {
          status = "active";
        }
      }

      prevPassed = passedCurrentVersion;
      return {
        lesson,
        status,
        bestScore: prog?.bestScore ?? 0,
        unlocked,
        activeRemedialId: remedial?.id ?? null,
      };
    });

    const quiz =
      db.unitQuizzes.find((q) => {
        if (q.unitId !== unit.id) return false;
        if (isPreview) return includeUnpublished || q.status === "published";
        return q.status === "published";
      }) ?? null;

    const unitQuizAttempts = quiz
      ? db.quizAttempts
          .filter((qa) => qa.userId === userId && qa.quizId === quiz.id)
          .sort((a, b) => b.attemptNumber - a.attemptNumber)
      : [];
    const latestQuizAttempt = unitQuizAttempts[0] ?? null;
    const quizPassed = unitQuizAttempts.some((qa) => qa.status === "passed");

    const unitPendingRemedials =
      !isPreview && latestQuizAttempt && latestQuizAttempt.status === "failed"
        ? userRemedials
            .filter((r) => r.quizAttemptId === latestQuizAttempt.id)
            .map((r) => {
              const lessonObj = db.lessons.find((l) => l.id === r.lessonId);
              return {
                ...r,
                lessonTitle: lessonObj?.title ?? "Lesson",
                lessonOrder: lessonObj?.orderNumber ?? 99,
              };
            })
            .sort((a, b) => a.priorityOrder - b.priorityOrder)
        : [];

    const allFivePassed =
      mappedLessons.length > 0 &&
      mappedLessons.every((item) => item.status === "completed");

    const quizCheck = canStartQuiz({
      unitUnlocked,
      allFiveLessonsPassed: allFivePassed,
      pendingRemedialCount: unitPendingRemedials.length,
      isPreview,
    });

    return {
      unit,
      unlocked: unitUnlocked,
      lessons: mappedLessons,
      quiz,
      quizUnlocked: Boolean(quiz) && quizCheck.allowed,
      quizPassed,
      latestQuizAttempt,
      pendingRemedials: unitPendingRemedials,
    };
  });

  const totalXp = db.xpTransactions
    .filter((tx) => tx.userId === userId)
    .reduce((sum, tx) => sum + tx.xpAmount, 0);

  const completedLessonsCount = db.lessonProgress.filter(
    (p) => p.userId === userId && p.status === "completed"
  ).length;
  const passedQuizzesCount = new Set(
    db.quizAttempts
      .filter((qa) => qa.userId === userId && qa.status === "passed")
      .map((qa) => qa.quizId)
  ).size;
  const completedRemedialsCount = db.remedialAssignments.filter(
    (r) => r.userId === userId && r.status === "completed"
  ).length;

  return {
    units: pathUnits,
    totalXp,
    level: calculateLevel(totalXp),
    badges: computeBadges({
      completedLessonsCount,
      passedQuizzesCount,
      completedRemedialsCount,
      totalXp,
    }),
    completedLessonsCount,
    totalPublishedLessons: db.lessons.filter((l) => l.status === "published")
      .length,
  };
}

// ==========================================
// LESSON & QUIZ RUNNERS (CLIENT-SAFE PAYLOAD)
// ==========================================

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

export function getLessonForRunner(
  userId: string,
  lessonId: string,
  options?: { mode?: "regular" | "remedial" | "preview"; assignmentId?: string }
): LessonRunnerPayload | null {
  const db = readLocalDb();
  const lesson = db.lessons.find((l) => l.id === lessonId);
  if (!lesson) return null;
  const unit = db.units.find((u) => u.id === lesson.unitId);
  if (!unit) return null;

  const mode = options?.mode ?? "regular";
  const isPreview = mode === "preview";

  if (!isPreview && lesson.status !== "published") {
    return {
      lesson,
      unit,
      activities: [],
      completedActivityIds: [],
      mode,
      access: {
        allowed: false,
        reason: "Lesson ini belum diterbitkan untuk Learner.",
      },
    };
  }

  const unlockedSet = new Set(
    db.unitUnlocks.filter((u) => u.userId === userId).map((u) => u.unitId)
  );
  const unitUnlocked = isUnitUnlocked({
    unitOrder: unit.orderNumber,
    unitId: unit.id,
    unlockedUnitIds: unlockedSet,
    isPreview,
  });

  const prevLesson = db.lessons.find(
    (l) => l.unitId === unit.id && l.orderNumber === lesson.orderNumber - 1
  );
  const prevProg = prevLesson
    ? db.lessonProgress.find(
        (p) => p.userId === userId && p.lessonId === prevLesson.id
      )
    : null;
  const previousLessonPassed = Boolean(
    prevLesson &&
      prevProg &&
      prevProg.status === "completed" &&
      prevProg.completedContentVersion >= prevLesson.contentVersion
  );

  const unlocked = isLessonUnlocked({
    unitUnlocked,
    lessonOrder: lesson.orderNumber,
    previousLessonPassed,
    isPreview,
  });

  if (!unlocked) {
    return {
      lesson,
      unit,
      activities: [],
      completedActivityIds: [],
      mode,
      access: {
        allowed: false,
        reason: "Selesaikan lesson sebelumnya untuk membuka lesson ini.",
      },
    };
  }

  const sortedActs = db.activities
    .filter((a) => a.lessonId === lesson.id)
    .sort((a, b) => a.orderNumber - b.orderNumber);

  const activities: RunnerActivityItem[] = sortedActs.map((activity) => {
    if (activity.activityType === "material") {
      const mat = db.materials.find((m) => m.activityId === activity.id);
      const vocIds = mat
        ? db.materialVocabularies
            .filter((mv) => mv.materialId === mat.id)
            .sort((a, b) => a.orderNumber - b.orderNumber)
            .map((mv) => mv.vocabularyId)
        : [];
      const vocabs = vocIds
        .map((id) => db.vocabularies.find((v) => v.id === id))
        .filter((v): v is Vocabulary => Boolean(v));
      const examples = mat
        ? db.materialExamples
            .filter((me) => me.materialId === mat.id)
            .sort((a, b) => a.orderNumber - b.orderNumber)
        : [];
      return {
        activity,
        material: mat ? { data: mat, vocabularies: vocabs, examples } : undefined,
        questions: [],
      };
    }

    const questions = db.lessonQuestions
      .filter((q) => q.activityId === activity.id)
      .sort((a, b) => a.orderNumber - b.orderNumber)
      .map(toPublicLessonQuestion);

    return { activity, questions };
  });

  const progressType = mode === "remedial" ? "remedial" : "regular";
  const completedActivityIds = isPreview
    ? []
    : db.activityProgress
        .filter(
          (ap) =>
            ap.userId === userId &&
            ap.lessonId === lesson.id &&
            ap.progressType === progressType &&
            ap.status === "completed" &&
            (!options?.assignmentId ||
              ap.remedialAssignmentId === options.assignmentId)
        )
        .map((ap) => ap.activityId);

  return {
    lesson,
    unit,
    activities,
    completedActivityIds,
    mode,
    remedialAssignmentId: options?.assignmentId,
    access: { allowed: true },
  };
}

export function markLessonMaterialDone(params: {
  userId: string;
  lessonId: string;
  activityId: string;
  mode: "regular" | "remedial" | "preview";
  assignmentId?: string;
}): void {
  if (params.mode === "preview") return;
  mutateLocalDb((db) => {
    const progressType = params.mode === "remedial" ? "remedial" : "regular";
    const existing = db.activityProgress.find(
      (ap) =>
        ap.userId === params.userId &&
        ap.lessonId === params.lessonId &&
        ap.activityId === params.activityId &&
        ap.progressType === progressType &&
        (params.assignmentId
          ? ap.remedialAssignmentId === params.assignmentId
          : !ap.remedialAssignmentId)
    );
    const now = new Date().toISOString();
    if (existing) {
      existing.status = "completed";
      existing.completedAt = now;
    } else {
      db.activityProgress.push({
        id: newId("ap"),
        userId: params.userId,
        lessonId: params.lessonId,
        activityId: params.activityId,
        progressType,
        remedialAssignmentId: params.assignmentId ?? null,
        status: "completed",
        completedAt: now,
      });
    }
  });
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

export function evaluateLessonAttempt(params: {
  userId: string;
  lessonId: string;
  responses: Record<string, QuestionResponseData>;
  completedMaterialIds: string[];
  mode: "regular" | "remedial" | "preview";
  assignmentId?: string;
}): LessonEvaluationResult {
  return mutateLocalDb((db) => {
    const lesson = db.lessons.find((l) => l.id === params.lessonId);
    if (!lesson) {
      throw new Error("Lesson tidak ditemukan.");
    }

    const activities = db.activities.filter((a) => a.lessonId === lesson.id);
    const exerciseActivityIds = activities
      .filter((a) => a.activityType === "exercise")
      .map((a) => a.id);

    const questions = db.lessonQuestions
      .filter((q) => exerciseActivityIds.includes(q.activityId))
      .sort((a, b) => a.orderNumber - b.orderNumber);

    let earnedTotal = 0;
    let maxTotal = 0;
    const feedbacks: QuestionFeedbackItem[] = [];

    for (const q of questions) {
      const keyEntry = db.lessonAnswerKeys.find((k) => k.questionId === q.id);
      const key: AnswerKey = keyEntry?.answerKey ?? { correctOption: "" };
      const graded = gradeQuestion(
        q.questionType,
        q.questionData,
        key,
        params.responses[q.id],
        q.points
      );
      earnedTotal += graded.earnedPoints;
      maxTotal += graded.maxPoints;
      feedbacks.push({
        questionId: q.id,
        isCorrect: graded.isCorrect,
        earnedPoints: graded.earnedPoints,
        maxPoints: graded.maxPoints,
        correctSummary: graded.correctSummary,
        explanation: q.explanation,
      });
    }

    const score =
      questions.length === 0 ? 100 : calculatePercentageScore(earnedTotal, maxTotal);
    const requiredMaterials = activities.filter(
      (a) => a.activityType === "material" && a.isRequired
    );
    const allMaterialsCompleted = requiredMaterials.every((m) =>
      params.completedMaterialIds.includes(m.id)
    );
    const allQuestionsAnswered = questions.every((q) => Boolean(params.responses[q.id]));
    const passed =
      allMaterialsCompleted && allQuestionsAnswered && isScorePassed(score);

    // Mode Pratinjau bersifat stateless (SDD 4.3.6): evaluasi dihitung tanpa menulis DB
    if (params.mode === "preview") {
      return { score, passed, xpAwarded: 0, feedbacks, mode: "preview" };
    }

    const now = new Date().toISOString();
    const attemptType = params.mode === "remedial" ? "remedial" : "regular";
    const priorAttempts = db.lessonAttempts.filter(
      (a) =>
        a.userId === params.userId &&
        a.lessonId === lesson.id &&
        a.attemptType === attemptType
    );

    const attemptId = newId("la");
    db.lessonAttempts.push({
      id: attemptId,
      userId: params.userId,
      lessonId: lesson.id,
      attemptType,
      remedialAssignmentId: params.assignmentId ?? null,
      attemptNumber: priorAttempts.length + 1,
      score,
      status: passed ? "passed" : "failed",
      contentVersion: lesson.contentVersion,
      startedAt: now,
      completedAt: now,
    });

    for (const fb of feedbacks) {
      db.lessonResponses.push({
        id: newId("lr"),
        attemptId,
        questionId: fb.questionId,
        responseData: params.responses[fb.questionId] ?? { selectedOption: "" },
        isCorrect: fb.isCorrect,
        earnedPoints: fb.earnedPoints,
        submittedAt: now,
      });
    }

    // Simpan materi & latihan yang sudah diselesaikan
    for (const act of activities) {
      if (
        act.activityType === "material" &&
        !params.completedMaterialIds.includes(act.id)
      ) {
        continue;
      }
      const exists = db.activityProgress.find(
        (ap) =>
          ap.userId === params.userId &&
          ap.lessonId === lesson.id &&
          ap.activityId === act.id &&
          ap.progressType === attemptType &&
          (params.assignmentId
            ? ap.remedialAssignmentId === params.assignmentId
            : !ap.remedialAssignmentId)
      );
      if (!exists) {
        db.activityProgress.push({
          id: newId("ap"),
          userId: params.userId,
          lessonId: lesson.id,
          activityId: act.id,
          progressType: attemptType,
          remedialAssignmentId: params.assignmentId ?? null,
          status: "completed",
          completedAt: now,
        });
      }
    }

    let xpAwarded = 0;

    if (attemptType === "regular") {
      const existingProg = db.lessonProgress.find(
        (p) => p.userId === params.userId && p.lessonId === lesson.id
      );
      if (existingProg) {
        existingProg.bestScore = Math.max(existingProg.bestScore, score);
        if (passed) {
          existingProg.status = "completed";
          existingProg.completedContentVersion = lesson.contentVersion;
          existingProg.completedAt = existingProg.completedAt ?? now;
        }
      } else {
        db.lessonProgress.push({
          id: newId("llp"),
          userId: params.userId,
          lessonId: lesson.id,
          completedContentVersion: lesson.contentVersion,
          bestScore: score,
          status: passed ? "completed" : "in_progress",
          completedAt: passed ? now : null,
        });
      }

      xpAwarded = getXpAwardIfEligible({
        transactions: db.xpTransactions,
        userId: params.userId,
        activityType: "lesson",
        referenceId: lesson.id,
        passed,
      });
      if (xpAwarded > 0) {
        db.xpTransactions.push({
          id: newId("xp"),
          userId: params.userId,
          activityType: "lesson",
          referenceId: lesson.id,
          xpAmount: xpAwarded,
          label: `Lulus Lesson ${lesson.title}`,
          createdAt: now,
        });
      }
    } else {
      // Remedial terpisah (FR-REC-010, FR-REC-013)
      const assignment = db.remedialAssignments.find(
        (r) =>
          r.userId === params.userId &&
          (params.assignmentId ? r.id === params.assignmentId : r.lessonId === lesson.id && r.status !== "completed")
      );
      if (assignment) {
        if (passed) {
          assignment.status = "completed";
          assignment.completedAt = now;
        } else {
          assignment.status = "in_progress";
        }
      }

      xpAwarded = getXpAwardIfEligible({
        transactions: db.xpTransactions,
        userId: params.userId,
        activityType: "remedial",
        referenceId: lesson.id,
        passed,
      });
      if (xpAwarded > 0) {
        db.xpTransactions.push({
          id: newId("xp"),
          userId: params.userId,
          activityType: "remedial",
          referenceId: lesson.id,
          xpAmount: xpAwarded,
          label: `Selesai Remedial ${lesson.title}`,
          createdAt: now,
        });
      }
    }

    return {
      score,
      passed,
      xpAwarded,
      feedbacks,
      mode: attemptType,
    };
  });
}

// ==========================================
// QUIZ UNIT & REKOMENDASI ADAPTIF
// ==========================================

export interface QuizRunnerPayload {
  quiz: UnitQuiz;
  unit: Unit;
  questions: PublicQuestion[];
  lessonTitles: Record<string, string>;
  access: { allowed: boolean; reason?: string };
  isPreview: boolean;
}

export function getQuizForRunner(
  userId: string,
  unitId: string,
  options?: { isPreview?: boolean }
): QuizRunnerPayload | null {
  const db = readLocalDb();
  const unit = db.units.find((u) => u.id === unitId);
  const quiz = db.unitQuizzes.find((q) => q.unitId === unitId);
  if (!unit || !quiz) return null;

  const isPreview = Boolean(options?.isPreview);
  if (!isPreview && quiz.status !== "published") {
    return {
      quiz,
      unit,
      questions: [],
      lessonTitles: {},
      isPreview,
      access: {
        allowed: false,
        reason: "Quiz Unit ini belum diterbitkan oleh Admin.",
      },
    };
  }

  const unlockedSet = new Set(
    db.unitUnlocks.filter((u) => u.userId === userId).map((u) => u.unitId)
  );
  const unitUnlocked = isUnitUnlocked({
    unitOrder: unit.orderNumber,
    unitId: unit.id,
    unlockedUnitIds: unlockedSet,
    isPreview,
  });

  const unitLessons = db.lessons.filter(
    (l) => l.unitId === unit.id && l.status === "published"
  );
  const allFivePassed =
    unitLessons.length >= 5 &&
    unitLessons.every((l) =>
      db.lessonProgress.some(
        (p) =>
          p.userId === userId &&
          p.lessonId === l.id &&
          p.status === "completed" &&
          p.completedContentVersion >= l.contentVersion
      )
    );

  const pendingRemedialCount = db.remedialAssignments.filter(
    (r) =>
      r.userId === userId && r.unitId === unit.id && r.status !== "completed"
  ).length;

  const access = canStartQuiz({
    unitUnlocked,
    allFiveLessonsPassed: allFivePassed,
    pendingRemedialCount,
    isPreview,
  });

  const questions = db.quizQuestions
    .filter((q) => q.quizId === quiz.id)
    .sort((a, b) => a.orderNumber - b.orderNumber)
    .map(toPublicQuizQuestion);

  const lessonTitles: Record<string, string> = {};
  for (const l of db.lessons.filter((item) => item.unitId === unit.id)) {
    lessonTitles[l.id] = `${unit.orderNumber}.${l.orderNumber} ${l.title}`;
  }

  return {
    quiz,
    unit,
    questions,
    lessonTitles,
    access,
    isPreview,
  };
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

export function evaluateQuizAttempt(params: {
  userId: string;
  unitId: string;
  responses: Record<string, QuestionResponseData>;
  isPreview: boolean;
}): QuizEvaluationResult {
  return mutateLocalDb((db) => {
    const unit = db.units.find((u) => u.id === params.unitId);
    const quiz = db.unitQuizzes.find((q) => q.unitId === params.unitId);
    if (!unit || !quiz) {
      throw new Error("Quiz Unit tidak ditemukan.");
    }

    const questions = db.quizQuestions
      .filter((q) => q.quizId === quiz.id)
      .sort((a, b) => a.orderNumber - b.orderNumber);

    const unitLessons = db.lessons.filter((l) => l.unitId === unit.id);
    const lessonOrderById: Record<string, number> = {};
    const lessonTitleById: Record<string, string> = {};
    for (const l of unitLessons) {
      lessonOrderById[l.id] = l.orderNumber;
      lessonTitleById[l.id] = `${unit.orderNumber}.${l.orderNumber} ${l.title}`;
    }

    let earnedTotal = 0;
    let maxTotal = 0;
    const wrongPrimaryLessonIds: string[] = [];
    const feedbacks: Array<QuestionFeedbackItem & { primaryLessonTitle: string }> =
      [];

    for (const q of questions) {
      const keyEntry = db.quizAnswerKeys.find((k) => k.questionId === q.id);
      const key: AnswerKey = keyEntry?.answerKey ?? { correctOption: "" };
      const graded = gradeQuestion(
        q.questionType,
        q.questionData,
        key,
        params.responses[q.id],
        q.points
      );
      earnedTotal += graded.earnedPoints;
      maxTotal += graded.maxPoints;

      if (!graded.isCorrect) {
        wrongPrimaryLessonIds.push(q.primaryLessonId);
      }

      feedbacks.push({
        questionId: q.id,
        isCorrect: graded.isCorrect,
        earnedPoints: graded.earnedPoints,
        maxPoints: graded.maxPoints,
        correctSummary: graded.correctSummary,
        explanation: q.explanation,
        primaryLessonTitle: lessonTitleById[q.primaryLessonId] ?? "Lesson",
      });
    }

    const score = calculatePercentageScore(earnedTotal, maxTotal);
    const passed = isScorePassed(score);

    const plan = passed
      ? []
      : generateRemedialPlan({ wrongPrimaryLessonIds, lessonOrderById });

    const recommendations = plan.map((item) => ({
      ...item,
      lessonTitle: lessonTitleById[item.lessonId] ?? "Lesson",
      lessonOrder: lessonOrderById[item.lessonId] ?? 99,
    }));

    if (params.isPreview) {
      return {
        score,
        passed,
        xpAwarded: 0,
        unlockedUnitTitle: null,
        recommendations,
        feedbacks,
        isPreview: true,
      };
    }

    const now = new Date().toISOString();
    const prevAttempts = db.quizAttempts.filter(
      (qa) => qa.userId === params.userId && qa.quizId === quiz.id
    );
    const attemptId = newId("qa");

    db.quizAttempts.push({
      id: attemptId,
      userId: params.userId,
      quizId: quiz.id,
      attemptNumber: prevAttempts.length + 1,
      score,
      status: passed ? "passed" : "failed",
      contentVersion: quiz.contentVersion,
      startedAt: now,
      completedAt: now,
    });

    for (const fb of feedbacks) {
      db.quizResponses.push({
        id: newId("qr"),
        attemptId,
        questionId: fb.questionId,
        responseData: params.responses[fb.questionId] ?? { selectedOption: "" },
        isCorrect: fb.isCorrect,
        earnedPoints: fb.earnedPoints,
        submittedAt: now,
      });
    }

    let xpAwarded = 0;
    let unlockedUnitTitle: string | null = null;

    if (passed) {
      // Tandai sisa tugas remedial pada unit ini selesai bila ada
      for (const r of db.remedialAssignments) {
        if (r.userId === params.userId && r.unitId === unit.id && r.status !== "completed") {
          r.status = "completed";
          r.completedAt = now;
        }
      }

      xpAwarded = getXpAwardIfEligible({
        transactions: db.xpTransactions,
        userId: params.userId,
        activityType: "quiz",
        referenceId: quiz.id,
        passed: true,
      });
      if (xpAwarded > 0) {
        db.xpTransactions.push({
          id: newId("xp"),
          userId: params.userId,
          activityType: "quiz",
          referenceId: quiz.id,
          xpAmount: xpAwarded,
          label: `Lulus ${quiz.title}`,
          createdAt: now,
        });
      }

      const nextUnit = db.units.find(
        (u) => u.orderNumber === unit.orderNumber + 1
      );
      if (nextUnit) {
        const alreadyUnlocked = db.unitUnlocks.some(
          (uu) => uu.userId === params.userId && uu.unitId === nextUnit.id
        );
        if (!alreadyUnlocked) {
          db.unitUnlocks.push({
            id: newId("uu"),
            userId: params.userId,
            unitId: nextUnit.id,
            unlockedAt: now,
          });
          unlockedUnitTitle = `Unit ${nextUnit.orderNumber}: ${nextUnit.title}`;
        }
      }
    } else {
      for (const rec of recommendations) {
        const lObj = unitLessons.find((l) => l.id === rec.lessonId);
        db.remedialAssignments.push({
          id: newId("rem"),
          userId: params.userId,
          quizAttemptId: attemptId,
          unitId: unit.id,
          lessonId: rec.lessonId,
          errorCount: rec.errorCount,
          priorityOrder: rec.priorityOrder,
          contentVersion: lObj?.contentVersion ?? 1,
          status: "pending",
          createdAt: now,
          completedAt: null,
        });
      }
    }

    return {
      score,
      passed,
      xpAwarded,
      unlockedUnitTitle,
      recommendations,
      feedbacks,
      isPreview: false,
    };
  });
}

// ==========================================
// KAMUS, LEADERBOARD & PROFIL
// ==========================================

export function listVocabularies(includeUnpublished = false): Vocabulary[] {
  const db = readLocalDb();
  const list = includeUnpublished
    ? db.vocabularies
    : db.vocabularies.filter((v) => v.validationStatus === "published");
  return [...list].sort((a, b) => a.unitNumber - b.unitNumber);
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

export function getLeaderboardData(currentUserId: string): LeaderboardEntry[] {
  const db = readLocalDb();
  const learners = db.profiles.filter((p) => p.role === "learner" && p.isActive);

  const scored = learners.map((learner) => {
    const totalXp = db.xpTransactions
      .filter((tx) => tx.userId === learner.id)
      .reduce((sum, tx) => sum + tx.xpAmount, 0);
    const completedLessons = db.lessonProgress.filter(
      (lp) => lp.userId === learner.id && lp.status === "completed"
    ).length;
    return {
      userId: learner.id,
      fullName: learner.fullName,
      totalXp,
      levelTitle: calculateLevel(totalXp).title,
      completedLessons,
      isCurrentUser: learner.id === currentUserId,
    };
  });

  scored.sort((a, b) => b.totalXp - a.totalXp || b.completedLessons - a.completedLessons);

  return scored.map((entry, idx) => ({
    ...entry,
    rank: idx + 1,
  }));
}

export function getLearnerProfileDetails(userId: string) {
  const db = readLocalDb();
  const profile = db.profiles.find((p) => p.id === userId) ?? null;
  const xpTransactions = db.xpTransactions
    .filter((tx) => tx.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const totalXp = xpTransactions.reduce((sum, tx) => sum + tx.xpAmount, 0);
  const completedLessons = db.lessonProgress.filter(
    (p) => p.userId === userId && p.status === "completed"
  );
  const unlockedUnits = db.unitUnlocks.filter((uu) => uu.userId === userId);
  const quizAttempts = db.quizAttempts
    .filter((qa) => qa.userId === userId)
    .map((qa) => {
      const quiz = db.unitQuizzes.find((q) => q.id === qa.quizId);
      return {
        ...qa,
        quizTitle: quiz?.title ?? "Quiz Unit",
      };
    })
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const remedials = db.remedialAssignments
    .filter((r) => r.userId === userId)
    .map((r) => {
      const lesson = db.lessons.find((l) => l.id === r.lessonId);
      return {
        ...r,
        lessonTitle: lesson?.title ?? "Lesson",
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const passedQuizIds = new Set(
    quizAttempts.filter((q) => q.status === "passed").map((q) => q.quizId)
  );
  const completedRemedials = remedials.filter((r) => r.status === "completed");

  return {
    profile,
    totalXp,
    level: calculateLevel(totalXp),
    badges: computeBadges({
      completedLessonsCount: completedLessons.length,
      passedQuizzesCount: passedQuizIds.size,
      completedRemedialsCount: completedRemedials.length,
      totalXp,
    }),
    completedLessonsCount: completedLessons.length,
    unlockedUnitsCount: unlockedUnits.length,
    quizAttempts,
    remedials,
    xpTransactions,
  };
}

// ==========================================
// VALIDATOR PANEL QUERIES & ACTIONS
// ==========================================

export function getValidatorQueueData() {
  const db = readLocalDb();
  const reviews = [...db.contentReviews].sort((a, b) =>
    b.submittedAt.localeCompare(a.submittedAt)
  );
  const counts = {
    pending: reviews.filter((r) => r.status === "pending").length,
    approved: reviews.filter((r) => r.status === "approved").length,
    changesRequested: reviews.filter((r) => r.status === "changes_requested")
      .length,
    total: reviews.length,
  };
  return { reviews, counts };
}

export function getPrivilegedContentDetail(
  type: "lesson" | "quiz",
  id: string
) {
  const db = readLocalDb();
  if (type === "lesson") {
    const lesson = db.lessons.find((l) => l.id === id);
    if (!lesson) return null;
    const unit = db.units.find((u) => u.id === lesson.unitId) ?? null;
    const activities = db.activities
      .filter((a) => a.lessonId === lesson.id)
      .sort((a, b) => a.orderNumber - b.orderNumber)
      .map((act) => {
        if (act.activityType === "material") {
          const mat = db.materials.find((m) => m.activityId === act.id) ?? null;
          const vocabIds = mat
            ? db.materialVocabularies
                .filter((mv) => mv.materialId === mat.id)
                .map((mv) => mv.vocabularyId)
            : [];
          const vocabularies = db.vocabularies.filter((v) =>
            vocabIds.includes(v.id)
          );
          const examples = mat
            ? db.materialExamples
                .filter((me) => me.materialId === mat.id)
                .sort((a, b) => a.orderNumber - b.orderNumber)
            : [];
          return { activity: act, material: mat, vocabularies, examples, questions: [] };
        }
        const questions = db.lessonQuestions
          .filter((q) => q.activityId === act.id)
          .sort((a, b) => a.orderNumber - b.orderNumber)
          .map((q) => ({
            question: q,
            answerKey:
              db.lessonAnswerKeys.find((k) => k.questionId === q.id)
                ?.answerKey ?? null,
          }));
        return { activity: act, material: null, vocabularies: [], examples: [], questions };
      });
    const reviews = db.contentReviews
      .filter((r) => r.lessonId === lesson.id)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

    return { type: "lesson" as const, lesson, unit, activities, reviews };
  }

  const quiz = db.unitQuizzes.find((q) => q.id === id);
  if (!quiz) return null;
  const unit = db.units.find((u) => u.id === quiz.unitId) ?? null;
  const unitLessons = db.lessons
    .filter((l) => l.unitId === quiz.unitId)
    .sort((a, b) => a.orderNumber - b.orderNumber);
  const questions = db.quizQuestions
    .filter((q) => q.quizId === quiz.id)
    .sort((a, b) => a.orderNumber - b.orderNumber)
    .map((q) => ({
      question: q,
      answerKey:
        db.quizAnswerKeys.find((k) => k.questionId === q.id)?.answerKey ?? null,
      primaryLessonTitle:
        unitLessons.find((l) => l.id === q.primaryLessonId)?.title ?? "Lesson",
    }));
  const reviews = db.contentReviews
    .filter((r) => r.quizId === quiz.id)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));

  return { type: "quiz" as const, quiz, unit, unitLessons, questions, reviews };
}

export function applyReviewDecision(params: {
  reviewId: string;
  reviewerId: string;
  reviewerName: string;
  decision: "approved" | "changes_requested";
  note: string;
}): { ok: boolean; error?: string } {
  if (params.decision === "changes_requested" && !params.note.trim()) {
    return {
      ok: false,
      error: "Catatan revisi wajib diisi saat meminta perbaikan konten.",
    };
  }

  return mutateLocalDb((db) => {
    const review = db.contentReviews.find((r) => r.id === params.reviewId);
    if (!review) {
      return { ok: false, error: "Data pengajuan review tidak ditemukan." };
    }

    const now = new Date().toISOString();
    review.status = params.decision;
    review.reviewedBy = params.reviewerId;
    review.reviewedByName = params.reviewerName;
    review.reviewNote = params.note.trim();
    review.reviewedAt = now;

    // Validator hanya dapat menyetujui atau meminta revisi, TIDAK pernah langsung published (FR-VALID-008)
    const nextContentStatus: ContentStatus =
      params.decision === "approved" ? "approved" : "changes_requested";

    if (review.lessonId) {
      const lesson = db.lessons.find((l) => l.id === review.lessonId);
      if (lesson) {
        lesson.status = nextContentStatus;
        lesson.updatedAt = now;
      }
    } else if (review.quizId) {
      const quiz = db.unitQuizzes.find((q) => q.id === review.quizId);
      if (quiz) {
        quiz.status = nextContentStatus;
      }
    }

    return { ok: true };
  });
}

// ==========================================
// ADMIN PANEL QUERIES & ACTIONS
// ==========================================

export function getAdminDashboardData() {
  const db = readLocalDb();
  const allLessons = db.lessons;
  const allQuizzes = db.unitQuizzes;

  const countByStatus = (status: ContentStatus) =>
    allLessons.filter((l) => l.status === status).length +
    allQuizzes.filter((q) => q.status === status).length;

  const pipeline = {
    draft: countByStatus("draft"),
    pendingReview: countByStatus("pending_review"),
    changesRequested: countByStatus("changes_requested"),
    approved: countByStatus("approved"),
    published: countByStatus("published"),
  };

  const priorityLessons = allLessons
    .filter(
      (l) =>
        l.status === "changes_requested" ||
        l.status === "approved" ||
        l.status === "pending_review"
    )
    .map((l) => ({
      lesson: l,
      unit: db.units.find((u) => u.id === l.unitId) ?? null,
    }));

  const learners = db.profiles.filter((p) => p.role === "learner");
  const validators = db.profiles.filter((p) => p.role === "validator");

  const learnerSummaries = learners.map((learner) => {
    const totalXp = db.xpTransactions
      .filter((tx) => tx.userId === learner.id)
      .reduce((s, t) => s + t.xpAmount, 0);
    const completedLessons = db.lessonProgress.filter(
      (p) => p.userId === learner.id && p.status === "completed"
    ).length;
    return {
      profile: learner,
      totalXp,
      completedLessons,
    };
  });

  return {
    pipeline,
    priorityLessons,
    validatorsCount: validators.length,
    learnersCount: learners.length,
    learnerSummaries,
    units: [...db.units].sort((a, b) => a.orderNumber - b.orderNumber),
    lessons: allLessons,
    quizzes: allQuizzes,
  };
}

export function getAdminUnitsOverview() {
  const db = readLocalDb();
  const units = [...db.units].sort((a, b) => a.orderNumber - b.orderNumber);
  return units.map((unit) => {
    const lessons = db.lessons
      .filter((l) => l.unitId === unit.id)
      .sort((a, b) => a.orderNumber - b.orderNumber)
      .map((lesson) => ({
        lesson,
        activityCount: db.activities.filter((a) => a.lessonId === lesson.id)
          .length,
      }));
    const quiz = db.unitQuizzes.find((q) => q.unitId === unit.id) ?? null;
    return { unit, lessons, quiz };
  });
}

export function createNewLesson(params: {
  unitId: string;
  title: string;
  description: string;
  objective: string;
}): { ok: boolean; lessonId?: string; error?: string } {
  if (!params.title.trim()) {
    return { ok: false, error: "Judul lesson wajib diisi." };
  }
  return mutateLocalDb((db) => {
    const unitLessons = db.lessons.filter((l) => l.unitId === params.unitId);
    const maxOrder = unitLessons.reduce(
      (max, l) => Math.max(max, l.orderNumber),
      0
    );
    const now = new Date().toISOString();
    const lessonId = newId("lesson");
    db.lessons.push({
      id: lessonId,
      unitId: params.unitId,
      title: params.title.trim(),
      description: params.description.trim(),
      objective: params.objective.trim(),
      orderNumber: maxOrder + 1,
      contentVersion: 1,
      status: "draft",
      createdAt: now,
      updatedAt: now,
    });
    return { ok: true, lessonId };
  });
}

function handlePublishedEditVersioning(lesson: Lesson) {
  if (lesson.status === "published") {
    lesson.contentVersion += 1;
    lesson.status = "draft";
  } else if (lesson.status === "approved" || lesson.status === "changes_requested") {
    lesson.status = "draft";
  }
  lesson.updatedAt = new Date().toISOString();
}

export function updateLessonDetails(params: {
  lessonId: string;
  title: string;
  description: string;
  objective: string;
}): { ok: boolean; error?: string } {
  return mutateLocalDb((db) => {
    const lesson = db.lessons.find((l) => l.id === params.lessonId);
    if (!lesson) return { ok: false, error: "Lesson tidak ditemukan." };
    if (lesson.status === "pending_review") {
      return {
        ok: false,
        error:
          "Konten sedang Menunggu Review. Batalkan pengajuan dulu sebelum mengubah.",
      };
    }
    lesson.title = params.title.trim() || lesson.title;
    lesson.description = params.description.trim();
    lesson.objective = params.objective.trim();
    handlePublishedEditVersioning(lesson);
    return { ok: true };
  });
}

export function addMaterialActivity(params: {
  lessonId: string;
  title: string;
  instruction: string;
  content: string;
  explanation: string;
  examplePasan?: string;
  exampleTranslation?: string;
}): { ok: boolean; error?: string } {
  return mutateLocalDb((db) => {
    const lesson = db.lessons.find((l) => l.id === params.lessonId);
    if (!lesson) return { ok: false, error: "Lesson tidak ditemukan." };
    if (lesson.status === "pending_review") {
      return {
        ok: false,
        error: "Batalkan pengajuan review terlebih dahulu untuk menambah aktivitas.",
      };
    }
    const existingActs = db.activities.filter((a) => a.lessonId === lesson.id);
    const maxOrder = existingActs.reduce(
      (max, a) => Math.max(max, a.orderNumber),
      0
    );
    const now = new Date().toISOString();
    const activityId = newId("act");
    const materialId = newId("mat");

    db.activities.push({
      id: activityId,
      lessonId: lesson.id,
      activityType: "material",
      title: params.title.trim() || "Materi Baru",
      instruction: params.instruction.trim() || "Baca materi singkat ini.",
      orderNumber: maxOrder + 1,
      isRequired: true,
      createdAt: now,
    });
    db.materials.push({
      id: materialId,
      activityId,
      content: params.content.trim(),
      explanation: params.explanation.trim(),
      estimatedDuration: 60,
    });
    if (params.examplePasan?.trim()) {
      db.materialExamples.push({
        id: newId("me"),
        materialId,
        pasanText: params.examplePasan.trim(),
        indonesianTranslation: params.exampleTranslation?.trim() ?? "",
        orderNumber: 1,
      });
    }
    handlePublishedEditVersioning(lesson);
    return { ok: true };
  });
}

export function updateMaterialActivity(params: {
  lessonId: string;
  activityId: string;
  title: string;
  content: string;
  explanation: string;
}): { ok: boolean; error?: string } {
  return mutateLocalDb((db) => {
    const lesson = db.lessons.find((l) => l.id === params.lessonId);
    const activity = db.activities.find((a) => a.id === params.activityId);
    const mat = db.materials.find((m) => m.activityId === params.activityId);
    if (!lesson || !activity || !mat) {
      return { ok: false, error: "Aktivitas materi tidak ditemukan." };
    }
    if (lesson.status === "pending_review") {
      return {
        ok: false,
        error: "Konten sedang menunggu review. Batalkan pengajuan dulu.",
      };
    }
    activity.title = params.title.trim() || activity.title;
    mat.content = params.content.trim();
    mat.explanation = params.explanation.trim();
    handlePublishedEditVersioning(lesson);
    return { ok: true };
  });
}

export function addExerciseQuestionActivity(params: {
  lessonId: string;
  title: string;
  questionType: QuestionType;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  correctOption: "A" | "B" | "C";
  explanation: string;
}): { ok: boolean; error?: string } {
  return mutateLocalDb((db) => {
    const lesson = db.lessons.find((l) => l.id === params.lessonId);
    if (!lesson) return { ok: false, error: "Lesson tidak ditemukan." };
    if (lesson.status === "pending_review") {
      return {
        ok: false,
        error: "Konten sedang menunggu review. Batalkan pengajuan dulu.",
      };
    }
    const existingActs = db.activities.filter((a) => a.lessonId === lesson.id);
    const maxOrder = existingActs.reduce(
      (max, a) => Math.max(max, a.orderNumber),
      0
    );
    const now = new Date().toISOString();
    const activityId = newId("act");
    const questionId = newId("lq");

    db.activities.push({
      id: activityId,
      lessonId: lesson.id,
      activityType: "exercise",
      title: params.title.trim() || "Latihan Pilihan Ganda",
      instruction: "Pilih jawaban yang paling tepat.",
      orderNumber: maxOrder + 1,
      isRequired: true,
      createdAt: now,
    });

    const qType =
      params.questionType === "multiple_choice_id_to_pasan"
        ? "multiple_choice_id_to_pasan"
        : "multiple_choice_pasan_to_id";

    const qData: QuestionData = {
      type: qType,
      options: [
        { id: "A", label: params.optionA.trim() || "Pilihan A" },
        { id: "B", label: params.optionB.trim() || "Pilihan B" },
        { id: "C", label: params.optionC.trim() || "Pilihan C" },
      ],
    };

    db.lessonQuestions.push({
      id: questionId,
      activityId,
      questionType: qType,
      questionText: params.questionText.trim(),
      questionData: qData,
      explanation: params.explanation.trim(),
      points: 10,
      orderNumber: 1,
    });
    db.lessonAnswerKeys.push({
      questionId,
      answerKey: { correctOption: params.correctOption },
    });

    handlePublishedEditVersioning(lesson);
    return { ok: true };
  });
}

export function moveLessonActivityOrder(params: {
  lessonId: string;
  activityId: string;
  direction: "up" | "down";
}): { ok: boolean; error?: string } {
  return mutateLocalDb((db) => {
    const lesson = db.lessons.find((l) => l.id === params.lessonId);
    if (!lesson) return { ok: false, error: "Lesson tidak ditemukan." };
    if (lesson.status === "pending_review") {
      return {
        ok: false,
        error: "Konten sedang menunggu review. Batalkan pengajuan dulu.",
      };
    }
    const acts = db.activities
      .filter((a) => a.lessonId === lesson.id)
      .sort((a, b) => a.orderNumber - b.orderNumber);

    const idx = acts.findIndex((a) => a.id === params.activityId);
    if (idx === -1) return { ok: false, error: "Aktivitas tidak ditemukan." };

    const targetIdx = params.direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= acts.length) return { ok: true };

    const tempOrder = acts[idx].orderNumber;
    acts[idx].orderNumber = acts[targetIdx].orderNumber;
    acts[targetIdx].orderNumber = tempOrder;

    handlePublishedEditVersioning(lesson);
    return { ok: true };
  });
}

export function submitContentForValidation(params: {
  type: "lesson" | "quiz";
  targetId: string;
  adminId: string;
  adminName: string;
}): { ok: boolean; error?: string } {
  return mutateLocalDb((db) => {
    const now = new Date().toISOString();
    if (params.type === "lesson") {
      const lesson = db.lessons.find((l) => l.id === params.targetId);
      if (!lesson) return { ok: false, error: "Lesson tidak ditemukan." };
      const unit = db.units.find((u) => u.id === lesson.unitId);
      lesson.status = "pending_review";
      lesson.updatedAt = now;
      db.contentReviews.push({
        id: newId("rev"),
        lessonId: lesson.id,
        quizId: null,
        contentTitle: `Lesson ${unit?.orderNumber ?? ""}.${lesson.orderNumber}: ${lesson.title}`,
        unitTitle: unit ? `Unit ${unit.orderNumber}: ${unit.title}` : "Unit",
        contentVersion: lesson.contentVersion,
        status: "pending",
        submittedBy: params.adminId,
        submittedByName: params.adminName,
        reviewedBy: null,
        reviewedByName: null,
        reviewNote: "",
        submittedAt: now,
        reviewedAt: null,
      });
      return { ok: true };
    }

    const quiz = db.unitQuizzes.find((q) => q.id === params.targetId);
    if (!quiz) return { ok: false, error: "Quiz tidak ditemukan." };
    const qCount = db.quizQuestions.filter((q) => q.quizId === quiz.id).length;
    if (qCount < 15 || qCount > 20) {
      return {
        ok: false,
        error: `Quiz Unit wajib memiliki 15 sampai 20 soal sebelum diajukan (saat ini ${qCount} soal).`,
      };
    }
    const unit = db.units.find((u) => u.id === quiz.unitId);
    quiz.status = "pending_review";
    db.contentReviews.push({
      id: newId("rev"),
      lessonId: null,
      quizId: quiz.id,
      contentTitle: `${quiz.title} (${qCount} Soal)`,
      unitTitle: unit ? `Unit ${unit.orderNumber}: ${unit.title}` : "Unit",
      contentVersion: quiz.contentVersion,
      status: "pending",
      submittedBy: params.adminId,
      submittedByName: params.adminName,
      reviewedBy: null,
      reviewedByName: null,
      reviewNote: "",
      submittedAt: now,
      reviewedAt: null,
    });
    return { ok: true };
  });
}

export function cancelPendingReviewSubmission(params: {
  type: "lesson" | "quiz";
  targetId: string;
}): { ok: boolean; error?: string } {
  return mutateLocalDb((db) => {
    if (params.type === "lesson") {
      const lesson = db.lessons.find((l) => l.id === params.targetId);
      if (!lesson) return { ok: false, error: "Lesson tidak ditemukan." };
      lesson.status = "draft";
      lesson.updatedAt = new Date().toISOString();
      db.contentReviews = db.contentReviews.filter(
        (r) => !(r.lessonId === lesson.id && r.status === "pending")
      );
      return { ok: true };
    }

    const quiz = db.unitQuizzes.find((q) => q.id === params.targetId);
    if (!quiz) return { ok: false, error: "Quiz tidak ditemukan." };
    quiz.status = "draft";
    db.contentReviews = db.contentReviews.filter(
      (r) => !(r.quizId === quiz.id && r.status === "pending")
    );
    return { ok: true };
  });
}

export function publishApprovedContent(params: {
  type: "lesson" | "quiz";
  targetId: string;
}): { ok: boolean; error?: string } {
  return mutateLocalDb((db) => {
    if (params.type === "lesson") {
      const lesson = db.lessons.find((l) => l.id === params.targetId);
      if (!lesson) return { ok: false, error: "Lesson tidak ditemukan." };
      if (lesson.status !== "approved") {
        return {
          ok: false,
          error: "Hanya konten berstatus Disetujui Validator yang dapat diterbitkan.",
        };
      }
      lesson.status = "published";
      lesson.updatedAt = new Date().toISOString();
      return { ok: true };
    }

    const quiz = db.unitQuizzes.find((q) => q.id === params.targetId);
    if (!quiz) return { ok: false, error: "Quiz tidak ditemukan." };
    if (quiz.status !== "approved") {
      return {
        ok: false,
        error: "Hanya quiz berstatus Disetujui Validator yang dapat diterbitkan.",
      };
    }
    quiz.status = "published";
    return { ok: true };
  });
}

export function getAdminQuizzesOverview() {
  const db = readLocalDb();
  const units = [...db.units].sort((a, b) => a.orderNumber - b.orderNumber);
  return units.map((unit) => {
    const quiz = db.unitQuizzes.find((q) => q.unitId === unit.id) ?? null;
    const unitLessons = db.lessons
      .filter((l) => l.unitId === unit.id)
      .sort((a, b) => a.orderNumber - b.orderNumber);
    const questions = quiz
      ? db.quizQuestions
          .filter((q) => q.quizId === quiz.id)
          .sort((a, b) => a.orderNumber - b.orderNumber)
          .map((q) => ({
            question: q,
            answerKey:
              db.quizAnswerKeys.find((k) => k.questionId === q.id)?.answerKey ??
              null,
          }))
      : [];
    return { unit, quiz, unitLessons, questions };
  });
}

export function addQuizQuestionItem(params: {
  quizId: string;
  primaryLessonId: string;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  correctOption: "A" | "B" | "C";
  explanation: string;
}): { ok: boolean; error?: string } {
  return mutateLocalDb((db) => {
    const quiz = db.unitQuizzes.find((q) => q.id === params.quizId);
    if (!quiz) return { ok: false, error: "Quiz tidak ditemukan." };
    if (quiz.status === "pending_review") {
      return {
        ok: false,
        error: "Quiz sedang menunggu review. Batalkan pengajuan dulu.",
      };
    }
    const existing = db.quizQuestions.filter((q) => q.quizId === quiz.id);
    if (existing.length >= 20) {
      return {
        ok: false,
        error: "Batas maksimal Quiz Unit adalah 20 soal.",
      };
    }
    const maxOrder = existing.reduce(
      (max, q) => Math.max(max, q.orderNumber),
      0
    );
    const questionId = newId("qq");
    db.quizQuestions.push({
      id: questionId,
      quizId: quiz.id,
      primaryLessonId: params.primaryLessonId,
      questionType: "multiple_choice_pasan_to_id",
      questionText: params.questionText.trim(),
      questionData: {
        type: "multiple_choice_pasan_to_id",
        options: [
          { id: "A", label: params.optionA.trim() || "Pilihan A" },
          { id: "B", label: params.optionB.trim() || "Pilihan B" },
          { id: "C", label: params.optionC.trim() || "Pilihan C" },
        ],
      },
      explanation: params.explanation.trim(),
      points: 10,
      orderNumber: maxOrder + 1,
    });
    db.quizAnswerKeys.push({
      questionId,
      answerKey: { correctOption: params.correctOption },
    });
    if (quiz.status === "published") {
      quiz.contentVersion += 1;
      quiz.status = "draft";
    } else if (quiz.status === "approved" || quiz.status === "changes_requested") {
      quiz.status = "draft";
    }
    return { ok: true };
  });
}

export function listValidators(): Profile[] {
  const db = readLocalDb();
  return db.profiles.filter((p) => p.role === "validator");
}

export function createValidatorProfile(params: {
  fullName: string;
  email: string;
  password: string;
}): { ok: boolean; error?: string } {
  const email = params.email.trim().toLowerCase();
  if (!params.fullName.trim() || !email || params.password.length < 6) {
    return {
      ok: false,
      error: "Nama lengkap, email valid, dan sandi minimal 6 karakter wajib diisi.",
    };
  }
  return mutateLocalDb((db) => {
    if (db.profiles.some((p) => p.email.toLowerCase() === email)) {
      return { ok: false, error: "Email tersebut sudah terdaftar." };
    }
    const now = new Date().toISOString();
    const username = email.split("@")[0].replace(/[^a-z0-9]/g, "") || "validator";
    db.profiles.push({
      id: newId("val"),
      email,
      username,
      fullName: params.fullName.trim(),
      role: "validator",
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    db.passwords[email] = params.password;
    return { ok: true };
  });
}

export function toggleValidatorStatus(userId: string): { ok: boolean } {
  return mutateLocalDb((db) => {
    const profile = db.profiles.find(
      (p) => p.id === userId && p.role === "validator"
    );
    if (!profile) return { ok: false };
    profile.isActive = !profile.isActive;
    profile.updatedAt = new Date().toISOString();
    return { ok: true };
  });
}
