ALTER TABLE public.delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_attempts TO authenticated;
GRANT ALL ON public.delivery_attempts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_events TO authenticated;
GRANT ALL ON public.delivery_events TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'delivery_attempts' AND policyname = 'Users view own delivery attempts') THEN
    CREATE POLICY "Users view own delivery attempts" ON public.delivery_attempts
      FOR SELECT USING (
        EXISTS (
          SELECT 1
          FROM public.campaign_messages cm
          JOIN public.campaigns c ON c.id = cm.campaign_id
          WHERE cm.id = delivery_attempts.campaign_message_id
            AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'delivery_events' AND policyname = 'Users view own delivery events') THEN
    CREATE POLICY "Users view own delivery events" ON public.delivery_events
      FOR SELECT USING (
        EXISTS (
          SELECT 1
          FROM public.delivery_attempts da
          JOIN public.campaign_messages cm ON cm.id = da.campaign_message_id
          JOIN public.campaigns c ON c.id = cm.campaign_id
          WHERE da.id = delivery_events.delivery_attempt_id
            AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;
