-- Dead letter queue for delivery attempts that exhausted retries
CREATE TABLE IF NOT EXISTS public.dead_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_message_id uuid NOT NULL REFERENCES public.campaign_messages(id) ON DELETE CASCADE,
  delivery_attempt_id uuid NULL REFERENCES public.delivery_attempts(id) ON DELETE SET NULL,
  provider text,
  channel text,
  error_message text,
  response_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dead_letters_message ON public.dead_letters(campaign_message_id);
