-- 달성률 목표에 목표 지표/단위 및 월별 달성 지표 추가

-- 목표 수치 (예: 30)
ALTER TABLE goals ADD COLUMN IF NOT EXISTS target_value NUMERIC;

-- 목표 단위 (예: 권, km, 만원)
ALTER TABLE goals ADD COLUMN IF NOT EXISTS target_unit TEXT;

-- 월별 달성 수치 (12개월 배열)
ALTER TABLE goals ADD COLUMN IF NOT EXISTS monthly_progress NUMERIC[] DEFAULT ARRAY[0,0,0,0,0,0,0,0,0,0,0,0]::NUMERIC[];
