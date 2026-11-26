import assert from "node:assert/strict";
import {
  calculatePercentageScore,
  gradeQuestion,
  isScorePassed,
} from "../lib/domain/scoring.ts";
import { generateRemedialPlan } from "../lib/domain/recommendation.ts";
import {
  getXpAwardIfEligible,
  XP_REWARDS,
} from "../lib/domain/gamification.ts";
import {
  canStartQuiz,
  isLessonUnlocked,
  isUnitUnlocked,
} from "../lib/domain/access.ts";

// 1. Verifikasi Scoring & Partial Credit Matching
const mcPass = gradeQuestion(
  "multiple_choice_pasan_to_id",
  {
    type: "multiple_choice_pasan_to_id",
    options: [
      { id: "A", label: "Salah" },
      { id: "B", label: "Benar" },
    ],
  },
  { correctOption: "B" },
  { selectedOption: "B" },
  10
);
assert.equal(mcPass.isCorrect, true);
assert.equal(mcPass.earnedPoints, 10);

const matchingPartial = gradeQuestion(
  "matching",
  {
    type: "matching",
    leftItems: [
      { id: "l1", text: "Tabea" },
      { id: "l2", text: "O" },
      { id: "l3", text: "Taidi" },
    ],
    rightItems: [
      { id: "r1", text: "Halo" },
      { id: "r2", text: "Ya" },
      { id: "r3", text: "Tidak" },
    ],
  },
  { pairs: { l1: "r1", l2: "r2", l3: "r3" } },
  { pairs: { l1: "r1", l2: "r3", l3: "r2" } },
  15
);
assert.equal(matchingPartial.isCorrect, false);
assert.equal(matchingPartial.earnedPoints, 5); // 1 dari 3 pasang benar = 5/15 poin

assert.equal(calculatePercentageScore(75, 100), 75);
assert.equal(isScorePassed(75), true);
assert.equal(isScorePassed(74), false);

// 2. Verifikasi Rekomendasi Adaptif (error_count DESC, lessonOrder ASC, maks 3, skip 0 error)
const plan = generateRemedialPlan({
  wrongPrimaryLessonIds: [
    "l1",
    "l5",
    "l2",
    "l2",
    "l3",
    "l3",
    "l4",
  ],
  lessonOrderById: { l1: 1, l2: 2, l3: 3, l4: 4, l5: 5 },
});
assert.equal(plan.length, 3);
assert.deepEqual(
  plan.map((p) => p.lessonId),
  ["l2", "l3", "l1"]
);

// 3. Verifikasi Pencegahan XP Ganda & Nilai Reward
assert.equal(
  getXpAwardIfEligible({
    transactions: [],
    userId: "u1",
    activityType: "lesson",
    referenceId: "l1",
    passed: true,
  }),
  XP_REWARDS.lesson
);
assert.equal(
  getXpAwardIfEligible({
    transactions: [],
    userId: "u1",
    activityType: "lesson",
    referenceId: "l1",
    passed: false,
  }),
  0
);
assert.equal(
  getXpAwardIfEligible({
    transactions: [
      {
        id: "tx1",
        userId: "u1",
        activityType: "quiz",
        referenceId: "q1",
        xpAmount: 25,
        label: "Lulus",
        createdAt: "",
      },
    ],
    userId: "u1",
    activityType: "quiz",
    referenceId: "q1",
    passed: true,
  }),
  0
);

// 4. Verifikasi Aturan Akses Unit, Lesson, Quiz, dan Preview Mode
assert.equal(
  isUnitUnlocked({
    unitOrder: 1,
    unitId: "u1",
    unlockedUnitIds: new Set(),
  }),
  true
);
assert.equal(
  isUnitUnlocked({
    unitOrder: 2,
    unitId: "u2",
    unlockedUnitIds: new Set(),
  }),
  false
);
assert.equal(
  isUnitUnlocked({
    unitOrder: 5,
    unitId: "u5",
    unlockedUnitIds: new Set(),
    isPreview: true,
  }),
  true
);
assert.equal(
  isLessonUnlocked({
    unitUnlocked: true,
    lessonOrder: 2,
    previousLessonPassed: false,
  }),
  false
);
assert.equal(
  canStartQuiz({
    unitUnlocked: true,
    allFiveLessonsPassed: true,
    pendingRemedialCount: 2,
  }).allowed,
  false
);
assert.equal(
  canStartQuiz({
    unitUnlocked: false,
    allFiveLessonsPassed: false,
    pendingRemedialCount: 2,
    isPreview: true,
  }).allowed,
  true
);

console.log("SEMUA VERIFIKASI DOMAIN LOGIC PASANKU BERHASIL (100% PASS)");
