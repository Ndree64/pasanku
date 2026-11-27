import type {
  AnswerKey,
  QuestionData,
  QuestionType,
} from "@/types/pasanku";

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice_pasan_to_id: "Pilihan Ganda (Pasan ke Indonesia)",
  multiple_choice_id_to_pasan: "Pilihan Ganda (Indonesia ke Pasan)",
  matching: "Mencocokkan Pasangan",
  fill_blank: "Melengkapi Ungkapan / Kalimat Rumpang",
};

export function formatAnswerKeySummary(
  answerKey: AnswerKey | null,
  questionData?: QuestionData
): string {
  if (!answerKey) return "Belum diatur";
  if ("correctOption" in answerKey) {
    if (questionData && "options" in questionData) {
      const opt = questionData.options.find(
        (o) => o.id === answerKey.correctOption
      );
      if (opt) {
        return `Opsi ${answerKey.correctOption} (${opt.label})`;
      }
    }
    return `Opsi ${answerKey.correctOption}`;
  }
  if ("pairs" in answerKey) {
    if (questionData && questionData.type === "matching") {
      return Object.entries(answerKey.pairs)
        .map(([lId, rId]) => {
          const lText =
            questionData.leftItems.find((i) => i.id === lId)?.text ?? lId;
          const rText =
            questionData.rightItems.find((i) => i.id === rId)?.text ?? rId;
          return `${lText} = ${rText}`;
        })
        .join(", ");
    }
    return `${Object.keys(answerKey.pairs).length} pasangan`;
  }
  return "-";
}

export interface ParsedQuestionPayload {
  questionType: QuestionType;
  questionText: string;
  questionData: QuestionData;
  answerKey: AnswerKey;
  explanation: string;
  points: number;
}

export function parseQuestionFormData(formData: FormData): {
  ok: true;
  data: ParsedQuestionPayload;
} | {
  ok: false;
  error: string;
} {
  const rawType = String(formData.get("questionType") ?? "");
  const validTypes: QuestionType[] = [
    "multiple_choice_pasan_to_id",
    "multiple_choice_id_to_pasan",
    "matching",
    "fill_blank",
  ];
  if (!validTypes.includes(rawType as QuestionType)) {
    return { ok: false, error: "Bentuk soal tidak valid." };
  }
  const questionType = rawType as QuestionType;
  const questionText = String(formData.get("questionText") ?? "").trim();
  if (!questionText) {
    return { ok: false, error: "Pertanyaan / instruksi soal wajib diisi." };
  }

  const rawPoints = Number(formData.get("points") ?? 10);
  const points =
    Number.isFinite(rawPoints) && rawPoints > 0 && rawPoints <= 100
      ? Math.round(rawPoints)
      : questionType === "matching"
        ? 15
        : 10;
  const explanation = String(formData.get("explanation") ?? "").trim();

  if (questionType === "matching") {
    const rawPairs: Array<{ left: string; right: string }> = [];
    for (let i = 1; i <= 4; i++) {
      const left = String(formData.get(`pair${i}Left`) ?? "").trim();
      const right = String(formData.get(`pair${i}Right`) ?? "").trim();
      if (left && right) {
        rawPairs.push({ left, right });
      } else if (left || right) {
        return {
          ok: false,
          error: `Pasangan #${i} harus diisi lengkap di sisi kiri dan kanan.`,
        };
      }
    }
    if (rawPairs.length < 2) {
      return {
        ok: false,
        error: "Soal mencocokkan membutuhkan minimal 2 pasangan lengkap.",
      };
    }

    const leftItems = rawPairs.map((p, idx) => ({
      id: `l${idx + 1}`,
      text: p.left,
    }));
    const orderedRight = rawPairs.map((p, idx) => ({
      id: `r${idx + 1}`,
      text: p.right,
    }));
    // Acak deterministik agar jawaban kanan tidak langsung sejajar baris demi baris
    const rightItems = orderedRight.map(
      (_, idx) => orderedRight[(idx + 1) % orderedRight.length]
    );
    const pairs: Record<string, string> = {};
    for (let idx = 0; idx < rawPairs.length; idx++) {
      pairs[`l${idx + 1}`] = `r${idx + 1}`;
    }

    return {
      ok: true,
      data: {
        questionType,
        questionText,
        questionData: { type: "matching", leftItems, rightItems },
        answerKey: { pairs },
        explanation,
        points,
      },
    };
  }

  const optA = String(formData.get("optionA") ?? "").trim();
  const optB = String(formData.get("optionB") ?? "").trim();
  const optC = String(formData.get("optionC") ?? "").trim();
  const optD = String(formData.get("optionD") ?? "").trim();

  if (!optA || !optB || !optC) {
    return {
      ok: false,
      error: "Minimal 3 pilihan jawaban (A, B, C) wajib diisi.",
    };
  }

  const options = [
    { id: "A", label: optA },
    { id: "B", label: optB },
    { id: "C", label: optC },
  ];
  if (optD) {
    options.push({ id: "D", label: optD });
  }

  let correctOption = String(formData.get("correctOption") ?? "A").trim();
  if (!options.some((o) => o.id === correctOption)) {
    correctOption = "A";
  }

  if (questionType === "fill_blank") {
    const sentenceBefore = String(
      formData.get("sentenceBefore") ?? ""
    ).trim();
    const sentenceAfter = String(formData.get("sentenceAfter") ?? "").trim();
    const translationHint = String(
      formData.get("translationHint") ?? ""
    ).trim();

    if (!sentenceBefore && !sentenceAfter) {
      return {
        ok: false,
        error:
          "Isi minimal salah satu bagian kalimat (sebelum atau sesudah bagian kosong).",
      };
    }
    if (!translationHint) {
      return {
        ok: false,
        error: "Petunjuk arti kalimat bahasa Indonesia wajib diisi.",
      };
    }

    return {
      ok: true,
      data: {
        questionType,
        questionText,
        questionData: {
          type: "fill_blank",
          sentenceBefore,
          sentenceAfter,
          translationHint,
          options,
        },
        answerKey: { correctOption },
        explanation,
        points,
      },
    };
  }

  const promptWord = String(formData.get("promptWord") ?? "").trim();
  return {
    ok: true,
    data: {
      questionType,
      questionText,
      questionData: {
        type: questionType,
        ...(promptWord ? { promptWord } : {}),
        options,
      },
      answerKey: { correctOption },
      explanation,
      points,
    },
  };
}
