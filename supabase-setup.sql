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

-- ============================================================
-- ตาราง: ข้อเสนอแนะและเสียงสะท้อนจากชุมชนครู (Community Feedback)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.community_feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT NOT NULL,
  role_or_school TEXT,
  category TEXT DEFAULT 'ข้อเสนอแนะทั่วไป', -- 'ข้อเสนอแนะทั่วไป', 'ขอ Prompt เพิ่มเติม', 'แชร์ไอเดีย', 'ชื่นชม & ให้กำลังใจ'
  message TEXT NOT NULL,
  rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_featured BOOLEAN DEFAULT false
);

ALTER TABLE public.community_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read feedback" ON public.community_feedback;
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.community_feedback;
DROP POLICY IF EXISTS "Authenticated users can insert feedback" ON public.community_feedback;

-- ทุกคน (ทั้งสมาชิกและผู้ใช้ทั่วไป) สามารถอ่านข้อเสนอแนะได้
CREATE POLICY "Anyone can read feedback" ON public.community_feedback
  FOR SELECT TO anon, authenticated
  USING (true);

-- สมาชิกที่เข้าสู่ระบบเท่านั้นที่มีสิทธิ์ส่งข้อเสนอแนะ
CREATE POLICY "Authenticated users can insert feedback" ON public.community_feedback
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND message IS NOT NULL AND length(message) >= 3);

-- ============================================================
-- RPC Functions สำหรับ Dynamic Community Dashboard (Security Definer)
-- ============================================================

-- ซิงค์ผู้ใช้ทุกคนใน auth.users เข้าตาราง profiles (เพื่อไม่ให้ตกหล่น)
INSERT INTO public.profiles (id, display_name)
SELECT 
  id, 
  COALESCE(raw_user_meta_data->>'display_name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- อนุญาตให้ทุกคนอ่านโปรไฟล์สาธารณะและนับจำนวนสมาชิกได้
DROP POLICY IF EXISTS "Anyone can read public profiles" ON public.profiles;
CREATE POLICY "Anyone can read public profiles" ON public.profiles FOR SELECT TO anon, authenticated USING (true);

-- อนุญาตให้อ่านประวัติการคัดลอกรวมเพื่อวาดกราฟและคำนวณสถิติ
DROP POLICY IF EXISTS "Anyone can read copy events" ON public.copy_events;
CREATE POLICY "Anyone can read copy events" ON public.copy_events FOR SELECT TO anon, authenticated USING (true);

-- 1. ภาพรวมตัวเลขสถิติทั้งระบบ (อ่านตรงจาก auth.users สมาชิกจริง)
CREATE OR REPLACE FUNCTION public.get_community_overview()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_members', (SELECT count(*) FROM auth.users),
    'total_copies', (SELECT count(*) FROM public.copy_events),
    'total_favorites', (SELECT count(*) FROM public.favorites),
    'total_feedback', (SELECT count(*) FROM public.community_feedback)
  ) INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_community_overview() TO anon, authenticated;

-- 2. ดึง 10 อันดับ Prompt ที่มีการ Copy มากที่สุด
CREATE OR REPLACE FUNCTION public.get_top_prompts(limit_count int DEFAULT 10)
RETURNS TABLE (prompt_id text, total_copies bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT prompt_id, count(*) as total_copies
  FROM public.copy_events
  GROUP BY prompt_id
  ORDER BY total_copies DESC
  LIMIT limit_count;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_prompts(int) TO anon, authenticated;

-- 3. สถิติการใช้งานแยกตาม 3 เล่ม (Book 1, 2, 3)
CREATE OR REPLACE FUNCTION public.get_book_usage_stats()
RETURNS TABLE (book_number int, total_copies bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT book_number, count(*) as total_copies
  FROM public.copy_events
  WHERE book_number IS NOT NULL
  GROUP BY book_number
  ORDER BY book_number;
$$;

GRANT EXECUTE ON FUNCTION public.get_book_usage_stats() TO anon, authenticated;

-- 4. สถิติกิจกรรมย้อนหลัง 7 วัน (Daily activity)
CREATE OR REPLACE FUNCTION public.get_daily_usage_stats(days_back int DEFAULT 7)
RETURNS TABLE (usage_date date, copy_count bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT date_trunc('day', copied_at)::date as usage_date, count(*) as copy_count
  FROM public.copy_events
  WHERE copied_at >= (NOW() - (days_back || ' days')::interval)
  GROUP BY usage_date
  ORDER BY usage_date ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_daily_usage_stats(int) TO anon, authenticated;

