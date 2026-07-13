-- 1) Add DELETE policy for sms_logs so users can delete their own logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'sms_logs' AND policyname = 'Users can delete their own SMS logs') THEN
    CREATE POLICY "Users can delete their own SMS logs"
    ON public.sms_logs
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- 2) Harden handle_new_user() - validate & sanitize user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
BEGIN
  v_full_name := NULLIF(TRIM(new.raw_user_meta_data ->> 'full_name'), '');

  IF v_full_name IS NOT NULL AND LENGTH(v_full_name) > 200 THEN
    v_full_name := SUBSTRING(v_full_name, 1, 200);
  END IF;

  INSERT INTO public.profiles (user_id, full_name)
  VALUES (new.id, v_full_name)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating profile for user %', new.id;
    RETURN new;
END;
$$;

-- 3) Rate-limits table for send-sms
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  messages_sent INTEGER NOT NULL DEFAULT 0,
  requests_made INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_window
  ON public.rate_limits(user_id, window_start);

GRANT SELECT ON public.rate_limits TO authenticated;
GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'rate_limits' AND policyname = 'Users can view their own rate limits') THEN
    CREATE POLICY "Users can view their own rate limits"
    ON public.rate_limits
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;
-- Writes are performed by the edge function using the service role only.