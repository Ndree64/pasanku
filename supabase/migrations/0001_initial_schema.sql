-- PASANKU Initial PostgreSQL Schema (Supabase)
-- Mengacu pada SDD Pasanku v0.1 Bagian 5 (23 tabel relasional)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ENUM TYPES
CREATE TYPE user_role AS ENUM ('admin', 'validator', 'learner');
CREATE TYPE content_status AS ENUM ('draft', 'pending_review', 'changes_requested', 'approved', 'published');
CREATE TYPE activity_type AS ENUM ('material', 'exercise');
CREATE TYPE question_type AS ENUM (
  'multiple_choice_pasan_to_id',
  'multiple_choice_id_to_pasan',
  'matching',
  'fill_blank',
  'dialogue'
);
CREATE TYPE review_status AS ENUM ('pending', 'approved', 'changes_requested');
CREATE TYPE lesson_progress_status AS ENUM ('in_progress', 'completed');
CREATE TYPE progress_type AS ENUM ('regular', 'remedial');
CREATE TYPE activity_progress_status AS ENUM ('not_started', 'completed');
CREATE TYPE attempt_status AS ENUM ('in_progress', 'passed', 'failed');
CREATE TYPE remedial_status AS ENUM ('pending', 'in_progress', 'completed');
CREATE TYPE xp_activity_type AS ENUM ('lesson', 'remedial', 'quiz');

-- 1. profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  username TEXT UNIQUE,
  role user_role NOT NULL DEFAULT 'learner',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. units
CREATE TABLE public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  order_number INTEGER NOT NULL UNIQUE,
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. lessons
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  objective TEXT NOT NULL DEFAULT '',
  order_number INTEGER NOT NULL,
  content_version INTEGER NOT NULL DEFAULT 1,
  status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (unit_id, order_number)
);

-- 4. lesson_activities
CREATE TABLE public.lesson_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  title TEXT NOT NULL,
  instruction TEXT NOT NULL DEFAULT '',
  order_number INTEGER NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. lesson_materials
CREATE TABLE public.lesson_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL UNIQUE REFERENCES public.lesson_activities(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  estimated_duration INTEGER NOT NULL DEFAULT 60
);

-- 6. vocabularies
CREATE TABLE public.vocabularies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pasan_word TEXT NOT NULL,
  indonesian_meaning TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Kosakata',
  source_note TEXT NOT NULL DEFAULT '',
  validation_status content_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. material_vocabularies
CREATE TABLE public.material_vocabularies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.lesson_materials(id) ON DELETE CASCADE,
  vocabulary_id UUID NOT NULL REFERENCES public.vocabularies(id) ON DELETE CASCADE,
  order_number INTEGER NOT NULL DEFAULT 1
);

-- 8. material_examples
CREATE TABLE public.material_examples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.lesson_materials(id) ON DELETE CASCADE,
  pasan_text TEXT NOT NULL,
  indonesian_translation TEXT NOT NULL,
  order_number INTEGER NOT NULL DEFAULT 1
);

-- 9. lesson_questions
CREATE TABLE public.lesson_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id UUID NOT NULL REFERENCES public.lesson_activities(id) ON DELETE CASCADE,
  question_type question_type NOT NULL,
  question_text TEXT NOT NULL,
  question_data JSONB NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  points NUMERIC NOT NULL DEFAULT 10,
  order_number INTEGER NOT NULL DEFAULT 1
);

-- 10. lesson_question_answer_keys (TERISOLASI: Learner dilarang membaca)
CREATE TABLE public.lesson_question_answer_keys (
  question_id UUID PRIMARY KEY REFERENCES public.lesson_questions(id) ON DELETE CASCADE,
  answer_key JSONB NOT NULL
);

-- 11. unit_quizzes
CREATE TABLE public.unit_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL UNIQUE REFERENCES public.units(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  passing_score NUMERIC NOT NULL DEFAULT 75,
  content_version INTEGER NOT NULL DEFAULT 1,
  status content_status NOT NULL DEFAULT 'draft'
);

-- 12. quiz_questions
CREATE TABLE public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.unit_quizzes(id) ON DELETE CASCADE,
  primary_lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE RESTRICT,
  question_type question_type NOT NULL,
  question_text TEXT NOT NULL,
  question_data JSONB NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  points NUMERIC NOT NULL DEFAULT 10,
  order_number INTEGER NOT NULL DEFAULT 1
);

-- 13. quiz_question_answer_keys (TERISOLASI: Learner dilarang membaca)
CREATE TABLE public.quiz_question_answer_keys (
  question_id UUID PRIMARY KEY REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  answer_key JSONB NOT NULL
);

-- 14. content_reviews
CREATE TABLE public.content_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  quiz_id UUID REFERENCES public.unit_quizzes(id) ON DELETE CASCADE,
  content_version INTEGER NOT NULL DEFAULT 1,
  status review_status NOT NULL DEFAULT 'pending',
  submitted_by UUID NOT NULL REFERENCES public.profiles(id),
  reviewed_by UUID REFERENCES public.profiles(id),
  review_note TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  CONSTRAINT content_reviews_single_target CHECK (
    (lesson_id IS NOT NULL AND quiz_id IS NULL) OR
    (lesson_id IS NULL AND quiz_id IS NOT NULL)
  )
);

-- 15. unit_unlocks
CREATE TABLE public.unit_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, unit_id)
);

-- 16. learner_lesson_progress
CREATE TABLE public.learner_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed_content_version INTEGER NOT NULL DEFAULT 1,
  best_score NUMERIC NOT NULL DEFAULT 0,
  status lesson_progress_status NOT NULL DEFAULT 'in_progress',
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, lesson_id)
);

-- 17. lesson_activity_progress
CREATE TABLE public.lesson_activity_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES public.lesson_activities(id) ON DELETE CASCADE,
  progress_type progress_type NOT NULL DEFAULT 'regular',
  remedial_assignment_id UUID,
  status activity_progress_status NOT NULL DEFAULT 'not_started',
  completed_at TIMESTAMPTZ
);

-- 18. lesson_attempts
CREATE TABLE public.lesson_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  attempt_type progress_type NOT NULL DEFAULT 'regular',
  remedial_assignment_id UUID,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  score NUMERIC NOT NULL DEFAULT 0,
  status attempt_status NOT NULL DEFAULT 'in_progress',
  content_version INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 19. lesson_responses
CREATE TABLE public.lesson_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.lesson_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.lesson_questions(id) ON DELETE CASCADE,
  response_data JSONB NOT NULL,
  is_correct BOOLEAN NOT NULL,
  earned_points NUMERIC NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 20. quiz_attempts
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES public.unit_quizzes(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  score NUMERIC NOT NULL DEFAULT 0,
  status attempt_status NOT NULL DEFAULT 'in_progress',
  content_version INTEGER NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 21. quiz_responses
CREATE TABLE public.quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  response_data JSONB NOT NULL,
  is_correct BOOLEAN NOT NULL,
  earned_points NUMERIC NOT NULL DEFAULT 0,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 22. remedial_assignments
CREATE TABLE public.remedial_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quiz_attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  error_count INTEGER NOT NULL DEFAULT 1,
  priority_order INTEGER NOT NULL DEFAULT 1,
  content_version INTEGER NOT NULL DEFAULT 1,
  status remedial_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 23. xp_transactions (Pencegahan duplikasi XP dengan UNIQUE constraint)
CREATE TABLE public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_type xp_activity_type NOT NULL,
  reference_id UUID NOT NULL,
  xp_amount INTEGER NOT NULL CHECK (xp_amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, activity_type, reference_id)
);

-- TRIGGER: Otomatis membuat profile ber-role learner saat registrasi mandiri
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'learner'
  );

  -- Buka Unit 1 secara otomatis jika sudah ada
  INSERT INTO public.unit_unlocks (user_id, unit_id)
  SELECT NEW.id, u.id FROM public.units u WHERE u.order_number = 1
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- HELPER ROLE CHECK
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vocabularies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_vocabularies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_question_answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_question_answer_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learner_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_activity_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remedial_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;

-- POLICIES: PROFILES
CREATE POLICY "profiles_select_self_or_admin" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.current_user_role() = 'admin');

-- POLICIES: KURIKULUM (Admin kelola semua, Validator baca semua, Learner baca published)
CREATE POLICY "units_read" ON public.units
  FOR SELECT USING (
    status = 'published' OR public.current_user_role() IN ('admin', 'validator')
  );
CREATE POLICY "units_admin_write" ON public.units
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "lessons_read" ON public.lessons
  FOR SELECT USING (
    status = 'published' OR public.current_user_role() IN ('admin', 'validator')
  );
CREATE POLICY "lessons_admin_write" ON public.lessons
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "vocabularies_read" ON public.vocabularies
  FOR SELECT USING (
    validation_status = 'published' OR public.current_user_role() IN ('admin', 'validator')
  );

-- POLICIES: KUNCI JAWABAN (STRICT: hanya Admin & Validator, Learner DILARANG)
CREATE POLICY "lesson_answer_keys_privileged_only" ON public.lesson_question_answer_keys
  FOR SELECT USING (public.current_user_role() IN ('admin', 'validator'));
CREATE POLICY "lesson_answer_keys_admin_write" ON public.lesson_question_answer_keys
  FOR ALL USING (public.current_user_role() = 'admin');

CREATE POLICY "quiz_answer_keys_privileged_only" ON public.quiz_question_answer_keys
  FOR SELECT USING (public.current_user_role() IN ('admin', 'validator'));
CREATE POLICY "quiz_answer_keys_admin_write" ON public.quiz_question_answer_keys
  FOR ALL USING (public.current_user_role() = 'admin');

-- POLICIES: PROGRES, ATTEMPTS, REMEDIAL, XP (Learner milik sendiri, Admin lihat)
CREATE POLICY "unit_unlocks_owner" ON public.unit_unlocks
  FOR SELECT USING (user_id = auth.uid() OR public.current_user_role() = 'admin');

CREATE POLICY "lesson_progress_owner" ON public.learner_lesson_progress
  FOR SELECT USING (user_id = auth.uid() OR public.current_user_role() = 'admin');

CREATE POLICY "lesson_attempts_owner" ON public.lesson_attempts
  FOR SELECT USING (user_id = auth.uid() OR public.current_user_role() = 'admin');

CREATE POLICY "quiz_attempts_owner" ON public.quiz_attempts
  FOR SELECT USING (user_id = auth.uid() OR public.current_user_role() = 'admin');

CREATE POLICY "remedial_owner" ON public.remedial_assignments
  FOR SELECT USING (user_id = auth.uid() OR public.current_user_role() = 'admin');

CREATE POLICY "xp_owner" ON public.xp_transactions
  FOR SELECT USING (user_id = auth.uid() OR public.current_user_role() = 'admin');

CREATE POLICY "content_reviews_privileged" ON public.content_reviews
  FOR SELECT USING (public.current_user_role() IN ('admin', 'validator'));
