-- ============================================================
-- صلاحيات SELECT للمشرفين على جميع الجداول
-- تسمح للمشرف (admin) بقراءة بيانات جميع المستخدمين
-- مع ضمان عدم إمكانية تعديل أو حذف بيانات الآخرين من الواجهة
-- ============================================================

-- profiles
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- api_keys
CREATE POLICY "Admins can view all api_keys"
  ON api_keys FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- sms_logs
CREATE POLICY "Admins can view all sms_logs"
  ON sms_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- campaigns
CREATE POLICY "Admins can view all campaigns"
  ON campaigns FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- campaign_messages
CREATE POLICY "Admins can view all campaign_messages"
  ON campaign_messages FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- device_push_tokens
CREATE POLICY "Admins can view all device_push_tokens"
  ON device_push_tokens FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- user_links
CREATE POLICY "Admins can view all user_links"
  ON user_links FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- rate_limits
CREATE POLICY "Admins can view all rate_limits"
  ON rate_limits FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));
