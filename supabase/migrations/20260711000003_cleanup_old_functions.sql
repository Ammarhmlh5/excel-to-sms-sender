-- ============================================================
-- تنظيف الدوال القديمة غير المستخدمة
-- ============================================================

-- حذف الدالة القديمة `update_campaign_updated_at` (استُبدلت بـ `set_updated_at`)
DROP FUNCTION IF EXISTS public.update_campaign_updated_at();

-- حذف الدالة القديمة `update_updated_at_column` (استُبدلت بـ `set_updated_at`)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column'
  ) THEN
    -- إيقاف المشغلات التي تعتمد على هذه الدالة قبل حذفها
    DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
    DROP TRIGGER IF EXISTS update_api_keys_updated_at ON public.api_keys;
    DROP FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- تأكيد أن `handle_new_user` الحديثة هي الوحيدة المتبقية
-- (تم استبدالها بالنسخة المحسّنة في migration 20260708)
-- لا نحذفها لأنها مطلوبة للtrigger on_auth_user_created
