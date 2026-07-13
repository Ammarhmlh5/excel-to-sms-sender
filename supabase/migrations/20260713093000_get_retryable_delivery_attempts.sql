-- Returns delivery_attempts rows that are eligible for retry based on attempts count and backoff policy
CREATE OR REPLACE FUNCTION public.get_retryable_delivery_attempts(p_max_attempts integer)
RETURNS TABLE(
  id uuid,
  attempts integer,
  idempotency_key text,
  provider_reference text,
  campaign_message_id uuid,
  phone text,
  message text,
  updated_at timestamptz
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT da.id, da.attempts, da.idempotency_key, da.provider_reference, da.campaign_message_id,
    cm.phone, cm.message, da.updated_at
  FROM public.delivery_attempts da
  JOIN public.campaign_messages cm ON cm.id = da.campaign_message_id
  WHERE da.status = 'failed'
    AND (da.attempts IS NULL OR da.attempts < p_max_attempts)
    AND (
      -- attempt 0: immediate
      (da.attempts = 0 AND da.updated_at <= now())
      OR (da.attempts = 1 AND da.updated_at <= now() - interval '30 seconds')
      OR (da.attempts = 2 AND da.updated_at <= now() - interval '5 minutes')
      OR (da.attempts = 3 AND da.updated_at <= now() - interval '30 minutes')
      OR (da.attempts >= 4 AND da.updated_at <= now() - interval '24 hours')
    )
  ORDER BY da.updated_at ASC
  LIMIT 500;
END;
$$;
