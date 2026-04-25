-- 베이직 템플릿의 +/- 증감 단위를 저장.
-- NULL이면 앱이 기본값(1)을 사용한다.
ALTER TABLE basics_templates ADD COLUMN IF NOT EXISTS step_value NUMERIC;
