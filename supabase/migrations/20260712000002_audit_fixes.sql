-- ============================================================
-- إصلاحات بعد فحص شامل — CHECK constraints + indexes + ownership
-- ============================================================

-- 1. CHECK constraints على rate_limits (منع القيم السالبة)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.rate_limits'::regclass
      AND conname = 'rate_limits_messages_sent_nonneg'
  ) THEN
    ALTER TABLE public.rate_limits
      ADD CONSTRAINT rate_limits_messages_sent_nonneg
      CHECK (messages_sent >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.rate_limits'::regclass
      AND conname = 'rate_limits_requests_made_nonneg'
  ) THEN
    ALTER TABLE public.rate_limits
      ADD CONSTRAINT rate_limits_requests_made_nonneg
      CHECK (requests_made >= 0);
  END IF;
END $$;

-- 2. CHECK constraint على sms_logs.status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.sms_logs'::regclass
      AND conname = 'sms_logs_status_check'
  ) THEN
    ALTER TABLE public.sms_logs
      ADD CONSTRAINT sms_logs_status_check
      CHECK (status IN ('pending', 'sent', 'failed'));
  END IF;
END $$;

-- 3. Covering index على campaigns(id, user_id) لتسريع RLS على campaign_messages
CREATE INDEX IF NOT EXISTS idx_campaigns_id_user
  ON public.campaigns(id, user_id);

-- 4. حذف index المكرر (composite index يغني عنه)
DROP INDEX IF EXISTS public.idx_campaign_messages_campaign;

-- 5. SET search_path على handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, company_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'company_name', '')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN unique_violation THEN
  RAISE WARNING 'Profile already exists for user %', NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
