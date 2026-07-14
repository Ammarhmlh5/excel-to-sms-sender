CREATE TABLE IF NOT EXISTS public.hudhud_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_hudhud_settings_updated_at ON public.hudhud_settings;
CREATE TRIGGER trg_hudhud_settings_updated_at
BEFORE UPDATE ON public.hudhud_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
