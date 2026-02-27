-- 022: free 플랜에서 Google Calendar 연동 허용
-- 정액형 요금제 제거 후, 모든 사용자에게 Google Calendar 연동을 무료로 제공

UPDATE plans
SET features = jsonb_set(features, '{google_calendar_sync}', 'true'::jsonb)
WHERE id = 'free';
