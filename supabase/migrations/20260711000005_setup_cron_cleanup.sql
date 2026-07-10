-- ============================================================
-- إعداد تنظيف تلقائي للبيانات القديمة عبر pg_cron
-- المطلوب: تفعيل امتداد pg_cron من Supabase Dashboard → Database → Extensions
-- ============================================================

-- تفعيل امتداد pg_cron (إذا لم يكن مفعلاً)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- حذف المهمة القديمة إذا وُجدت (بدون فشل إذا لم تكن موجودة)
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-old-data-daily');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- إنشاء مهمة تنظيف يومية الساعة 3:00 UTC
SELECT cron.schedule(
  'cleanup-old-data-daily',
  '0 3 * * *',
  $$SELECT public.cleanup_old_data()$$
);
