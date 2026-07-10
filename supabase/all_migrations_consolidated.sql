-- ============================================================
-- All migrations consolidated — paste this in Supabase SQL Editor
-- https://supabase.com/dashboard/project/jqilueudbhgcgskvkvhe/sql/new
-- ============================================================

-- ============================================================
-- 1. RLS Security Fixes
-- ============================================================

DROP POLICY IF EXISTS "Service role manages device tokens" ON device_push_tokens;

CREATE POLICY "Users insert own device tokens"
  ON device_push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own device tokens"
  ON device_push_tokens FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own campaign messages"
  ON campaign_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_messages.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users delete own campaigns"
  ON campaigns FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own campaign messages"
  ON campaign_messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = campaign_messages.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

CREATE POLICY "Users update own links"
  ON user_links FOR UPDATE
  USING (auth.uid() = local_user_id);

CREATE POLICY "Users delete own links"
  ON user_links FOR DELETE
  USING (auth.uid() = local_user_id);

-- ============================================================
-- 2. Infrastructure Cleanup
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
GRANT ALL ON public.api_keys TO service_role;
GRANT SELECT, INSERT, DELETE ON public.sms_logs TO authenticated;
GRANT ALL ON public.sms_logs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_messages TO authenticated;
GRANT ALL ON public.campaign_messages TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_push_tokens TO authenticated;
GRANT ALL ON public.device_push_tokens TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_links TO authenticated;
GRANT ALL ON public.user_links TO service_role;

-- ============================================================
-- 3. Cleanup function + drop old functions
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_data()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limits WHERE window_start < now() - INTERVAL '7 days';
  DELETE FROM public.campaigns WHERE created_at < now() - INTERVAL '30 days';
  DELETE FROM public.sms_logs WHERE created_at < now() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP FUNCTION IF EXISTS public.update_campaign_updated_at();
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- ============================================================
-- 4. Hardening auto_confirm_email
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS trigger AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 5. pg_cron (requires pg_cron extension enabled in Dashboard)
-- ============================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('cleanup-old-data-daily');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    PERFORM cron.schedule(
      'cleanup-old-data-daily',
      '0 3 * * *',
      $$SELECT public.cleanup_old_data()$$
    );
  ELSE
    RAISE NOTICE 'pg_cron not enabled — skipping';
  END IF;
END $$;

-- ============================================================
-- 6. Final DB Fixes
-- ============================================================

ALTER TABLE public.rate_limits
  ADD CONSTRAINT rate_limits_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id ON public.sms_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign_status
  ON public.campaign_messages(campaign_id, status);
