
-- Campaigns
CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'حملة جديدة',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','queued','sending','completed','partially_completed','failed','cancelled')),
  contacts_count INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  source TEXT DEFAULT 'excel_upload',
  device_id TEXT,
  platform_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own campaigns" ON public.campaigns FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own campaigns" ON public.campaigns FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own campaigns" ON public.campaigns FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own campaigns" ON public.campaigns FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);

-- Campaign messages
CREATE TABLE IF NOT EXISTS public.campaign_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','failed','skipped')),
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_messages TO authenticated;
GRANT ALL ON public.campaign_messages TO service_role;
ALTER TABLE public.campaign_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own campaign messages" ON public.campaign_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = campaign_messages.campaign_id AND campaigns.user_id = auth.uid()));
CREATE POLICY "Users insert own campaign messages" ON public.campaign_messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaigns WHERE campaigns.id = campaign_messages.campaign_id AND campaigns.user_id = auth.uid()));
CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign ON public.campaign_messages(campaign_id);

-- Device push tokens
CREATE TABLE IF NOT EXISTS public.device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  push_token TEXT,
  hardware_id TEXT,
  device_name TEXT,
  platform TEXT,
  app_version TEXT,
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, device_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.device_push_tokens TO authenticated;
GRANT ALL ON public.device_push_tokens TO service_role;
ALTER TABLE public.device_push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own device tokens" ON public.device_push_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own device tokens" ON public.device_push_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own device tokens" ON public.device_push_tokens FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own device tokens" ON public.device_push_tokens FOR DELETE USING (auth.uid() = user_id);

-- User links
CREATE TABLE IF NOT EXISTS public.user_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_platform TEXT NOT NULL,
  external_user_id TEXT NOT NULL,
  external_email TEXT,
  linked_via TEXT DEFAULT 'manual',
  is_verified BOOLEAN DEFAULT false,
  linked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(local_user_id, external_platform)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_links TO authenticated;
GRANT ALL ON public.user_links TO service_role;
ALTER TABLE public.user_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own links" ON public.user_links FOR SELECT USING (auth.uid() = local_user_id);
CREATE POLICY "Users insert own links" ON public.user_links FOR INSERT WITH CHECK (auth.uid() = local_user_id);
CREATE POLICY "Users delete own links" ON public.user_links FOR DELETE USING (auth.uid() = local_user_id);
