-- ============================================================
-- المرحلة 1: إصلاحات أمنية حرجة — RLS Policies
-- ============================================================

-- 1. إصلاح device_push_tokens INSERT policy
--    المشكلة: WITH CHECK (true) يسمح لأي مستخدم بتسجيل جهاز باسم مستخدم آخر
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'device_push_tokens'
      AND policyname = 'Users insert own device tokens'
  ) THEN
    CREATE POLICY "Users insert own device tokens"
      ON device_push_tokens FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 2. إضافة DELETE policy على device_push_tokens
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'device_push_tokens'
      AND policyname = 'Users delete own device tokens'
  ) THEN
    CREATE POLICY "Users delete own device tokens"
      ON device_push_tokens FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3. إضافة UPDATE policy على campaign_messages
--    مطلوب لتحديث حالة الرسائل بعد الإرسال
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'campaign_messages'
      AND policyname = 'Users update own campaign messages'
  ) THEN
    CREATE POLICY "Users update own campaign messages"
      ON campaign_messages FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM campaigns
          WHERE campaigns.id = campaign_messages.campaign_id
          AND campaigns.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 4. إضافة DELETE policy على campaigns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'campaigns'
      AND policyname = 'Users delete own campaigns'
  ) THEN
    CREATE POLICY "Users delete own campaigns"
      ON campaigns FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 5. إضافة DELETE policy على campaign_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'campaign_messages'
      AND policyname = 'Users delete own campaign messages'
  ) THEN
    CREATE POLICY "Users delete own campaign messages"
      ON campaign_messages FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM campaigns
          WHERE campaigns.id = campaign_messages.campaign_id
          AND campaigns.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- 6. إضافة UPDATE policy على user_links
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_links'
      AND policyname = 'Users update own links'
  ) THEN
    CREATE POLICY "Users update own links"
      ON user_links FOR UPDATE
      USING (auth.uid() = local_user_id);
  END IF;
END $$;

-- 7. إضافة DELETE policy على user_links
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_links'
      AND policyname = 'Users delete own links'
  ) THEN
    CREATE POLICY "Users delete own links"
      ON user_links FOR DELETE
      USING (auth.uid() = local_user_id);
  END IF;
END $$;
