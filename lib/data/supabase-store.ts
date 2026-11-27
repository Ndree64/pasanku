import { cacheLife, cacheTag } from "next/cache";
import type {
  AnswerKey,
  ContentReview,
  ContentStatus,
  LearnerLessonProgress,
  Lesson,
  LessonActivity,
  LessonMaterial,
  LessonQuestion,
  MaterialExample,
  Profile,
  QuestionData,
  QuestionResponseData,
  QuestionType,
  QuizAttempt,
  QuizQuestion,
  RemedialAssignment,
  ReviewStatus,
  Unit,
  UnitQuiz,
  UserRole,
  Vocabulary,
  XpActivityType,
  XpTransaction,
} from "@/types/pasanku";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { toPublicLessonQuestion, toPublicQuizQuestion } from "@/lib/data/sanitize";
import { canStartQuiz, isLessonUnlocked, isUnitUnlocked } from "@/lib/domain/access";
import {
  calculateLevel,
  computeBadges,
  getXpAwardIfEligible,
} from "@/lib/domain/gamification";
import { generateRemedialPlan } from "@/lib/domain/recommendation";
import {
  calculatePercentageScore,
  gradeQuestion,
  isScorePassed,
} from "@/lib/domain/scoring";
import type {
  LeaderboardEntry,
  LearningPathPayload,
  LessonEvaluationResult,
  LessonRunnerPayload,
  PathLessonItem,
  PathUnitItem,
  QuestionFeedbackItem,
  QuizEvaluationResult,
  QuizRunnerPayload,
  RunnerActivityItem,
} from "@/lib/data/contracts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function mapUnit(r: Row): Unit {
  return {
    id: r.id,
    title: r.title,
    description: r.description ?? "",
    orderNumber: Number(r.order_number),
    status: r.status as ContentStatus,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapLesson(r: Row): Lesson {
  return {
    id: r.id,
    unitId: r.unit_id,
    title: r.title,
    description: r.description ?? "",
    objective: r.objective ?? "",
    orderNumber: Number(r.order_number),
    contentVersion: Number(r.content_version ?? 1),
    status: r.status as ContentStatus,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapActivity(r: Row): LessonActivity {
  return {
    id: r.id,
    lessonId: r.lesson_id,
    activityType: r.activity_type,
    title: r.title,
    instruction: r.instruction ?? "",
    orderNumber: Number(r.order_number),
    isRequired: Boolean(r.is_required),
    createdAt: r.created_at,
  };
}

function mapMaterial(r: Row): LessonMaterial {
  return {
    id: r.id,
    activityId: r.activity_id,
    content: r.content,
    explanation: r.explanation ?? "",
    estimatedDuration: Number(r.estimated_duration ?? 60),
  };
}

function mapExample(r: Row): MaterialExample {
  return {
    id: r.id,
    materialId: r.material_id,
    pasanText: r.pasan_text,
    indonesianTranslation: r.indonesian_translation,
    orderNumber: Number(r.order_number ?? 1),
  };
}

function mapLessonQuestion(r: Row): LessonQuestion {
  return {
    id: r.id,
    activityId: r.activity_id,
    questionType: r.question_type as QuestionType,
    questionText: r.question_text,
    questionData: r.question_data as QuestionData,
    explanation: r.explanation ?? "",
    points: Number(r.points ?? 10),
    orderNumber: Number(r.order_number ?? 1),
  };
}

function mapUnitQuiz(r: Row): UnitQuiz {
  return {
    id: r.id,
    unitId: r.unit_id,
    title: r.title,
    description: r.description ?? "",
    passingScore: Number(r.passing_score ?? 75),
    contentVersion: Number(r.content_version ?? 1),
    status: r.status as ContentStatus,
  };
}

function mapQuizQuestion(r: Row): QuizQuestion {
  return {
    id: r.id,
    quizId: r.quiz_id,
    primaryLessonId: r.primary_lesson_id,
    questionType: r.question_type as QuestionType,
    questionText: r.question_text,
    questionData: r.question_data as QuestionData,
    explanation: r.explanation ?? "",
    points: Number(r.points ?? 10),
    orderNumber: Number(r.order_number ?? 1),
  };
}

function mapQuizAttempt(r: Row): QuizAttempt {
  return {
    id: r.id,
    userId: r.user_id,
    quizId: r.quiz_id,
    attemptNumber: Number(r.attempt_number ?? 1),
    score: Number(r.score ?? 0),
    status: r.status,
    contentVersion: Number(r.content_version ?? 1),
    startedAt: r.started_at,
    completedAt: r.completed_at ?? null,
  };
}

function mapLessonProgress(r: Row): LearnerLessonProgress {
  return {
    id: r.id,
    userId: r.user_id,
    lessonId: r.lesson_id,
    completedContentVersion: Number(r.completed_content_version ?? 1),
    bestScore: Number(r.best_score ?? 0),
    status: r.status,
    completedAt: r.completed_at ?? null,
  };
}

function mapXp(
  r: Row,
  labelResolver?: (type: XpActivityType, refId: string) => string
): XpTransaction {
  const activityType = r.activity_type as XpActivityType;
  const referenceId = String(r.reference_id);
  const label = labelResolver
    ? labelResolver(activityType, referenceId)
    : `${activityType.toUpperCase()}`;
  return {
    id: r.id,
    userId: r.user_id,
    activityType,
    referenceId,
    xpAmount: Number(r.xp_amount ?? 0),
    label,
    createdAt: r.created_at,
  };
}

async function listAuthEmails(): Promise<Record<string, string>> {
  "use cache";
  cacheLife("minutes");
  cacheTag("profiles");

  const sb = createSupabaseAdminClient();
  const { data } = await sb.auth.admin.listUsers({ perPage: 200 });
  const map: Record<string, string> = {};
  for (const u of data?.users ?? []) {
    if (u.id && u.email) map[u.id] = u.email;
  }
  return map;
}

function mapProfiles(rows: Row[], emailMap: Record<string, string>): Profile[] {
  return rows.map((r) => {
    const email = emailMap[r.id] ?? "";
    return {
      id: r.id,
      email,
      username: r.username ?? (email ? email.split("@")[0] : "pengguna"),
      fullName: r.full_name,
      role: r.role as UserRole,
      isActive: Boolean(r.is_active ?? true),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  });
}

function enrichVocabularies(params: {
  vocabs: Row[];
  matVocabs: Row[];
  materials: Row[];
  activities: Row[];
  lessons: Lesson[];
  units: Unit[];
  examples: Row[];
}): Vocabulary[] {
  const matById = new Map(params.materials.map((m) => [m.id, m]));
  const actById = new Map(params.activities.map((a) => [a.id, a]));
  const lessonById = new Map(params.lessons.map((l) => [l.id, l]));
  const unitById = new Map(params.units.map((u) => [u.id, u]));

  return params.vocabs.map((v) => {
    const link = params.matVocabs.find((mv) => mv.vocabulary_id === v.id);
    const mat = link ? matById.get(link.material_id) : undefined;
    const act = mat ? actById.get(mat.activity_id) : undefined;
    const lesson = act ? lessonById.get(act.lesson_id) : undefined;
    const unit = lesson ? unitById.get(lesson.unitId) : undefined;
    const example = mat
      ? params.examples.find((ex) => ex.material_id === mat.id)
      : undefined;

    return {
      id: v.id,
      pasanWord: v.pasan_word,
      indonesianMeaning: v.indonesian_meaning,
      category: v.category ?? "Kosakata",
      firstLessonId: lesson?.id ?? null,
      unitNumber: unit?.orderNumber ?? 1,
      exampleSentence: example?.pasan_text ?? "",
      exampleTranslation: example?.indonesian_translation ?? "",
      sourceNote: v.source_note ?? "",
      validationStatus: v.validation_status as ContentStatus,
      createdAt: v.created_at,
    };
  });
}

async function bumpPublishedOrResetLesson(lessonId: string) {
  const sb = createSupabaseAdminClient();
  const { data: lesson } = await sb
    .from("lessons")
    .select("status, content_version")
    .eq("id", lessonId)
    .single();
  if (!lesson) return;

  const updates: Row = { updated_at: new Date().toISOString() };
  if (lesson.status === "published") {
    updates.content_version = Number(lesson.content_version ?? 1) + 1;
    updates.status = "draft";
  } else if (
    lesson.status === "approved" ||
    lesson.status === "changes_requested"
  ) {
    updates.status = "draft";
  }
  await sb.from("lessons").update(updates).eq("id", lessonId);
}

async function getCachedPathStructure() {
  "use cache";
  cacheLife("minutes");
  cacheTag("curriculum");

  const sb = createSupabaseAdminClient();
  const [unitsRes, lessonsRes, quizzesRes] = await Promise.all([
    sb.from("units").select("*").order("order_number"),
    sb.from("lessons").select("*").order("order_number"),
    sb.from("unit_quizzes").select("*"),
  ]);

  return {
    units: (unitsRes.data ?? []).map(mapUnit),
    lessons: (lessonsRes.data ?? []).map(mapLesson),
    quizzes: (quizzesRes.data ?? []).map(mapUnitQuiz),
  };
}

async function getCachedVocabularies() {
  "use cache";
  cacheLife("minutes");
  cacheTag("curriculum");

  const sb = createSupabaseAdminClient();
  const [path, actsRes, matsRes, vocRes, mvRes, exRes] = await Promise.all([
    getCachedPathStructure(),
    sb.from("lesson_activities").select("id, lesson_id"),
    sb.from("lesson_materials").select("id, activity_id"),
    sb.from("vocabularies").select("*"),
    sb.from("material_vocabularies").select("*").order("order_number"),
    sb
      .from("material_examples")
      .select("id, material_id, pasan_text, indonesian_translation, order_number")
      .order("order_number"),
  ]);

  return enrichVocabularies({
    vocabs: vocRes.data ?? [],
    matVocabs: mvRes.data ?? [],
    materials: matsRes.data ?? [],
    activities: actsRes.data ?? [],
    lessons: path.lessons,
    units: path.units,
    examples: exRes.data ?? [],
  });
}

async function getCachedCurriculum() {
  "use cache";
  cacheLife("minutes");
  cacheTag("curriculum");

  const sb = createSupabaseAdminClient();
  const [path, actsRes, matsRes, vocRes, mvRes, exRes, lqRes, qqRes] =
    await Promise.all([
      getCachedPathStructure(),
      sb.from("lesson_activities").select("*").order("order_number"),
      sb.from("lesson_materials").select("*"),
      sb.from("vocabularies").select("*"),
      sb.from("material_vocabularies").select("*").order("order_number"),
      sb.from("material_examples").select("*").order("order_number"),
      sb.from("lesson_questions").select("*").order("order_number"),
      sb.from("quiz_questions").select("*").order("order_number"),
    ]);

  const rawActs = actsRes.data ?? [];
  const rawMats = matsRes.data ?? [];
  const rawVocabs = vocRes.data ?? [];
  const rawMatVocabs = mvRes.data ?? [];
  const rawExamples = exRes.data ?? [];

  return {
    units: path.units,
    lessons: path.lessons,
    activities: rawActs.map(mapActivity),
    materials: rawMats.map(mapMaterial),
    vocabularies: enrichVocabularies({
      vocabs: rawVocabs,
      matVocabs: rawMatVocabs,
      materials: rawMats,
      activities: rawActs,
      lessons: path.lessons,
      units: path.units,
      examples: rawExamples,
    }),
    materialVocabularies: rawMatVocabs.map((mv) => ({
      materialId: String(mv.material_id),
      vocabularyId: String(mv.vocabulary_id),
    })),
    examples: rawExamples.map(mapExample),
    lessonQuestions: (lqRes.data ?? []).map(mapLessonQuestion),
    quizzes: path.quizzes,
    quizQuestions: (qqRes.data ?? []).map(mapQuizQuestion),
  };
}

async function getCachedUserState(userId: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(`user-${userId}`);

  const sb = createSupabaseAdminClient();
  const [unlocksRes, progressRes, remedialsRes, quizAttemptsRes, xpRes, actProgRes] =
    await Promise.all([
      sb.from("unit_unlocks").select("unit_id").eq("user_id", userId),
      sb.from("learner_lesson_progress").select("*").eq("user_id", userId),
      sb
        .from("remedial_assignments")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      sb
        .from("quiz_attempts")
        .select("*")
        .eq("user_id", userId)
        .order("started_at", { ascending: false }),
      sb
        .from("xp_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      sb
        .from("lesson_activity_progress")
        .select("lesson_id, activity_id, progress_type, remedial_assignment_id")
        .eq("user_id", userId)
        .eq("status", "completed"),
    ]);

  return {
    unlockedUnitIds: (unlocksRes.data ?? []).map((u) => String(u.unit_id)),
    progressRows: progressRes.data ?? [],
    remedialRows: remedialsRes.data ?? [],
    quizAttemptRows: quizAttemptsRes.data ?? [],
    xpRows: xpRes.data ?? [],
    activityProgressRows: actProgRes.data ?? [],
  };
}

export async function sbGetUserTotalXp(userId: string): Promise<number> {
  const state = await getCachedUserState(userId);
  return state.xpRows.reduce((s, r) => s + Number(r.xp_amount ?? 0), 0);
}

// ==========================================
// LEARNING PATH (LEARNER & PREVIEW MODE)
// ==========================================

export async function sbGetLearningPathData(
  userId: string,
  options?: { isPreview?: boolean; includeUnpublished?: boolean }
): Promise<LearningPathPayload> {
  const isPreview = Boolean(options?.isPreview);
  const includeUnpublished = Boolean(options?.includeUnpublished);

  const [curriculum, userState] = await Promise.all([
    getCachedPathStructure(),
    getCachedUserState(userId),
  ]);

  const { units, lessons, quizzes } = curriculum;
  const unlockedSet = new Set(userState.unlockedUnitIds);
  const progressList = userState.progressRows.map(mapLessonProgress);
  const progressMap = new Map(progressList.map((p) => [p.lessonId, p]));
  const lessonById = new Map(lessons.map((l) => [l.id, l]));

  const allRemedials: RemedialAssignment[] = userState.remedialRows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    quizAttemptId: r.quiz_attempt_id,
    unitId: lessonById.get(r.lesson_id)?.unitId ?? "",
    lessonId: r.lesson_id,
    errorCount: Number(r.error_count ?? 1),
    priorityOrder: Number(r.priority_order ?? 1),
    contentVersion: Number(r.content_version ?? 1),
    status: r.status,
    createdAt: r.created_at,
    completedAt: r.completed_at ?? null,
  }));
  const activeRemedials = allRemedials.filter((r) => r.status !== "completed");
  const allQuizAttempts = userState.quizAttemptRows.map(mapQuizAttempt);
  const xpRes = { data: userState.xpRows };

  const pathUnits: PathUnitItem[] = units.map((unit) => {
    const unitUnlocked = isUnitUnlocked({
      unitOrder: unit.orderNumber,
      unitId: unit.id,
      unlockedUnitIds: unlockedSet,
      isPreview,
    });

    const unitLessons = lessons
      .filter((l) => l.unitId === unit.id)
      .filter((l) => (isPreview ? includeUnpublished || l.status === "published" : true))
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

      const prog = progressMap.get(lesson.id);
      const passedCurrent =
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

      const rem = !isPreview
        ? activeRemedials.find((r) => r.lessonId === lesson.id) ?? null
        : null;

      let status: PathLessonItem["status"] = "locked";
      if (isPreview) status = "active";
      else if (passedCurrent) status = "completed";
      else if (unlocked) status = "active";

      prevPassed = passedCurrent;
      return {
        lesson,
        status,
        bestScore: prog?.bestScore ?? 0,
        unlocked,
        activeRemedialId: rem?.id ?? null,
      };
    });

    const quiz =
      quizzes.find((q) => {
        if (q.unitId !== unit.id) return false;
        return isPreview ? includeUnpublished || q.status === "published" : q.status === "published";
      }) ?? null;

    const unitAttempts = quiz
      ? allQuizAttempts
          .filter((qa) => qa.quizId === quiz.id)
          .sort((a, b) => b.attemptNumber - a.attemptNumber)
      : [];
    const latestQuizAttempt = unitAttempts[0] ?? null;
    const quizPassed = unitAttempts.some((qa) => qa.status === "passed");

    const unitPendingRemedials =
      !isPreview && latestQuizAttempt && latestQuizAttempt.status === "failed"
        ? activeRemedials
            .filter((r) => r.quizAttemptId === latestQuizAttempt.id)
            .map((r) => {
              const lObj = lessonById.get(r.lessonId);
              return {
                ...r,
                lessonTitle: lObj?.title ?? "Lesson",
                lessonOrder: lObj?.orderNumber ?? 99,
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

  const xpList = (xpRes.data ?? []).map((r) => mapXp(r));
  const totalXp = xpList.reduce((s, t) => s + t.xpAmount, 0);
  const completedLessonsCount = progressList.filter((p) => p.status === "completed").length;
  const passedQuizzesCount = new Set(
    allQuizAttempts.filter((qa) => qa.status === "passed").map((qa) => qa.quizId)
  ).size;
  const completedRemedialsCount = allRemedials.filter((r) => r.status === "completed").length;

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
    totalPublishedLessons: lessons.filter((l) => l.status === "published").length,
  };
}

// ==========================================
// LESSON & QUIZ RUNNERS
// ==========================================

export async function sbGetLessonForRunner(
  userId: string,
  lessonId: string,
  options?: { mode?: "regular" | "remedial" | "preview"; assignmentId?: string }
): Promise<LessonRunnerPayload | null> {
  const mode = options?.mode ?? "regular";
  const isPreview = mode === "preview";

  const [curriculum, userState] = await Promise.all([
    getCachedCurriculum(),
    getCachedUserState(userId),
  ]);

  const lesson = curriculum.lessons.find((l) => l.id === lessonId);
  if (!lesson) return null;
  const unit = curriculum.units.find((u) => u.id === lesson.unitId);
  if (!unit) return null;

  if (!isPreview && lesson.status !== "published") {
    return {
      lesson,
      unit,
      activities: [],
      completedActivityIds: [],
      mode,
      access: { allowed: false, reason: "Lesson ini belum diterbitkan untuk Learner." },
    };
  }

  const unlockedSet = new Set(userState.unlockedUnitIds);
  const unitUnlocked = isUnitUnlocked({
    unitOrder: unit.orderNumber,
    unitId: unit.id,
    unlockedUnitIds: unlockedSet,
    isPreview,
  });

  const unitLessons = curriculum.lessons.filter((l) => l.unitId === unit.id);
  const prevLesson = unitLessons.find((l) => l.orderNumber === lesson.orderNumber - 1);
  const userProgs = userState.progressRows.map(mapLessonProgress);
  const prevProg = prevLesson
    ? userProgs.find((p) => p.lessonId === prevLesson.id)
    : undefined;
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

  const sortedActs = curriculum.activities
    .filter((a) => a.lessonId === lesson.id)
    .sort((a, b) => a.orderNumber - b.orderNumber);
  const vocabMap = new Map(curriculum.vocabularies.map((v) => [v.id, v]));

  const activities: RunnerActivityItem[] = sortedActs.map((activity) => {
    if (activity.activityType === "material") {
      const mat = curriculum.materials.find((m) => m.activityId === activity.id);
      const vocabs = mat
        ? curriculum.materialVocabularies
            .filter((mv) => mv.materialId === mat.id)
            .map((mv) => vocabMap.get(mv.vocabularyId))
            .filter((v): v is Vocabulary => Boolean(v))
        : [];
      const examples = mat
        ? curriculum.examples.filter((ex) => ex.materialId === mat.id)
        : [];
      return {
        activity,
        material: mat ? { data: mat, vocabularies: vocabs, examples } : undefined,
        questions: [],
      };
    }

    const actQs = curriculum.lessonQuestions
      .filter((q) => q.activityId === activity.id)
      .map(toPublicLessonQuestion);
    return { activity, questions: actQs };
  });

  const progressType = mode === "remedial" ? "remedial" : "regular";
  const completedActivityIds = isPreview
    ? []
    : userState.activityProgressRows
        .filter(
          (ap) =>
            ap.lesson_id === lessonId &&
            ap.progress_type === progressType &&
            (options?.assignmentId
              ? ap.remedial_assignment_id === options.assignmentId
              : true)
        )
        .map((ap) => String(ap.activity_id));

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

export async function sbMarkLessonMaterialDone(params: {
  userId: string;
  lessonId: string;
  activityId: string;
  mode: "regular" | "remedial" | "preview";
  assignmentId?: string;
}): Promise<void> {
  if (params.mode === "preview") return;
  const sb = createSupabaseAdminClient();
  const progressType = params.mode === "remedial" ? "remedial" : "regular";
  const now = new Date().toISOString();

  let query = sb
    .from("lesson_activity_progress")
    .select("id")
    .eq("user_id", params.userId)
    .eq("lesson_id", params.lessonId)
    .eq("activity_id", params.activityId)
    .eq("progress_type", progressType);

  if (params.assignmentId) {
    query = query.eq("remedial_assignment_id", params.assignmentId);
  } else {
    query = query.is("remedial_assignment_id", null);
  }

  const { data: existing } = await query;
  if (existing && existing.length > 0) {
    await sb
      .from("lesson_activity_progress")
      .update({ status: "completed", completed_at: now })
      .eq("id", existing[0].id);
  } else {
    await sb.from("lesson_activity_progress").insert({
      user_id: params.userId,
      lesson_id: params.lessonId,
      activity_id: params.activityId,
      progress_type: progressType,
      remedial_assignment_id: params.assignmentId ?? null,
      status: "completed",
      completed_at: now,
    });
  }
}

export async function sbEvaluateLessonAttempt(params: {
  userId: string;
  lessonId: string;
  responses: Record<string, QuestionResponseData>;
  completedMaterialIds: string[];
  mode: "regular" | "remedial" | "preview";
  assignmentId?: string;
}): Promise<LessonEvaluationResult> {
  const sb = createSupabaseAdminClient();

  const [lessonRes, actsRes] = await Promise.all([
    sb.from("lessons").select("*").eq("id", params.lessonId).single(),
    sb.from("lesson_activities").select("*").eq("lesson_id", params.lessonId),
  ]);
  if (!lessonRes.data) {
    throw new Error("Lesson tidak ditemukan.");
  }
  const lesson = mapLesson(lessonRes.data);
  const activities = (actsRes.data ?? []).map(mapActivity);
  const exerciseActIds = activities
    .filter((a) => a.activityType === "exercise")
    .map((a) => a.id);

  const qRes =
    exerciseActIds.length > 0
      ? await sb
          .from("lesson_questions")
          .select("*")
          .in("activity_id", exerciseActIds)
          .order("order_number")
      : { data: [] };
  const questions = (qRes.data ?? []).map(mapLessonQuestion);
  const qIds = questions.map((q) => q.id);

  const keysRes =
    qIds.length > 0
      ? await sb
          .from("lesson_question_answer_keys")
          .select("*")
          .in("question_id", qIds)
      : { data: [] };
  const keyMap = new Map(
    (keysRes.data ?? []).map((k) => [String(k.question_id), k.answer_key as AnswerKey])
  );

  let earnedTotal = 0;
  let maxTotal = 0;
  const feedbacks: QuestionFeedbackItem[] = [];

  for (const q of questions) {
    const key: AnswerKey = keyMap.get(q.id) ?? { correctOption: "" };
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

  if (params.mode === "preview") {
    return { score, passed, xpAwarded: 0, feedbacks, mode: "preview" };
  }

  const now = new Date().toISOString();
  const attemptType = params.mode === "remedial" ? "remedial" : "regular";

  const [priorRes, xpRes] = await Promise.all([
    sb
      .from("lesson_attempts")
      .select("id")
      .eq("user_id", params.userId)
      .eq("lesson_id", lesson.id)
      .eq("attempt_type", attemptType),
    sb.from("xp_transactions").select("*").eq("user_id", params.userId),
  ]);

  const attemptNumber = (priorRes.data ?? []).length + 1;
  const { data: attemptRow, error: attemptErr } = await sb
    .from("lesson_attempts")
    .insert({
      user_id: params.userId,
      lesson_id: lesson.id,
      attempt_type: attemptType,
      remedial_assignment_id: params.assignmentId ?? null,
      attempt_number: attemptNumber,
      score,
      status: passed ? "passed" : "failed",
      content_version: lesson.contentVersion,
      started_at: now,
      completed_at: now,
    })
    .select("id")
    .single();

  if (attemptErr || !attemptRow) {
    throw new Error("Gagal menyimpan percobaan lesson.");
  }

  if (feedbacks.length > 0) {
    await sb.from("lesson_responses").insert(
      feedbacks.map((fb) => ({
        attempt_id: attemptRow.id,
        question_id: fb.questionId,
        response_data: params.responses[fb.questionId] ?? { selectedOption: "" },
        is_correct: fb.isCorrect,
        earned_points: fb.earnedPoints,
        submitted_at: now,
      }))
    );
  }

  for (const act of activities) {
    if (
      act.activityType === "material" &&
      !params.completedMaterialIds.includes(act.id)
    ) {
      continue;
    }
    await sbMarkLessonMaterialDone({
      userId: params.userId,
      lessonId: lesson.id,
      activityId: act.id,
      mode: params.mode,
      assignmentId: params.assignmentId,
    });
  }

  const existingXp = (xpRes.data ?? []).map((r) => mapXp(r));
  let xpAwarded = 0;

  if (attemptType === "regular") {
    const { data: existingProg } = await sb
      .from("learner_lesson_progress")
      .select("*")
      .eq("user_id", params.userId)
      .eq("lesson_id", lesson.id)
      .maybeSingle();

    if (existingProg) {
      await sb
        .from("learner_lesson_progress")
        .update({
          best_score: Math.max(Number(existingProg.best_score ?? 0), score),
          status: passed ? "completed" : existingProg.status,
          completed_content_version: passed
            ? lesson.contentVersion
            : existingProg.completed_content_version,
          completed_at: passed ? existingProg.completed_at ?? now : existingProg.completed_at,
        })
        .eq("id", existingProg.id);
    } else {
      await sb.from("learner_lesson_progress").insert({
        user_id: params.userId,
        lesson_id: lesson.id,
        completed_content_version: lesson.contentVersion,
        best_score: score,
        status: passed ? "completed" : "in_progress",
        completed_at: passed ? now : null,
      });
    }

    xpAwarded = getXpAwardIfEligible({
      transactions: existingXp,
      userId: params.userId,
      activityType: "lesson",
      referenceId: lesson.id,
      passed,
    });
    if (xpAwarded > 0) {
      await sb.from("xp_transactions").upsert(
        {
          user_id: params.userId,
          activity_type: "lesson",
          reference_id: lesson.id,
          xp_amount: xpAwarded,
        },
        { onConflict: "user_id,activity_type,reference_id", ignoreDuplicates: true }
      );
    }
  } else {
    if (params.assignmentId) {
      await sb
        .from("remedial_assignments")
        .update({
          status: passed ? "completed" : "in_progress",
          completed_at: passed ? now : null,
        })
        .eq("id", params.assignmentId)
        .eq("user_id", params.userId);
    } else {
      await sb
        .from("remedial_assignments")
        .update({
          status: passed ? "completed" : "in_progress",
          completed_at: passed ? now : null,
        })
        .eq("user_id", params.userId)
        .eq("lesson_id", lesson.id)
        .neq("status", "completed");
    }

    xpAwarded = getXpAwardIfEligible({
      transactions: existingXp,
      userId: params.userId,
      activityType: "remedial",
      referenceId: lesson.id,
      passed,
    });
    if (xpAwarded > 0) {
      await sb.from("xp_transactions").upsert(
        {
          user_id: params.userId,
          activity_type: "remedial",
          reference_id: lesson.id,
          xp_amount: xpAwarded,
        },
        { onConflict: "user_id,activity_type,reference_id", ignoreDuplicates: true }
      );
    }
  }

  return { score, passed, xpAwarded, feedbacks, mode: attemptType };
}

// ==========================================
// QUIZ UNIT & REKOMENDASI ADAPTIF
// ==========================================

export async function sbGetQuizForRunner(
  userId: string,
  unitId: string,
  options?: { isPreview?: boolean }
): Promise<QuizRunnerPayload | null> {
  const isPreview = Boolean(options?.isPreview);

  const [curriculum, userState] = await Promise.all([
    getCachedCurriculum(),
    getCachedUserState(userId),
  ]);

  const unit = curriculum.units.find((u) => u.id === unitId);
  const quiz = curriculum.quizzes.find((q) => q.unitId === unitId);
  if (!unit || !quiz) return null;

  if (!isPreview && quiz.status !== "published") {
    return {
      quiz,
      unit,
      questions: [],
      lessonTitles: {},
      isPreview,
      access: { allowed: false, reason: "Quiz Unit ini belum diterbitkan oleh Admin." },
    };
  }

  const unlockedSet = new Set(userState.unlockedUnitIds);
  const unitUnlocked = isUnitUnlocked({
    unitOrder: unit.orderNumber,
    unitId: unit.id,
    unlockedUnitIds: unlockedSet,
    isPreview,
  });

  const allUnitLessons = curriculum.lessons.filter((l) => l.unitId === unitId);
  const publishedUnitLessons = allUnitLessons.filter((l) => l.status === "published");
  const userProgs = userState.progressRows.map(mapLessonProgress);

  const allFivePassed =
    publishedUnitLessons.length >= 5 &&
    publishedUnitLessons.every((l) =>
      userProgs.some(
        (p) =>
          p.lessonId === l.id &&
          p.status === "completed" &&
          p.completedContentVersion >= l.contentVersion
      )
    );

  const unitLessonIds = new Set(allUnitLessons.map((l) => l.id));
  const pendingRemedialCount = userState.remedialRows.filter(
    (r) => r.status !== "completed" && unitLessonIds.has(r.lesson_id)
  ).length;

  const access = canStartQuiz({
    unitUnlocked,
    allFiveLessonsPassed: allFivePassed,
    pendingRemedialCount,
    isPreview,
  });

  const questions = curriculum.quizQuestions
    .filter((q) => q.quizId === quiz.id)
    .map(toPublicQuizQuestion);
  const lessonTitles: Record<string, string> = {};
  for (const l of allUnitLessons) {
    lessonTitles[l.id] = `${unit.orderNumber}.${l.orderNumber} ${l.title}`;
  }

  return { quiz, unit, questions, lessonTitles, access, isPreview };
}

export async function sbEvaluateQuizAttempt(params: {
  userId: string;
  unitId: string;
  responses: Record<string, QuestionResponseData>;
  isPreview: boolean;
}): Promise<QuizEvaluationResult> {
  const sb = createSupabaseAdminClient();

  const [unitRes, quizRes, unitLessonsRes] = await Promise.all([
    sb.from("units").select("*").eq("id", params.unitId).single(),
    sb.from("unit_quizzes").select("*").eq("unit_id", params.unitId).single(),
    sb.from("lessons").select("*").eq("unit_id", params.unitId),
  ]);

  if (!unitRes.data || !quizRes.data) {
    throw new Error("Quiz Unit tidak ditemukan.");
  }

  const unit = mapUnit(unitRes.data);
  const quiz = mapUnitQuiz(quizRes.data);
  const unitLessons = (unitLessonsRes.data ?? []).map(mapLesson);

  const { data: qRows } = await sb
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quiz.id)
    .order("order_number");
  const questions = (qRows ?? []).map(mapQuizQuestion);
  const qIds = questions.map((q) => q.id);

  const keysRes =
    qIds.length > 0
      ? await sb.from("quiz_question_answer_keys").select("*").in("question_id", qIds)
      : { data: [] };
  const keyMap = new Map(
    (keysRes.data ?? []).map((k) => [String(k.question_id), k.answer_key as AnswerKey])
  );

  const lessonOrderById: Record<string, number> = {};
  const lessonTitleById: Record<string, string> = {};
  for (const l of unitLessons) {
    lessonOrderById[l.id] = l.orderNumber;
    lessonTitleById[l.id] = `${unit.orderNumber}.${l.orderNumber} ${l.title}`;
  }

  let earnedTotal = 0;
  let maxTotal = 0;
  const wrongPrimaryLessonIds: string[] = [];
  const feedbacks: Array<QuestionFeedbackItem & { primaryLessonTitle: string }> = [];

  for (const q of questions) {
    const key: AnswerKey = keyMap.get(q.id) ?? { correctOption: "" };
    const graded = gradeQuestion(
      q.questionType,
      q.questionData,
      key,
      params.responses[q.id],
      q.points
    );
    earnedTotal += graded.earnedPoints;
    maxTotal += graded.maxPoints;
    if (!graded.isCorrect) wrongPrimaryLessonIds.push(q.primaryLessonId);
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
  const [prevAttemptsRes, xpRes] = await Promise.all([
    sb
      .from("quiz_attempts")
      .select("id")
      .eq("user_id", params.userId)
      .eq("quiz_id", quiz.id),
    sb.from("xp_transactions").select("*").eq("user_id", params.userId),
  ]);

  const { data: attemptRow, error: attemptErr } = await sb
    .from("quiz_attempts")
    .insert({
      user_id: params.userId,
      quiz_id: quiz.id,
      attempt_number: (prevAttemptsRes.data ?? []).length + 1,
      score,
      status: passed ? "passed" : "failed",
      content_version: quiz.contentVersion,
      started_at: now,
      completed_at: now,
    })
    .select("id")
    .single();

  if (attemptErr || !attemptRow) {
    throw new Error("Gagal menyimpan hasil quiz.");
  }

  if (feedbacks.length > 0) {
    await sb.from("quiz_responses").insert(
      feedbacks.map((fb) => ({
        attempt_id: attemptRow.id,
        question_id: fb.questionId,
        response_data: params.responses[fb.questionId] ?? { selectedOption: "" },
        is_correct: fb.isCorrect,
        earned_points: fb.earnedPoints,
        submitted_at: now,
      }))
    );
  }

  let xpAwarded = 0;
  let unlockedUnitTitle: string | null = null;
  const existingXp = (xpRes.data ?? []).map((r) => mapXp(r));

  if (passed) {
    const unitLessonIds = unitLessons.map((l) => l.id);
    if (unitLessonIds.length > 0) {
      await sb
        .from("remedial_assignments")
        .update({ status: "completed", completed_at: now })
        .eq("user_id", params.userId)
        .in("lesson_id", unitLessonIds)
        .neq("status", "completed");
    }

    xpAwarded = getXpAwardIfEligible({
      transactions: existingXp,
      userId: params.userId,
      activityType: "quiz",
      referenceId: quiz.id,
      passed: true,
    });
    if (xpAwarded > 0) {
      await sb.from("xp_transactions").upsert(
        {
          user_id: params.userId,
          activity_type: "quiz",
          reference_id: quiz.id,
          xp_amount: xpAwarded,
        },
        { onConflict: "user_id,activity_type,reference_id", ignoreDuplicates: true }
      );
    }

    const { data: nextUnitRow } = await sb
      .from("units")
      .select("*")
      .eq("order_number", unit.orderNumber + 1)
      .maybeSingle();

    if (nextUnitRow) {
      const { data: already } = await sb
        .from("unit_unlocks")
        .select("id")
        .eq("user_id", params.userId)
        .eq("unit_id", nextUnitRow.id)
        .maybeSingle();

      if (!already) {
        await sb
          .from("unit_unlocks")
          .upsert(
            { user_id: params.userId, unit_id: nextUnitRow.id, unlocked_at: now },
            { onConflict: "user_id,unit_id", ignoreDuplicates: true }
          );
        unlockedUnitTitle = `Unit ${nextUnitRow.order_number}: ${nextUnitRow.title}`;
      }
    }
  } else if (recommendations.length > 0) {
    await sb.from("remedial_assignments").insert(
      recommendations.map((rec) => {
        const lObj = unitLessons.find((l) => l.id === rec.lessonId);
        return {
          user_id: params.userId,
          quiz_attempt_id: attemptRow.id,
          lesson_id: rec.lessonId,
          error_count: rec.errorCount,
          priority_order: rec.priorityOrder,
          content_version: lObj?.contentVersion ?? 1,
          status: "pending",
          created_at: now,
        };
      })
    );
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
}

// ==========================================
// KAMUS, LEADERBOARD & PROFIL
// ==========================================

export async function sbListVocabularies(
  includeUnpublished = false
): Promise<Vocabulary[]> {
  const vocabs = await getCachedVocabularies();
  const list = includeUnpublished
    ? vocabs
    : vocabs.filter((v) => v.validationStatus === "published");
  return [...list].sort((a, b) => a.unitNumber - b.unitNumber);
}

async function getCachedLeaderboardBase() {
  "use cache";
  cacheLife("minutes");
  cacheTag("leaderboard");
  cacheTag("profiles");

  const sb = createSupabaseAdminClient();
  const [profRes, xpRes, progRes] = await Promise.all([
    sb
      .from("profiles")
      .select("id, full_name")
      .eq("role", "learner")
      .eq("is_active", true),
    sb.from("xp_transactions").select("user_id, xp_amount"),
    sb
      .from("learner_lesson_progress")
      .select("user_id")
      .eq("status", "completed"),
  ]);

  const xpMap = new Map<string, number>();
  for (const tx of xpRes.data ?? []) {
    xpMap.set(tx.user_id, (xpMap.get(tx.user_id) ?? 0) + Number(tx.xp_amount ?? 0));
  }
  const compMap = new Map<string, number>();
  for (const p of progRes.data ?? []) {
    compMap.set(p.user_id, (compMap.get(p.user_id) ?? 0) + 1);
  }

  const scored = (profRes.data ?? []).map((p) => {
    const totalXp = xpMap.get(p.id) ?? 0;
    return {
      userId: String(p.id),
      fullName: String(p.full_name),
      totalXp,
      levelTitle: calculateLevel(totalXp).title,
      completedLessons: compMap.get(p.id) ?? 0,
    };
  });

  scored.sort((a, b) => b.totalXp - a.totalXp || b.completedLessons - a.completedLessons);
  return scored.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
}

export async function sbGetLeaderboardData(
  currentUserId: string
): Promise<LeaderboardEntry[]> {
  const base = await getCachedLeaderboardBase();
  return base.map((entry) => ({
    ...entry,
    isCurrentUser: entry.userId === currentUserId,
  }));
}

export async function sbGetLearnerProfileDetails(userId: string) {
  const [curriculum, userState] = await Promise.all([
    getCachedPathStructure(),
    getCachedUserState(userId),
  ]);

  const lessonMap = new Map(curriculum.lessons.map((l) => [l.id, l]));
  const quizMap = new Map(curriculum.quizzes.map((q) => [q.id, q.title]));

  const xpTransactions = userState.xpRows.map((r) =>
    mapXp(r, (t, ref) => {
      if (t === "quiz") return `Lulus ${quizMap.get(ref) ?? "Quiz Unit"}`;
      const lTitle = lessonMap.get(ref)?.title ?? "Lesson";
      return t === "remedial" ? `Selesai Remedial ${lTitle}` : `Lulus Lesson ${lTitle}`;
    })
  );
  const totalXp = xpTransactions.reduce((s, tx) => s + tx.xpAmount, 0);

  const quizAttempts = userState.quizAttemptRows.map((qa) => ({
    ...mapQuizAttempt(qa),
    quizTitle: quizMap.get(qa.quiz_id) ?? "Quiz Unit",
  }));

  const remedials = userState.remedialRows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    quizAttemptId: r.quiz_attempt_id,
    unitId: lessonMap.get(r.lesson_id)?.unitId ?? "",
    lessonId: r.lesson_id,
    errorCount: Number(r.error_count ?? 1),
    priorityOrder: Number(r.priority_order ?? 1),
    contentVersion: Number(r.content_version ?? 1),
    status: r.status,
    createdAt: r.created_at,
    completedAt: r.completed_at ?? null,
    lessonTitle: lessonMap.get(r.lesson_id)?.title ?? "Lesson",
  }));

  const passedQuizIds = new Set(
    quizAttempts.filter((q) => q.status === "passed").map((q) => q.quizId)
  );
  const completedRemedials = remedials.filter((r) => r.status === "completed");
  const completedLessonsCount = userState.progressRows.filter(
    (p) => p.status === "completed"
  ).length;

  return {
    totalXp,
    level: calculateLevel(totalXp),
    badges: computeBadges({
      completedLessonsCount,
      passedQuizzesCount: passedQuizIds.size,
      completedRemedialsCount: completedRemedials.length,
      totalXp,
    }),
    completedLessonsCount,
    unlockedUnitsCount: userState.unlockedUnitIds.length,
    quizAttempts,
    remedials,
    xpTransactions,
  };
}

// ==========================================
// VALIDATOR PANEL QUERIES & ACTIONS
// ==========================================

export async function sbGetValidatorQueueData() {
  "use cache";
  cacheLife("minutes");
  cacheTag("curriculum");
  cacheTag("profiles");

  const sb = createSupabaseAdminClient();
  const [curriculum, revRes, profRes] = await Promise.all([
    getCachedPathStructure(),
    sb.from("content_reviews").select("*").order("submitted_at", { ascending: false }),
    sb.from("profiles").select("id, full_name"),
  ]);

  const lessonMap = new Map(curriculum.lessons.map((l) => [l.id, l]));
  const quizMap = new Map(curriculum.quizzes.map((q) => [q.id, q]));
  const unitMap = new Map(curriculum.units.map((u) => [u.id, u]));
  const nameMap = new Map((profRes.data ?? []).map((p) => [p.id, String(p.full_name)]));

  const reviews: ContentReview[] = (revRes.data ?? []).map((r) => {
    const lesson = r.lesson_id ? lessonMap.get(r.lesson_id) : undefined;
    const quiz = r.quiz_id ? quizMap.get(r.quiz_id) : undefined;
    const unit = lesson
      ? unitMap.get(lesson.unitId)
      : quiz
        ? unitMap.get(quiz.unitId)
        : undefined;

    return {
      id: r.id,
      lessonId: r.lesson_id ?? null,
      quizId: r.quiz_id ?? null,
      contentTitle: lesson
        ? `Lesson ${unit?.orderNumber ?? ""}.${lesson.orderNumber}: ${lesson.title}`
        : quiz?.title ?? "Konten",
      unitTitle: unit ? `Unit ${unit.orderNumber}: ${unit.title}` : "Unit",
      contentVersion: Number(r.content_version ?? 1),
      status: r.status as ReviewStatus,
      submittedBy: r.submitted_by,
      submittedByName: nameMap.get(r.submitted_by) ?? "Admin",
      reviewedBy: r.reviewed_by ?? null,
      reviewedByName: r.reviewed_by ? nameMap.get(r.reviewed_by) ?? "Validator" : null,
      reviewNote: r.review_note ?? "",
      submittedAt: r.submitted_at,
      reviewedAt: r.reviewed_at ?? null,
    };
  });

  const counts = {
    pending: reviews.filter((r) => r.status === "pending").length,
    approved: reviews.filter((r) => r.status === "approved").length,
    changesRequested: reviews.filter((r) => r.status === "changes_requested").length,
    total: reviews.length,
  };
  return { reviews, counts };
}

export async function sbGetPrivilegedContentDetail(
  type: "lesson" | "quiz",
  id: string
) {
  "use cache";
  cacheLife("minutes");
  cacheTag("curriculum");
  cacheTag("profiles");

  const sb = createSupabaseAdminClient();
  const [curriculum, queueData, keysRes] = await Promise.all([
    getCachedCurriculum(),
    sbGetValidatorQueueData(),
    type === "lesson"
      ? sb.from("lesson_question_answer_keys").select("*")
      : sb.from("quiz_question_answer_keys").select("*"),
  ]);

  const unitMap = new Map(curriculum.units.map((u) => [u.id, u]));
  const keyMap = new Map(
    (keysRes.data ?? []).map((k) => [String(k.question_id), k.answer_key as AnswerKey])
  );

  if (type === "lesson") {
    const lesson = curriculum.lessons.find((l) => l.id === id);
    if (!lesson) return null;
    const unit = unitMap.get(lesson.unitId) ?? null;

    const sortedActs = curriculum.activities
      .filter((a) => a.lessonId === lesson.id)
      .sort((a, b) => a.orderNumber - b.orderNumber);
    const vocabMap = new Map(curriculum.vocabularies.map((v) => [v.id, v]));

    const activities = sortedActs.map((act) => {
      if (act.activityType === "material") {
        const mat = curriculum.materials.find((m) => m.activityId === act.id) ?? null;
        const vocabularies = mat
          ? curriculum.materialVocabularies
              .filter((mv) => mv.materialId === mat.id)
              .map((mv) => vocabMap.get(mv.vocabularyId))
              .filter((v): v is Vocabulary => Boolean(v))
          : [];
        const examples = mat
          ? curriculum.examples.filter((e) => e.materialId === mat.id)
          : [];
        return { activity: act, material: mat, vocabularies, examples, questions: [] };
      }
      const actQuestions = curriculum.lessonQuestions
        .filter((q) => q.activityId === act.id)
        .map((q) => ({ question: q, answerKey: keyMap.get(q.id) ?? null }));
      return { activity: act, material: null, vocabularies: [], examples: [], questions: actQuestions };
    });

    const reviews = queueData.reviews.filter((r) => r.lessonId === lesson.id);
    return { type: "lesson" as const, lesson, unit, activities, reviews };
  }

  const quiz = curriculum.quizzes.find((q) => q.id === id);
  if (!quiz) return null;
  const unit = unitMap.get(quiz.unitId) ?? null;
  const unitLessons = curriculum.lessons
    .filter((l) => l.unitId === quiz.unitId)
    .sort((a, b) => a.orderNumber - b.orderNumber);

  const questions = curriculum.quizQuestions
    .filter((q) => q.quizId === quiz.id)
    .map((q) => ({
      question: q,
      answerKey: keyMap.get(q.id) ?? null,
      primaryLessonTitle:
        unitLessons.find((l) => l.id === q.primaryLessonId)?.title ?? "Lesson",
    }));

  const reviews = queueData.reviews.filter((r) => r.quizId === quiz.id);
  return { type: "quiz" as const, quiz, unit, unitLessons, questions, reviews };
}

export async function sbApplyReviewDecision(params: {
  reviewId: string;
  reviewerId: string;
  decision: "approved" | "changes_requested";
  note: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (params.decision === "changes_requested" && !params.note.trim()) {
    return {
      ok: false,
      error: "Catatan revisi wajib diisi saat meminta perbaikan konten.",
    };
  }
  const sb = createSupabaseAdminClient();
  const { data: review } = await sb
    .from("content_reviews")
    .select("*")
    .eq("id", params.reviewId)
    .maybeSingle();

  if (!review) {
    return { ok: false, error: "Data pengajuan review tidak ditemukan." };
  }

  const now = new Date().toISOString();
  await sb
    .from("content_reviews")
    .update({
      status: params.decision,
      reviewed_by: params.reviewerId,
      review_note: params.note.trim(),
      reviewed_at: now,
    })
    .eq("id", params.reviewId);

  const nextContentStatus: ContentStatus =
    params.decision === "approved" ? "approved" : "changes_requested";

  if (review.lesson_id) {
    await sb
      .from("lessons")
      .update({ status: nextContentStatus, updated_at: now })
      .eq("id", review.lesson_id);
  } else if (review.quiz_id) {
    await sb
      .from("unit_quizzes")
      .update({ status: nextContentStatus })
      .eq("id", review.quiz_id);
  }

  return { ok: true };
}

// ==========================================
// ADMIN PANEL QUERIES & ACTIONS
// ==========================================

export async function sbGetAdminDashboardData() {
  "use cache";
  cacheLife("minutes");
  cacheTag("curriculum");
  cacheTag("profiles");
  cacheTag("leaderboard");

  const sb = createSupabaseAdminClient();
  const [curriculum, profRes, xpRes, progRes] = await Promise.all([
    getCachedPathStructure(),
    sb.from("profiles").select("*"),
    sb.from("xp_transactions").select("user_id, xp_amount"),
    sb.from("learner_lesson_progress").select("user_id").eq("status", "completed"),
  ]);

  const { units, lessons: allLessons, quizzes: allQuizzes } = curriculum;
  const allProfiles = mapProfiles(profRes.data ?? [], {});

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

  const unitMap = new Map(units.map((u) => [u.id, u]));
  const priorityLessons = allLessons
    .filter(
      (l) =>
        l.status === "changes_requested" ||
        l.status === "approved" ||
        l.status === "pending_review"
    )
    .map((l) => ({ lesson: l, unit: unitMap.get(l.unitId) ?? null }));

  const learners = allProfiles.filter((p) => p.role === "learner");
  const validators = allProfiles.filter((p) => p.role === "validator");

  const xpMap = new Map<string, number>();
  for (const tx of xpRes.data ?? []) {
    xpMap.set(tx.user_id, (xpMap.get(tx.user_id) ?? 0) + Number(tx.xp_amount ?? 0));
  }
  const compMap = new Map<string, number>();
  for (const p of progRes.data ?? []) {
    compMap.set(p.user_id, (compMap.get(p.user_id) ?? 0) + 1);
  }

  const learnerSummaries = learners.map((learner) => ({
    profile: learner,
    totalXp: xpMap.get(learner.id) ?? 0,
    completedLessons: compMap.get(learner.id) ?? 0,
  }));

  return {
    pipeline,
    priorityLessons,
    validatorsCount: validators.length,
    learnersCount: learners.length,
    learnerSummaries,
    units,
    lessons: allLessons,
    quizzes: allQuizzes,
  };
}

export async function sbGetAdminUnitsOverview() {
  const { units, lessons, activities, quizzes } = await getCachedCurriculum();

  const actCounts = new Map<string, number>();
  for (const a of activities) {
    actCounts.set(a.lessonId, (actCounts.get(a.lessonId) ?? 0) + 1);
  }

  return units.map((unit) => ({
    unit,
    lessons: lessons
      .filter((l) => l.unitId === unit.id)
      .sort((a, b) => a.orderNumber - b.orderNumber)
      .map((lesson) => ({
        lesson,
        activityCount: actCounts.get(lesson.id) ?? 0,
      })),
    quiz: quizzes.find((q) => q.unitId === unit.id) ?? null,
  }));
}

export async function sbCreateNewLesson(params: {
  unitId: string;
  title: string;
  description: string;
  objective: string;
}): Promise<{ ok: boolean; lessonId?: string; error?: string }> {
  if (!params.title.trim()) {
    return { ok: false, error: "Judul lesson wajib diisi." };
  }
  const sb = createSupabaseAdminClient();
  const { data: unitLessons } = await sb
    .from("lessons")
    .select("order_number")
    .eq("unit_id", params.unitId);

  const maxOrder = (unitLessons ?? []).reduce(
    (max, l) => Math.max(max, Number(l.order_number ?? 0)),
    0
  );

  const { data, error } = await sb
    .from("lessons")
    .insert({
      unit_id: params.unitId,
      title: params.title.trim(),
      description: params.description.trim(),
      objective: params.objective.trim(),
      order_number: maxOrder + 1,
      content_version: 1,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Gagal membuat lesson." };
  }
  return { ok: true, lessonId: data.id };
}

export async function sbUpdateLessonDetails(params: {
  lessonId: string;
  title: string;
  description: string;
  objective: string;
}): Promise<{ ok: boolean; error?: string }> {
  const sb = createSupabaseAdminClient();
  const { data: lesson } = await sb
    .from("lessons")
    .select("status")
    .eq("id", params.lessonId)
    .maybeSingle();
  if (!lesson) return { ok: false, error: "Lesson tidak ditemukan." };
  if (lesson.status === "pending_review") {
    return {
      ok: false,
      error: "Konten sedang Menunggu Review. Batalkan pengajuan dulu sebelum mengubah.",
    };
  }

  await sb
    .from("lessons")
    .update({
      title: params.title.trim(),
      description: params.description.trim(),
      objective: params.objective.trim(),
    })
    .eq("id", params.lessonId);

  await bumpPublishedOrResetLesson(params.lessonId);
  return { ok: true };
}

export async function sbAddMaterialActivity(params: {
  lessonId: string;
  title: string;
  instruction: string;
  content: string;
  explanation: string;
  examplePasan?: string;
  exampleTranslation?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const sb = createSupabaseAdminClient();
  const [lessonRes, actsRes] = await Promise.all([
    sb.from("lessons").select("status").eq("id", params.lessonId).maybeSingle(),
    sb.from("lesson_activities").select("order_number").eq("lesson_id", params.lessonId),
  ]);
  if (!lessonRes.data) return { ok: false, error: "Lesson tidak ditemukan." };
  if (lessonRes.data.status === "pending_review") {
    return {
      ok: false,
      error: "Batalkan pengajuan review terlebih dahulu untuk menambah aktivitas.",
    };
  }

  const maxOrder = (actsRes.data ?? []).reduce(
    (max, a) => Math.max(max, Number(a.order_number ?? 0)),
    0
  );

  const { data: act, error: actErr } = await sb
    .from("lesson_activities")
    .insert({
      lesson_id: params.lessonId,
      activity_type: "material",
      title: params.title.trim() || "Materi Baru",
      instruction: params.instruction.trim() || "Baca materi singkat ini.",
      order_number: maxOrder + 1,
      is_required: true,
    })
    .select("id")
    .single();
  if (actErr || !act) return { ok: false, error: "Gagal menambah aktivitas." };

  const { data: mat, error: matErr } = await sb
    .from("lesson_materials")
    .insert({
      activity_id: act.id,
      content: params.content.trim(),
      explanation: params.explanation.trim(),
      estimated_duration: 60,
    })
    .select("id")
    .single();
  if (matErr || !mat) return { ok: false, error: "Gagal menyimpan isi materi." };

  if (params.examplePasan?.trim()) {
    await sb.from("material_examples").insert({
      material_id: mat.id,
      pasan_text: params.examplePasan.trim(),
      indonesian_translation: params.exampleTranslation?.trim() ?? "",
      order_number: 1,
    });
  }

  await bumpPublishedOrResetLesson(params.lessonId);
  return { ok: true };
}

export async function sbUpdateMaterialActivity(params: {
  lessonId: string;
  activityId: string;
  title: string;
  content: string;
  explanation: string;
}): Promise<{ ok: boolean; error?: string }> {
  const sb = createSupabaseAdminClient();
  const { data: lesson } = await sb
    .from("lessons")
    .select("status")
    .eq("id", params.lessonId)
    .maybeSingle();
  if (!lesson) return { ok: false, error: "Lesson tidak ditemukan." };
  if (lesson.status === "pending_review") {
    return { ok: false, error: "Konten sedang menunggu review. Batalkan pengajuan dulu." };
  }

  await Promise.all([
    sb
      .from("lesson_activities")
      .update({ title: params.title.trim() })
      .eq("id", params.activityId),
    sb
      .from("lesson_materials")
      .update({
        content: params.content.trim(),
        explanation: params.explanation.trim(),
      })
      .eq("activity_id", params.activityId),
  ]);

  await bumpPublishedOrResetLesson(params.lessonId);
  return { ok: true };
}

export async function sbAddExerciseQuestionActivity(params: {
  lessonId: string;
  existingActivityId?: string;
  title: string;
  questionType: QuestionType;
  questionText: string;
  questionData: QuestionData;
  answerKey: AnswerKey;
  explanation: string;
  points: number;
}): Promise<{ ok: boolean; error?: string }> {
  const sb = createSupabaseAdminClient();
  const [lessonRes, actsRes] = await Promise.all([
    sb.from("lessons").select("status").eq("id", params.lessonId).maybeSingle(),
    sb.from("lesson_activities").select("*").eq("lesson_id", params.lessonId),
  ]);
  if (!lessonRes.data) return { ok: false, error: "Lesson tidak ditemukan." };
  if (lessonRes.data.status === "pending_review") {
    return {
      ok: false,
      error: "Konten sedang menunggu review. Batalkan pengajuan dulu.",
    };
  }

  let targetActivityId = params.existingActivityId?.trim() ?? "";
  if (targetActivityId) {
    const valid = (actsRes.data ?? []).some(
      (a) => a.id === targetActivityId && a.activity_type === "exercise"
    );
    if (!valid) {
      return { ok: false, error: "Aktivitas latihan tujuan tidak ditemukan." };
    }
  } else {
    const maxOrder = (actsRes.data ?? []).reduce(
      (max, a) => Math.max(max, Number(a.order_number ?? 0)),
      0
    );
    const { data: newAct, error: actErr } = await sb
      .from("lesson_activities")
      .insert({
        lesson_id: params.lessonId,
        activity_type: "exercise",
        title: params.title.trim() || "Latihan Interaktif",
        instruction: "Jawab seluruh soal latihan berikut dengan tepat.",
        order_number: maxOrder + 1,
        is_required: true,
      })
      .select("id")
      .single();
    if (actErr || !newAct) {
      return { ok: false, error: "Gagal membuat aktivitas latihan." };
    }
    targetActivityId = newAct.id;
  }

  const { data: existingQs } = await sb
    .from("lesson_questions")
    .select("order_number")
    .eq("activity_id", targetActivityId);
  const maxQOrder = (existingQs ?? []).reduce(
    (max, q) => Math.max(max, Number(q.order_number ?? 0)),
    0
  );

  const { data: qRow, error: qErr } = await sb
    .from("lesson_questions")
    .insert({
      activity_id: targetActivityId,
      question_type: params.questionType,
      question_text: params.questionText.trim(),
      question_data: params.questionData,
      explanation: params.explanation.trim(),
      points: params.points,
      order_number: maxQOrder + 1,
    })
    .select("id")
    .single();
  if (qErr || !qRow) return { ok: false, error: "Gagal menyimpan soal latihan." };

  await sb.from("lesson_question_answer_keys").insert({
    question_id: qRow.id,
    answer_key: params.answerKey,
  });

  await bumpPublishedOrResetLesson(params.lessonId);
  return { ok: true };
}

export async function sbMoveLessonActivityOrder(params: {
  lessonId: string;
  activityId: string;
  direction: "up" | "down";
}): Promise<{ ok: boolean; error?: string }> {
  const sb = createSupabaseAdminClient();
  const [lessonRes, actsRes] = await Promise.all([
    sb.from("lessons").select("status").eq("id", params.lessonId).maybeSingle(),
    sb.from("lesson_activities").select("*").eq("lesson_id", params.lessonId).order("order_number"),
  ]);
  if (!lessonRes.data) return { ok: false, error: "Lesson tidak ditemukan." };
  if (lessonRes.data.status === "pending_review") {
    return { ok: false, error: "Konten sedang menunggu review. Batalkan pengajuan dulu." };
  }

  const acts = actsRes.data ?? [];
  const idx = acts.findIndex((a) => a.id === params.activityId);
  if (idx === -1) return { ok: false, error: "Aktivitas tidak ditemukan." };

  const targetIdx = params.direction === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= acts.length) return { ok: true };

  const currOrder = acts[idx].order_number;
  const swapOrder = acts[targetIdx].order_number;

  await Promise.all([
    sb.from("lesson_activities").update({ order_number: swapOrder }).eq("id", acts[idx].id),
    sb.from("lesson_activities").update({ order_number: currOrder }).eq("id", acts[targetIdx].id),
  ]);

  await bumpPublishedOrResetLesson(params.lessonId);
  return { ok: true };
}

export async function sbSubmitContentForValidation(params: {
  type: "lesson" | "quiz";
  targetId: string;
  adminId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const sb = createSupabaseAdminClient();
  const now = new Date().toISOString();

  if (params.type === "lesson") {
    const { data: lesson } = await sb
      .from("lessons")
      .select("id, content_version")
      .eq("id", params.targetId)
      .maybeSingle();
    if (!lesson) return { ok: false, error: "Lesson tidak ditemukan." };

    await Promise.all([
      sb
        .from("lessons")
        .update({ status: "pending_review", updated_at: now })
        .eq("id", lesson.id),
      sb.from("content_reviews").insert({
        lesson_id: lesson.id,
        quiz_id: null,
        content_version: lesson.content_version,
        status: "pending",
        submitted_by: params.adminId,
        submitted_at: now,
      }),
    ]);
    return { ok: true };
  }

  const [quizRes, qRes] = await Promise.all([
    sb.from("unit_quizzes").select("id, content_version").eq("id", params.targetId).maybeSingle(),
    sb.from("quiz_questions").select("id").eq("quiz_id", params.targetId),
  ]);
  if (!quizRes.data) return { ok: false, error: "Quiz tidak ditemukan." };
  const qCount = (qRes.data ?? []).length;
  if (qCount < 15 || qCount > 20) {
    return {
      ok: false,
      error: `Quiz Unit wajib memiliki 15 sampai 20 soal sebelum diajukan (saat ini ${qCount} soal).`,
    };
  }

  await Promise.all([
    sb
      .from("unit_quizzes")
      .update({ status: "pending_review" })
      .eq("id", quizRes.data.id),
    sb.from("content_reviews").insert({
      lesson_id: null,
      quiz_id: quizRes.data.id,
      content_version: quizRes.data.content_version,
      status: "pending",
      submitted_by: params.adminId,
      submitted_at: now,
    }),
  ]);
  return { ok: true };
}

export async function sbCancelPendingReviewSubmission(params: {
  type: "lesson" | "quiz";
  targetId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const sb = createSupabaseAdminClient();
  const now = new Date().toISOString();

  if (params.type === "lesson") {
    await Promise.all([
      sb.from("lessons").update({ status: "draft", updated_at: now }).eq("id", params.targetId),
      sb
        .from("content_reviews")
        .delete()
        .eq("lesson_id", params.targetId)
        .eq("status", "pending"),
    ]);
    return { ok: true };
  }

  await Promise.all([
    sb.from("unit_quizzes").update({ status: "draft" }).eq("id", params.targetId),
    sb
      .from("content_reviews")
      .delete()
      .eq("quiz_id", params.targetId)
      .eq("status", "pending"),
  ]);
  return { ok: true };
}

export async function sbPublishApprovedContent(params: {
  type: "lesson" | "quiz";
  targetId: string;
}): Promise<{ ok: boolean; error?: string }> {
  const sb = createSupabaseAdminClient();
  const now = new Date().toISOString();

  if (params.type === "lesson") {
    const { data: lesson } = await sb
      .from("lessons")
      .select("status")
      .eq("id", params.targetId)
      .maybeSingle();
    if (!lesson) return { ok: false, error: "Lesson tidak ditemukan." };
    if (lesson.status !== "approved") {
      return {
        ok: false,
        error: "Hanya konten berstatus Disetujui Validator yang dapat diterbitkan.",
      };
    }
    await sb
      .from("lessons")
      .update({ status: "published", updated_at: now })
      .eq("id", params.targetId);
    return { ok: true };
  }

  const { data: quiz } = await sb
    .from("unit_quizzes")
    .select("status")
    .eq("id", params.targetId)
    .maybeSingle();
  if (!quiz) return { ok: false, error: "Quiz tidak ditemukan." };
  if (quiz.status !== "approved") {
    return {
      ok: false,
      error: "Hanya quiz berstatus Disetujui Validator yang dapat diterbitkan.",
    };
  }
  await sb.from("unit_quizzes").update({ status: "published" }).eq("id", params.targetId);
  return { ok: true };
}

export async function sbGetAdminQuizzesOverview() {
  "use cache";
  cacheLife("minutes");
  cacheTag("curriculum");

  const sb = createSupabaseAdminClient();
  const [curriculum, keyRes] = await Promise.all([
    getCachedCurriculum(),
    sb.from("quiz_question_answer_keys").select("*"),
  ]);

  const { units, quizzes, lessons, quizQuestions: questions } = curriculum;
  const keyMap = new Map((keyRes.data ?? []).map((k) => [String(k.question_id), k.answer_key as AnswerKey]));

  return units.map((unit) => {
    const quiz = quizzes.find((q) => q.unitId === unit.id) ?? null;
    const unitLessons = lessons.filter((l) => l.unitId === unit.id);
    const quizQuestions = quiz
      ? questions
          .filter((q) => q.quizId === quiz.id)
          .map((q) => ({ question: q, answerKey: keyMap.get(q.id) ?? null }))
      : [];
    return { unit, quiz, unitLessons, questions: quizQuestions };
  });
}

export async function sbAddQuizQuestionItem(params: {
  quizId: string;
  primaryLessonId: string;
  questionType: QuestionType;
  questionText: string;
  questionData: QuestionData;
  answerKey: AnswerKey;
  explanation: string;
  points: number;
}): Promise<{ ok: boolean; error?: string }> {
  const sb = createSupabaseAdminClient();
  const [quizRes, qRes] = await Promise.all([
    sb.from("unit_quizzes").select("*").eq("id", params.quizId).maybeSingle(),
    sb.from("quiz_questions").select("order_number").eq("quiz_id", params.quizId),
  ]);
  if (!quizRes.data) return { ok: false, error: "Quiz tidak ditemukan." };
  if (quizRes.data.status === "pending_review") {
    return { ok: false, error: "Quiz sedang menunggu review. Batalkan pengajuan dulu." };
  }
  const existing = qRes.data ?? [];
  if (existing.length >= 20) {
    return { ok: false, error: "Batas maksimal Quiz Unit adalah 20 soal." };
  }
  const maxOrder = existing.reduce(
    (max, q) => Math.max(max, Number(q.order_number ?? 0)),
    0
  );

  const { data: qRow, error: qErr } = await sb
    .from("quiz_questions")
    .insert({
      quiz_id: params.quizId,
      primary_lesson_id: params.primaryLessonId,
      question_type: params.questionType,
      question_text: params.questionText.trim(),
      question_data: params.questionData,
      explanation: params.explanation.trim(),
      points: params.points,
      order_number: maxOrder + 1,
    })
    .select("id")
    .single();
  if (qErr || !qRow) return { ok: false, error: "Gagal menyimpan soal quiz." };

  await sb.from("quiz_question_answer_keys").insert({
    question_id: qRow.id,
    answer_key: params.answerKey,
  });

  if (quizRes.data.status === "published") {
    await sb
      .from("unit_quizzes")
      .update({
        content_version: Number(quizRes.data.content_version ?? 1) + 1,
        status: "draft",
      })
      .eq("id", params.quizId);
  } else if (
    quizRes.data.status === "approved" ||
    quizRes.data.status === "changes_requested"
  ) {
    await sb
      .from("unit_quizzes")
      .update({ status: "draft" })
      .eq("id", params.quizId);
  }

  return { ok: true };
}

export async function sbListValidators(): Promise<Profile[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("profiles");

  const sb = createSupabaseAdminClient();
  const [emailMap, profRes] = await Promise.all([
    listAuthEmails(),
    sb.from("profiles").select("*").eq("role", "validator"),
  ]);
  return mapProfiles(profRes.data ?? [], emailMap);
}

export async function sbCreateValidatorProfile(params: {
  fullName: string;
  email: string;
  password: string;
}): Promise<{ ok: boolean; error?: string }> {
  const email = params.email.trim().toLowerCase();
  if (!params.fullName.trim() || !email || params.password.length < 6) {
    return {
      ok: false,
      error: "Nama lengkap, email valid, dan sandi minimal 6 karakter wajib diisi.",
    };
  }

  const sb = createSupabaseAdminClient();
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: params.password,
    email_confirm: true,
    user_metadata: { full_name: params.fullName.trim() },
  });

  if (error || !data.user) {
    return { ok: false, error: error?.message ?? "Gagal membuat akun Validator." };
  }

  const username = email.split("@")[0].replace(/[^a-z0-9]/g, "") || "validator";
  await sb
    .from("profiles")
    .update({
      full_name: params.fullName.trim(),
      username,
      role: "validator",
      is_active: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.user.id);

  return { ok: true };
}

export async function sbToggleValidatorStatus(
  userId: string
): Promise<{ ok: boolean }> {
  const sb = createSupabaseAdminClient();
  const { data: prof } = await sb
    .from("profiles")
    .select("is_active, role")
    .eq("id", userId)
    .eq("role", "validator")
    .maybeSingle();

  if (!prof) return { ok: false };
  await sb
    .from("profiles")
    .update({
      is_active: !Boolean(prof.is_active),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  return { ok: true };
}
