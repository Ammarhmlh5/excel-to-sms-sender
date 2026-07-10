-- ============================================================
-- دالة ذرية للتحقق من معدل الإرسال وزيادة العداد
-- تحل مشكلة السباق (race condition) في send-sms
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_rate_limit_and_increment(
  p_user_id UUID,
  p_window_start TIMESTAMPTZ,
  p_message_count INT,
  p_max_hourly INT,
  p_max_daily INT
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_hourly_sent INT;
  v_daily_sent INT;
  v_day_start TIMESTAMPTZ;
BEGIN
  v_day_start := date_trunc('day', p_window_start);

  -- Lock all hourly buckets for today for this user (serializes concurrent requests)
  PERFORM 1 FROM rate_limits
  WHERE user_id = p_user_id AND window_start >= v_day_start
  FOR UPDATE;

  -- Calculate current daily total
  SELECT COALESCE(SUM(messages_sent), 0) INTO v_daily_sent
  FROM rate_limits
  WHERE user_id = p_user_id AND window_start >= v_day_start;

  IF v_daily_sent + p_message_count > p_max_daily THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'daily_limit');
  END IF;

  -- Check hourly limit BEFORE upsert (don't count rejected requests)
  SELECT COALESCE(messages_sent, 0) INTO v_hourly_sent
  FROM rate_limits
  WHERE user_id = p_user_id AND window_start = p_window_start;

  IF v_hourly_sent + p_message_count > p_max_hourly THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'hourly_limit');
  END IF;

  -- Only upsert AFTER both checks pass
  INSERT INTO rate_limits (user_id, window_start, messages_sent, requests_made)
  VALUES (p_user_id, p_window_start, p_message_count, 1)
  ON CONFLICT (user_id, window_start)
  DO UPDATE SET
    messages_sent = rate_limits.messages_sent + p_message_count,
    requests_made = rate_limits.requests_made + 1
  RETURNING messages_sent INTO v_hourly_sent;

  RETURN jsonb_build_object('allowed', true, 'hourly_sent', v_hourly_sent, 'daily_sent', v_daily_sent + p_message_count);
END;
$$;

GRANT ALL ON FUNCTION public.check_rate_limit_and_increment TO service_role;
