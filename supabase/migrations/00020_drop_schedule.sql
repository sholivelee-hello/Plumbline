-- Remove schedule feature entirely (events, schedule_*, weekly_templates, time_unit).
-- Plumbline replaces in-app scheduling with external Google Calendar.

DROP TABLE IF EXISTS schedule_actuals CASCADE;
DROP TABLE IF EXISTS schedule_plans CASCADE;
DROP TABLE IF EXISTS schedule_presets CASCADE;
DROP TABLE IF EXISTS weekly_template_blocks CASCADE;
DROP TABLE IF EXISTS weekly_templates CASCADE;
DROP TABLE IF EXISTS events CASCADE;

DROP FUNCTION IF EXISTS increment_preset_usage(UUID);

ALTER TABLE user_settings DROP COLUMN IF EXISTS time_unit;
