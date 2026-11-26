import type {
  AnswerKey,
  QuestionData,
  QuestionResponseData,
  QuestionType,
} from "@/types/pasanku";

export const PASSING_SCORE = 75;

export interface GradedAnswer {
  isCorrect: boolean;
  earnedPoints: number;
  maxPoints: number;
  correctSummary: string;
}

export function gradeQuestion(
  questionType: QuestionType,
  questionData: QuestionData,
  answerKey: AnswerKey,
  responseData: QuestionResponseData | undefined,
  points: number
): GradedAnswer {
  const maxPoints = points > 0 ? points : 10;

  if (questionType === "matching" && "pairs" in answerKey) {
    const expectedPairs = answerKey.pairs;
    const totalPairs = Object.keys(expectedPairs).length;
    const userPairs =
      responseData && "pairs" in responseData ? responseData.pairs : {};

    let correctCount = 0;
    for (const [leftId, rightId] of Object.entries(expectedPairs)) {
      if (userPairs[leftId] === rightId) {
        correctCount += 1;
      }
    }

    const earnedPoints =
      totalPairs > 0
        ? Math.round(((correctCount / totalPairs) * maxPoints) * 100) / 100
        : 0;
    const isCorrect = totalPairs > 0 && correctCount === totalPairs;

    const matchingData =
      questionData.type === "matching" ? questionData : undefined;
    const pairLabels = matchingData
      ? Object.entries(expectedPairs).map(([lId, rId]) => {
          const lText =
            matchingData.leftItems.find((i) => i.id === lId)?.text ?? lId;
          const rText =
            matchingData.rightItems.find((i) => i.id === rId)?.text ?? rId;
          return `${lText} = ${rText}`;
        })
      : [];

    return {
      isCorrect,
      earnedPoints,
      maxPoints,
      correctSummary: pairLabels.join(", "),
    };
  }

  if ("correctOption" in answerKey) {
    const selected =
      responseData && "selectedOption" in responseData
        ? responseData.selectedOption
        : "";
    const isCorrect = selected === answerKey.correctOption;

    let correctLabel = answerKey.correctOption;
    if ("options" in questionData) {
      const found = questionData.options.find(
        (opt) => opt.id === answerKey.correctOption
      );
      if (found) {
        correctLabel = found.label;
      }
    }

    return {
      isCorrect,
      earnedPoints: isCorrect ? maxPoints : 0,
      maxPoints,
      correctSummary: correctLabel,
    };
  }

  return {
    isCorrect: false,
    earnedPoints: 0,
    maxPoints,
    correctSummary: "-",
  };
}

export function calculatePercentageScore(
  earnedPoints: number,
  totalPoints: number
): number {
  if (totalPoints <= 0) return 0;
  return Math.round((earnedPoints / totalPoints) * 100);
}

export function isScorePassed(score: number): boolean {
  return score >= PASSING_SCORE;
}
