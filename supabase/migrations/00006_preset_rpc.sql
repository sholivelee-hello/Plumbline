CREATE OR REPLACE FUNCTION increment_preset_usage(p_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE schedule_presets
  SET usage_count = usage_count + 1, last_used_at = now()
  WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;
