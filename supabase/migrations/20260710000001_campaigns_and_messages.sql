-- Campaigns table: tracks bulk SMS campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'حملة جديدة',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'queued', 'sending', 'completed', 'partially_completed', 'failed', 'cancelled')),
  contacts_count INT NOT NULL DEFAULT 0,
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  source TEXT DEFAULT 'excel_upload',  -- excel_upload | manual | api | mobile
  device_id TEXT,                       -- مرتبط بجهاز الموبايل إن وُجد
  platform_id TEXT,                     -- معرف المنصة الأصلية (إن وُجد)
  metadata JSONB,                       -- معلومات إضافية
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_device_id ON campaigns(device_id);

-- Campaign messages table: individual messages within a campaign
CREATE TABLE IF NOT EXISTS campaign_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  name TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign ON campaign_messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_status ON campaign_messages(status);

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_messages ENABLE ROW LEVEL SECURITY;

-- RLS: users see only their own campaigns
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'campaigns' AND policyname = 'Users view own campaigns') THEN
    CREATE POLICY "Users view own campaigns"
      ON campaigns FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'campaigns' AND policyname = 'Users insert own campaigns') THEN
    CREATE POLICY "Users insert own campaigns"
      ON campaigns FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'campaigns' AND policyname = 'Users update own campaigns') THEN
    CREATE POLICY "Users update own campaigns"
      ON campaigns FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- RLS: campaign messages via campaign ownership
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'campaign_messages' AND policyname = 'Users view own campaign messages') THEN
    CREATE POLICY "Users view own campaign messages"
      ON campaign_messages FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM campaigns
          WHERE campaigns.id = campaign_messages.campaign_id
          AND campaigns.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'campaign_messages' AND policyname = 'Users insert own campaign messages') THEN
    CREATE POLICY "Users insert own campaign messages"
      ON campaign_messages FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM campaigns
          WHERE campaigns.id = campaign_messages.campaign_id
          AND campaigns.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Trigger: auto-update updated_at on campaigns
CREATE OR REPLACE FUNCTION update_campaign_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_updated_at();
