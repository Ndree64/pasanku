import type { XpActivityType, XpTransaction } from "@/types/pasanku";

export const XP_REWARDS: Record<XpActivityType, number> = {
  lesson: 10,
  remedial: 5,
  quiz: 25,
};

export function hasReceivedXp(
  transactions: XpTransaction[],
  userId: string,
  activityType: XpActivityType,
  referenceId: string
): boolean {
  return transactions.some(
    (tx) =>
      tx.userId === userId &&
      tx.activityType === activityType &&
      tx.referenceId === referenceId
  );
}

export function getXpAwardIfEligible(params: {
  transactions: XpTransaction[];
  userId: string;
  activityType: XpActivityType;
  referenceId: string;
  passed: boolean;
}): number {
  if (!params.passed) return 0;
  if (
    hasReceivedXp(
      params.transactions,
      params.userId,
      params.activityType,
      params.referenceId
    )
  ) {
    return 0;
  }
  return XP_REWARDS[params.activityType];
}

export interface LevelInfo {
  level: number;
  title: string;
  currentMinXp: number;
  nextLevelXp: number;
  progressPercent: number;
}

const LEVELS = [
  { level: 1, title: "Pemula Pasan", minXp: 0 },
  { level: 2, title: "Penjelajah Kata", minXp: 30 },
  { level: 3, title: "Sahabat Ratahan", minXp: 75 },
  { level: 4, title: "Penutur Aktif", minXp: 140 },
  { level: 5, title: "Penjaga Warisan", minXp: 225 },
];

export function calculateLevel(totalXp: number): LevelInfo {
  let active = LEVELS[0];
  let next = LEVELS[1];

  for (let i = 0; i < LEVELS.length; i++) {
    if (totalXp >= LEVELS[i].minXp) {
      active = LEVELS[i];
      next = LEVELS[i + 1] ?? {
        level: active.level + 1,
        title: active.title,
        minXp: active.minXp + 100,
      };
    }
  }

  const span = Math.max(1, next.minXp - active.minXp);
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round(((totalXp - active.minXp) / span) * 100))
  );

  return {
    level: active.level,
    title: active.title,
    currentMinXp: active.minXp,
    nextLevelXp: next.minXp,
    progressPercent,
  };
}

export interface BadgeInfo {
  id: string;
  title: string;
  description: string;
  earned: boolean;
}

export function computeBadges(params: {
  completedLessonsCount: number;
  passedQuizzesCount: number;
  completedRemedialsCount: number;
  totalXp: number;
}): BadgeInfo[] {
  return [
    {
      id: "first-step",
      title: "Langkah Pertama",
      description: "Menyelesaikan lesson pertama di Bahasa Pasan",
      earned: params.completedLessonsCount >= 1,
    },
    {
      id: "unit-master",
      title: "Penakluk Unit",
      description: "Lulus minimal satu Quiz Unit dengan nilai 75+",
      earned: params.passedQuizzesCount >= 1,
    },
    {
      id: "resilient-learner",
      title: "Pantang Menyerah",
      description: "Menyelesaikan lesson remedial setelah evaluasi",
      earned: params.completedRemedialsCount >= 1,
    },
    {
      id: "xp-collector",
      title: "Pengumpul Warisan",
      description: "Mengumpulkan minimal 50 XP belajar",
      earned: params.totalXp >= 50,
    },
  ];
}
