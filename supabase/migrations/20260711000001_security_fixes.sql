-- ============================================================
-- المرحلة 1: إصلاحات أمنية حرجة — RLS Policies
-- ============================================================

-- 1. إصلاح device_push_tokens INSERT policy
--    المشكلة: WITH CHECK (true) يسمح لأي مستخدم بتسجيل جهاز باسم مستخدم آخر
DROP POLICY IF EXISTS "Service role manages device tokens" ON device_push_tokens;

CREATE POLICY "Users insert own device tokens"
  ON device_push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 2. إضافة DELETE policy على device_push_tokens
CREATE POLICY "Users delete own device tokens"
  ON device_push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- 3. إضافة UPDATE policy على campaign_messages
--    مطلوب لتحديث حالة الرسائل بعد الإرسال
CREATE POLICY "Users update own campaign messages"
  ON campaign_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_messages.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- 4. إضافة DELETE policy على campaigns
CREATE POLICY "Users delete own campaigns"
  ON campaigns FOR DELETE
  USING (auth.uid() = user_id);

-- 5. إضافة DELETE policy على campaign_messages
CREATE POLICY "Users delete own campaign messages"
  ON campaign_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_messages.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- 6. إضافة UPDATE policy على user_links
CREATE POLICY "Users update own links"
  ON user_links FOR UPDATE
  USING (auth.uid() = local_user_id);

-- 7. إضافة DELETE policy على user_links
CREATE POLICY "Users delete own links"
  ON user_links FOR DELETE
  USING (auth.uid() = local_user_id);
