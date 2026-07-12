-- =====================================================
-- منع تسجيل حسابات مكررة بنفس البريد الإلكتروني
-- Migration: 20260714000001_prevent_duplicate_accounts.sql
-- =====================================================

-- 1. إضافة عمود email إلى profiles مع فهرس فريد
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- فهرس فريد يمنع التكرار (يسمح بـ null واحد فقط)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique
  ON public.profiles (email)
  WHERE email IS NOT NULL;

-- 2. تعبئة البريد الإلكتروني للمستخدمين الحاليين
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.user_id = au.id
  AND p.email IS NULL;

-- 3. إصلاح trigger handle_new_user لتعبئة البريد تلقائياً
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, company_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'company_name', ''),
    NEW.email
  )
  ON CONFLICT (user_id) DO UPDATE
    SET email = COALESCE(EXCLUDED.email, profiles.email),
        full_name = COALESCE(NULLIF(EXCLUDED.full_name, ''), profiles.full_name);
  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  RAISE WARNING 'Profile already exists for user %', NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. إصلاح trigger update_profiles_updated_at المكسور
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 5. دالة للتحقق من وجود البريد الإلكتروني (تتجاوز RLS)
CREATE OR REPLACE FUNCTION public.check_email_exists(p_email TEXT)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE email = p_email
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- السماح للمصادق فقط بالاستدعاء
GRANT EXECUTE ON FUNCTION public.check_email_exists(TEXT) TO authenticated;

-- 6. منع المستخدمين من إنشاء حسابات بريد إضافية عبر RLS
-- (التعديل على политика INSERT للتأكد من عدم وجود بريد مكرر)
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
CREATE POLICY "Users can create their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND (
      email IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.email = profiles.email
          AND p.user_id != profiles.user_id
      )
    )
  );
