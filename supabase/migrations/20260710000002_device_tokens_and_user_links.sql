-- Device push tokens: registered devices from mobile app
CREATE TABLE IF NOT EXISTS device_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,              -- UUID from mobile app
  push_token TEXT,
  hardware_id TEXT,
  device_name TEXT,
  platform TEXT,                        -- android | ios
  app_version TEXT,
  is_active BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON device_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_device ON device_push_tokens(device_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_active ON device_push_tokens(is_active);

-- User links: cross-platform identity linking
CREATE TABLE IF NOT EXISTS user_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  external_platform TEXT NOT NULL,       -- 'hudhud' | 'mobile' | 'other'
  external_user_id TEXT NOT NULL,
  external_email TEXT,
  linked_via TEXT DEFAULT 'manual',      -- manual | auth | device_registration | redirect
  is_verified BOOLEAN DEFAULT false,
  linked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(local_user_id, external_platform)
);

CREATE INDEX IF NOT EXISTS idx_user_links_local ON user_links(local_user_id);
CREATE INDEX IF NOT EXISTS idx_user_links_external ON user_links(external_platform, external_user_id);

-- Enable RLS
ALTER TABLE device_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_links ENABLE ROW LEVEL SECURITY;

-- RLS: device tokens
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'device_push_tokens' AND policyname = 'Users view own device tokens') THEN
    CREATE POLICY "Users view own device tokens"
      ON device_push_tokens FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'device_push_tokens' AND policyname = 'Service role manages device tokens') THEN
    CREATE POLICY "Service role manages device tokens"
      ON device_push_tokens FOR INSERT
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'device_push_tokens' AND policyname = 'Users update own device tokens') THEN
    CREATE POLICY "Users update own device tokens"
      ON device_push_tokens FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- RLS: user links
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_links' AND policyname = 'Users view own links') THEN
    CREATE POLICY "Users view own links"
      ON user_links FOR SELECT
      USING (auth.uid() = local_user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_links' AND policyname = 'Users insert own links') THEN
    CREATE POLICY "Users insert own links"
      ON user_links FOR INSERT
      WITH CHECK (auth.uid() = local_user_id);
  END IF;
END $$;

-- Trigger: auto-update updated_at on device_push_tokens
DROP TRIGGER IF EXISTS update_device_tokens_updated_at ON device_push_tokens;
CREATE TRIGGER update_device_tokens_updated_at
  BEFORE UPDATE ON device_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_campaign_updated_at();
