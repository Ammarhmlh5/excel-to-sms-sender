-- Add provider_reference and idempotency_key to delivery_attempts
ALTER TABLE IF EXISTS public.delivery_attempts
  ADD COLUMN IF NOT EXISTS provider_reference text;

ALTER TABLE IF EXISTS public.delivery_attempts
  ADD COLUMN IF NOT EXISTS idempotency_key text;

COMMENT ON COLUMN public.delivery_attempts.provider_reference IS 'Reference returned by the external provider for mapping callbacks';
COMMENT ON COLUMN public.delivery_attempts.idempotency_key IS 'Client-generated idempotency key for deduplication and retry mapping';
