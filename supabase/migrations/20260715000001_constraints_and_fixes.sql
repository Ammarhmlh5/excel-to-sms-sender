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
