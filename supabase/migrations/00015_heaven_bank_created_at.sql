-- heaven_bank: created_at 추가 (같은 날 입력 순서 정렬용)
ALTER TABLE heaven_bank ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
