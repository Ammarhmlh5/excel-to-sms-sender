CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_message_id uuid NOT NULL REFERENCES public.campaign_messages(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'hudhud',
  channel text NOT NULL DEFAULT 'sms',
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','failed','expired')),
  attempts integer NOT NULL DEFAULT 0,
  response_data jsonb DEFAULT '{}'::jsonb,
  error_message text,
  provider_reference text,
  idempotency_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.delivery_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_attempt_id uuid NOT NULL REFERENCES public.delivery_attempts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  event_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_attempts_message ON public.delivery_attempts(campaign_message_id);
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_status ON public.delivery_attempts(status);
CREATE INDEX IF NOT EXISTS idx_delivery_events_attempt ON public.delivery_events(delivery_attempt_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_attempts TO authenticated;
GRANT ALL ON public.delivery_attempts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_events TO authenticated;
GRANT ALL ON public.delivery_events TO service_role;

ALTER TABLE public.delivery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='delivery_attempts' AND policyname='Users view own delivery attempts') THEN
    CREATE POLICY "Users view own delivery attempts" ON public.delivery_attempts
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.campaign_messages cm
          JOIN public.campaigns c ON c.id = cm.campaign_id
          WHERE cm.id = delivery_attempts.campaign_message_id AND c.user_id = auth.uid()
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='delivery_events' AND policyname='Users view own delivery events') THEN
    CREATE POLICY "Users view own delivery events" ON public.delivery_events
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.delivery_attempts da
          JOIN public.campaign_messages cm ON cm.id = da.campaign_message_id
          JOIN public.campaigns c ON c.id = cm.campaign_id
          WHERE da.id = delivery_events.delivery_attempt_id AND c.user_id = auth.uid()
        )
      );
  END IF;
END $$;