import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createSeedDatabase } from "../lib/data/seed-data.ts";

function loadEnvLocal(): Record<string, string> {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env.local tidak ditemukan.");
  }
  const result: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    result[key] = val;
  }
  return result;
}

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local"
    );
  }

  const sb = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Cek koneksi tabel units
  const { data: existingUnits, error: unitsErr } = await sb
    .from("units")
    .select("id, order_number, title")
    .order("order_number");
  if (unitsErr) {
    throw new Error(`Gagal mengakses public.units: ${unitsErr.message}`);
  }

  const seed = createSeedDatabase();
  const idMap = new Map<string, string>();
  const mapUuid = (oldId: string): string => {
    const found = idMap.get(oldId);
    if (found) return found;
    const generated = crypto.randomUUID();
    idMap.set(oldId, generated);
    return generated;
  };

  if (!existingUnits || existingUnits.length === 0) {
    for (const u of seed.units) {
      const uid = mapUuid(u.id);
      const { error } = await sb.from("units").insert({
        id: uid,
        title: u.title,
        description: u.description,
        order_number: u.orderNumber,
        status: u.status,
      });
      if (error) throw new Error(`Insert unit gagal: ${error.message}`);
    }
    console.log(`Seeded ${seed.units.length} units.`);
  } else {
    for (const u of seed.units) {
      const match = existingUnits.find((eu) => eu.order_number === u.orderNumber);
      idMap.set(u.id, match ? match.id : mapUuid(u.id));
    }
    console.log(`Units sudah ada (${existingUnits.length} baris).`);
  }

  const { data: existingLessons, error: lessonsErr } = await sb
    .from("lessons")
    .select("id");
  if (lessonsErr) {
    throw new Error(`Gagal mengakses public.lessons: ${lessonsErr.message}`);
  }

  if (existingLessons && existingLessons.length > 0) {
    console.log(
      `Lessons sudah terisi (${existingLessons.length} baris). Tidak melakukan duplikasi.`
    );
    return;
  }

  // 2. Insert 25 lessons
  const { error: insLessonsErr } = await sb.from("lessons").insert(
    seed.lessons.map((l) => ({
      id: mapUuid(l.id),
      unit_id: mapUuid(l.unitId),
      title: l.title,
      description: l.description,
      objective: l.objective,
      order_number: l.orderNumber,
      content_version: l.contentVersion,
      status: l.status,
    }))
  );
  if (insLessonsErr) {
    throw new Error(`Insert lessons gagal: ${insLessonsErr.message}`);
  }

  // 3. Vocabularies
  const { error: vocErr } = await sb.from("vocabularies").insert(
    seed.vocabularies.map((v) => ({
      id: mapUuid(v.id),
      pasan_word: v.pasanWord,
      indonesian_meaning: v.indonesianMeaning,
      category: v.category,
      source_note: v.sourceNote,
      validation_status: v.validationStatus,
    }))
  );
  if (vocErr) throw new Error(`Insert vocabularies gagal: ${vocErr.message}`);

  // 4. Activities, Materials, Links, Examples
  const { error: actErr } = await sb.from("lesson_activities").insert(
    seed.activities.map((a) => ({
      id: mapUuid(a.id),
      lesson_id: mapUuid(a.lessonId),
      activity_type: a.activityType,
      title: a.title,
      instruction: a.instruction,
      order_number: a.orderNumber,
      is_required: a.isRequired,
    }))
  );
  if (actErr) throw new Error(`Insert activities gagal: ${actErr.message}`);

  const { error: matErr } = await sb.from("lesson_materials").insert(
    seed.materials.map((m) => ({
      id: mapUuid(m.id),
      activity_id: mapUuid(m.activityId),
      content: m.content,
      explanation: m.explanation,
      estimated_duration: m.estimatedDuration,
    }))
  );
  if (matErr) throw new Error(`Insert materials gagal: ${matErr.message}`);

  const { error: mvErr } = await sb.from("material_vocabularies").insert(
    seed.materialVocabularies.map((mv) => ({
      id: mapUuid(mv.id),
      material_id: mapUuid(mv.materialId),
      vocabulary_id: mapUuid(mv.vocabularyId),
      order_number: mv.orderNumber,
    }))
  );
  if (mvErr) throw new Error(`Insert material_vocabularies gagal: ${mvErr.message}`);

  const { error: exErr } = await sb.from("material_examples").insert(
    seed.materialExamples.map((ex) => ({
      id: mapUuid(ex.id),
      material_id: mapUuid(ex.materialId),
      pasan_text: ex.pasanText,
      indonesian_translation: ex.indonesianTranslation,
      order_number: ex.orderNumber,
    }))
  );
  if (exErr) throw new Error(`Insert material_examples gagal: ${exErr.message}`);

  // 5. Lesson Questions & Answer Keys
  const { error: lqErr } = await sb.from("lesson_questions").insert(
    seed.lessonQuestions.map((q) => ({
      id: mapUuid(q.id),
      activity_id: mapUuid(q.activityId),
      question_type: q.questionType,
      question_text: q.questionText,
      question_data: q.questionData,
      explanation: q.explanation,
      points: q.points,
      order_number: q.orderNumber,
    }))
  );
  if (lqErr) throw new Error(`Insert lesson_questions gagal: ${lqErr.message}`);

  const { error: lkakErr } = await sb
    .from("lesson_question_answer_keys")
    .insert(
      seed.lessonAnswerKeys.map((k) => ({
        question_id: mapUuid(k.questionId),
        answer_key: k.answerKey,
      }))
    );
  if (lkakErr) {
    throw new Error(`Insert lesson_question_answer_keys gagal: ${lkakErr.message}`);
  }

  // 6. Unit Quizzes & Quiz Questions & Keys
  const { error: uqErr } = await sb.from("unit_quizzes").insert(
    seed.unitQuizzes.map((q) => ({
      id: mapUuid(q.id),
      unit_id: mapUuid(q.unitId),
      title: q.title,
      description: q.description,
      passing_score: q.passingScore,
      content_version: q.contentVersion,
      status: q.status,
    }))
  );
  if (uqErr) throw new Error(`Insert unit_quizzes gagal: ${uqErr.message}`);

  const { error: qqErr } = await sb.from("quiz_questions").insert(
    seed.quizQuestions.map((q) => ({
      id: mapUuid(q.id),
      quiz_id: mapUuid(q.quizId),
      primary_lesson_id: mapUuid(q.primaryLessonId),
      question_type: q.questionType,
      question_text: q.questionText,
      question_data: q.questionData,
      explanation: q.explanation,
      points: q.points,
      order_number: q.orderNumber,
    }))
  );
  if (qqErr) throw new Error(`Insert quiz_questions gagal: ${qqErr.message}`);

  const { error: qakErr } = await sb.from("quiz_question_answer_keys").insert(
    seed.quizAnswerKeys.map((k) => ({
      question_id: mapUuid(k.questionId),
      answer_key: k.answerKey,
    }))
  );
  if (qakErr) {
    throw new Error(`Insert quiz_question_answer_keys gagal: ${qakErr.message}`);
  }

  console.log(
    `SEED SUPABASE BERHASIL: ${seed.lessons.length} lessons, ${seed.vocabularies.length} vocabularies, ${seed.lessonQuestions.length} lesson questions, ${seed.unitQuizzes.length} quizzes, ${seed.quizQuestions.length} quiz questions.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
