-- synced_events 테이블을 Google Calendar용으로 수정
-- subscription_id (UUID)를 calendar_id (TEXT)로 변경

-- 기존 외래 키 제약 조건 제거 (있을 경우)
ALTER TABLE synced_events DROP CONSTRAINT IF EXISTS synced_events_subscription_id_fkey;

-- 기존 데이터 삭제 (타입 변경 전)
TRUNCATE TABLE synced_events;

-- subscription_id 컬럼을 calendar_id로 이름 변경하고 TEXT 타입으로 변경
ALTER TABLE synced_events DROP COLUMN IF EXISTS subscription_id;
ALTER TABLE synced_events ADD COLUMN calendar_id TEXT NOT NULL DEFAULT '';

-- user_id 컬럼 추가 (RLS용)
ALTER TABLE synced_events ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 기본값 제거
ALTER TABLE synced_events ALTER COLUMN calendar_id DROP DEFAULT;

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_synced_events_calendar_id ON synced_events(calendar_id);
CREATE INDEX IF NOT EXISTS idx_synced_events_user_id ON synced_events(user_id);

-- RLS 정책 업데이트
DROP POLICY IF EXISTS "Users can view own synced events" ON synced_events;
DROP POLICY IF EXISTS "Users can insert own synced events" ON synced_events;
DROP POLICY IF EXISTS "Users can update own synced events" ON synced_events;
DROP POLICY IF EXISTS "Users can delete own synced events" ON synced_events;

CREATE POLICY "Users can view own synced events"
    ON synced_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own synced events"
    ON synced_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own synced events"
    ON synced_events FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own synced events"
    ON synced_events FOR DELETE
    USING (auth.uid() = user_id);
