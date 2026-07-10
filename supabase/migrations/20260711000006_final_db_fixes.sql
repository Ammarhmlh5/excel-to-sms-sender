-- ============================================================
-- إصلاحات قاعدة البيانات المتبقية
-- ============================================================

-- 1. إصلاح cleanup_old_data — حذف Campaigns القديمة أيضاً
--    المشكلة: messages تُحذف أولاً تاركة campaign ميتة للأبد
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- حذف rate_limits الأقدم من 7 أيام
  DELETE FROM public.rate_limits
  WHERE window_start < now() - INTERVAL '7 days';

  -- حذف campaigns الأقدم من 30 يوم (campaign_messages ستُحذف CASCADE)
  DELETE FROM public.campaigns
  WHERE created_at < now() - INTERVAL '30 days';

  -- حذف sms_logs الأقدم من 90 يوم
  DELETE FROM public.sms_logs
  WHERE created_at < now() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. إضافة FK على rate_limits.user_id
--    يمنع صفوف يتيمة بعد حذف المستخدم
ALTER TABLE public.rate_limits
  ADD CONSTRAINT rate_limits_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. إضافة index على sms_logs.user_id
CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id ON public.sms_logs(user_id);

-- 4. إضافة composite index على campaign_messages(campaign_id, status)
--    يُسرّع استعلامات send-sms المتكررة
CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign_status
  ON public.campaign_messages(campaign_id, status);
