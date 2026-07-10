-- ============================================================
-- المرحلة 3: تحسينات بنية تحتية — updated_at موحدة + GRANT + cleanup
-- ============================================================

-- 1. دالة updated_at موحدة (تحديث الجداول القديمة لاستخدامها)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. استبدال Triggers القديمة بالدالة الموحدة
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS update_device_tokens_updated_at ON device_push_tokens;
CREATE TRIGGER update_device_tokens_updated_at
  BEFORE UPDATE ON device_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- 3. GRANT statements — تقييد الصلاحيات بشكل صريح
-- profiles
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- api_keys
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;

-- sms_logs
GRANT SELECT, INSERT, DELETE ON public.sms_logs TO authenticated;
GRANT ALL ON public.sms_logs TO service_role;

-- campaigns
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;

-- campaign_messages
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_messages TO authenticated;
GRANT ALL ON public.campaign_messages TO service_role;

-- device_push_tokens
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_push_tokens TO authenticated;
GRANT ALL ON public.device_push_tokens TO service_role;

-- user_links
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_links TO authenticated;
GRANT ALL ON public.user_links TO service_role;

-- 4. دالة تنظيف البيانات القديمة
CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void AS $$
BEGIN
  -- حذف rate_limits الأقدم من 7 أيام
  DELETE FROM public.rate_limits
  WHERE window_start < now() - INTERVAL '7 days';

  -- حذف campaign_messages الأقدم من 30 يوم (Campaigns ستُحذف تلقائياً عبر CASCADE)
  DELETE FROM public.campaign_messages
  WHERE created_at < now() - INTERVAL '30 days';

  -- حذف sms_logs الأقدم من 90 يوم
  DELETE FROM public.sms_logs
  WHERE created_at < now() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
