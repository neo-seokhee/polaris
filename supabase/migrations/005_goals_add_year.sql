-- goals 테이블에 year 필드 추가
ALTER TABLE goals ADD COLUMN IF NOT EXISTS year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM NOW());

-- type에서 'completed' 제거하고 'monthly'와 'percentage'만 사용
-- 기존 'completed' 타입은 'monthly'로 변환
UPDATE goals SET type = 'monthly' WHERE type = 'completed';

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_goals_year ON goals(year);
CREATE INDEX IF NOT EXISTS idx_goals_user_year ON goals(user_id, year);
