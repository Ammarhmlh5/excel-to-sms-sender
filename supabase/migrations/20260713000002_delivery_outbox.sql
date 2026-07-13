CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.delivery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_message_id uuid NOT NULL REFERENCES public.campaign_messages(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'expo',
  channel text NOT NULL DEFAULT 'push',
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sending','sent','failed','expired')),
  attempts integer NOT NULL DEFAULT 0,
  response_data jsonb DEFAULT '{}'::jsonb,
  error_message text,
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
