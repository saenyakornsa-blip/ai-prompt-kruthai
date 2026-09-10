-- ============================================================
-- AI Prompt ครูไทย — Supabase Database Setup
-- วิธีใช้: Dashboard > SQL Editor > วางและกด Run
-- ============================================================

-- ตาราง User profiles (ต่อเนื่องจาก Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  school TEXT,
  subject TEXT,
  grade_level TEXT,
  role TEXT DEFAULT 'teacher',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- ตาราง รายการโปรด
CREATE TABLE IF NOT EXISTS public.favorites (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt_id TEXT NOT NULL,
  book_number INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, prompt_id)
);

-- ตาราง ประวัติการ copy (สถิติ)
CREATE TABLE IF NOT EXISTS public.copy_events (
  id BIGSERIAL PRIMARY KEY,
  prompt_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  book_number INTEGER,
  chapter_number INTEGER,
  copied_at TIMESTAMPTZ DEFAULT NOW()
);

-- View: ความนิยมของ Prompt
CREATE OR REPLACE VIEW public.prompt_popularity
WITH (security_invoker = true) AS
  SELECT
    prompt_id,
    COUNT(*) as total_copies,
    COUNT(DISTINCT user_id) as unique_users,
    MAX(copied_at) as last_copied
  FROM public.copy_events
  GROUP BY prompt_id
  ORDER BY total_copies DESC;

-- View: สถิติผู้ใช้
CREATE OR REPLACE VIEW public.user_stats
WITH (security_invoker = true) AS
  SELECT
    ce.user_id,
    COUNT(*) as total_copies,
    COUNT(DISTINCT ce.prompt_id) as unique_prompts,
    COUNT(DISTINCT ce.book_number) as books_used,
    MAX(ce.copied_at) as last_activity
  FROM public.copy_events ce
  WHERE ce.user_id IS NOT NULL
  GROUP BY ce.user_id;

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.copy_events ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users manage own favorites" ON public.favorites USING (auth.uid() = user_id);
-- Copy events: บันทึกการใช้งาน (ทั้งบุคคลทั่วไปและสมาชิก)
DROP POLICY IF EXISTS "Anyone can log copies" ON public.copy_events;
DROP POLICY IF EXISTS "Users read own copies" ON public.copy_events;

CREATE POLICY "Anyone can log copies" ON public.copy_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (prompt_id IS NOT NULL);

CREATE POLICY "Users read own copies" ON public.copy_events
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Function: สร้าง profile อัตโนมัติเมื่อสมัครสมาชิก
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ตาราง: ให้คะแนนและคำแนะนำ/รีวิว Prompt (5 ดาว)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prompt_ratings (
  id BIGSERIAL PRIMARY KEY,
  prompt_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, prompt_id)
);

ALTER TABLE public.prompt_ratings ENABLE ROW LEVEL SECURITY;

-- นโยบายความปลอดภัย (RLS)
CREATE POLICY "Anyone can read ratings" ON public.prompt_ratings FOR SELECT USING (true);
CREATE POLICY "Users can insert their rating" ON public.prompt_ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their rating" ON public.prompt_ratings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their rating" ON public.prompt_ratings FOR DELETE USING (auth.uid() = user_id);

-- View: สรุปคะแนนเฉลี่ยและความนิยมของแต่ละ Prompt
CREATE OR REPLACE VIEW public.prompt_ratings_summary
WITH (security_invoker = true) AS
  SELECT
    prompt_id,
    ROUND(AVG(rating)::numeric, 1) as avg_rating,
    COUNT(*) as total_reviews
  FROM public.prompt_ratings
  GROUP BY prompt_id;
