-- P2-7: CHECK constraint on device_push_tokens.platform
ALTER TABLE device_push_tokens
ADD CONSTRAINT device_push_tokens_platform_check
CHECK (platform IN ('android', 'ios'));

-- P3-9: Max length on api_keys.api_key
ALTER TABLE api_keys
ADD CONSTRAINT api_keys_key_length
CHECK (length(api_key) > 0 AND length(api_key) <= 500);

-- P3-10: Max length on profiles.full_name
ALTER TABLE profiles
ADD CONSTRAINT profiles_full_name_length
CHECK (length(full_name) <= 500);

-- P2-6: Device limit trigger (prevents race condition on device registration)
CREATE OR REPLACE FUNCTION check_device_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM device_push_tokens WHERE user_id = NEW.user_id AND is_active = true) >= 10 THEN
    RAISE EXCEPTION 'تم تجاوز الحد الأقصى للأجهزة (10)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS check_device_limit_trigger ON device_push_tokens;
CREATE TRIGGER check_device_limit_trigger
  BEFORE INSERT ON device_push_tokens
  FOR EACH ROW EXECUTE FUNCTION check_device_limit();

-- P2-8: Auto-update campaign counts when message status changes
CREATE OR REPLACE FUNCTION update_campaign_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE campaigns SET
    sent_count = (SELECT COUNT(*) FROM campaign_messages WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id) AND status = 'sent'),
    failed_count = (SELECT COUNT(*) FROM campaign_messages WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id) AND status = 'failed')
  WHERE id = COALESCE(NEW.campaign_id, OLD.campaign_id);
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_campaign_counts_trigger ON campaign_messages;
CREATE TRIGGER update_campaign_counts_trigger
  AFTER UPDATE OF status ON campaign_messages
  FOR EACH ROW EXECUTE FUNCTION update_campaign_counts();
