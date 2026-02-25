-- ============================================================
-- 016_monetization.sql
-- Polaris Monetization: Plans, Subscriptions, Entitlements
-- ============================================================

-- 1. users 테이블에 role 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));

-- 기존 users RLS에 어드민 정책 추가
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ============================================================
-- 2. plans (요금제 정의)
-- ============================================================
CREATE TABLE plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_krw INTEGER NOT NULL DEFAULT 0,
  interval TEXT CHECK (interval IN ('month', 'year', 'lifetime', 'none')),
  features JSONB NOT NULL DEFAULT '{}'::JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- 일반 사용자: 활성 플랜만 조회
CREATE POLICY "Anyone can view active plans"
  ON plans FOR SELECT
  USING (is_active = true);

-- 어드민: 전체 CRUD
CREATE POLICY "Admins have full access to plans"
  ON plans FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- 시드 데이터
INSERT INTO plans (id, name, description, price_krw, interval, features, sort_order) VALUES
(
  'free',
  '무료',
  '기본 기능을 무료로 사용하세요',
  0,
  'none',
  '{
    "modules": ["todo", "goals", "memo", "schedule"],
    "compass_daily_limit": 5,
    "google_calendar_sync": false,
    "max_todos": 100,
    "max_memos": 50,
    "settlement_module": false
  }'::JSONB,
  0
),
(
  'pro_monthly',
  'Pro 월간',
  '모든 기능을 월간 구독으로',
  4900,
  'month',
  '{
    "modules": ["todo", "goals", "memo", "schedule", "settlement", "habits", "budget"],
    "compass_daily_limit": null,
    "google_calendar_sync": true,
    "max_todos": null,
    "max_memos": null,
    "settlement_module": true
  }'::JSONB,
  1
),
(
  'pro_yearly',
  'Pro 연간',
  '모든 기능을 연간 구독으로 (33% 할인)',
  39000,
  'year',
  '{
    "modules": ["todo", "goals", "memo", "schedule", "settlement", "habits", "budget"],
    "compass_daily_limit": null,
    "google_calendar_sync": true,
    "max_todos": null,
    "max_memos": null,
    "settlement_module": true
  }'::JSONB,
  2
);

-- ============================================================
-- 3. user_subscriptions (사용자별 구독)
-- ============================================================
CREATE TABLE user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  plan_id TEXT REFERENCES plans(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'expired')),
  provider TEXT CHECK (provider IN ('revenuecat', 'stripe', 'admin', 'promo')),
  provider_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_user_subscriptions_status ON user_subscriptions(status);
CREATE INDEX idx_user_subscriptions_user_active ON user_subscriptions(user_id, status)
  WHERE status IN ('active', 'trialing', 'past_due');

ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 일반 사용자: 자기 구독만 조회
CREATE POLICY "Users can view own subscriptions"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- 어드민: 전체 CRUD
CREATE POLICY "Admins have full access to subscriptions"
  ON user_subscriptions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ============================================================
-- 4. user_entitlement_overrides (개별 권한 오버라이드)
-- ============================================================
CREATE TABLE user_entitlement_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  feature_key TEXT NOT NULL,
  feature_value JSONB NOT NULL DEFAULT 'true'::JSONB,
  reason TEXT,
  granted_by UUID REFERENCES users(id),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, feature_key)
);

CREATE INDEX idx_entitlement_overrides_user_id ON user_entitlement_overrides(user_id);

ALTER TABLE user_entitlement_overrides ENABLE ROW LEVEL SECURITY;

-- 일반 사용자: 자기 오버라이드만 조회
CREATE POLICY "Users can view own overrides"
  ON user_entitlement_overrides FOR SELECT
  USING (auth.uid() = user_id);

-- 어드민: 전체 CRUD
CREATE POLICY "Admins have full access to overrides"
  ON user_entitlement_overrides FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ============================================================
-- 5. payment_events (결제 이벤트 로그)
-- ============================================================
CREATE TABLE payment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_event_id TEXT,
  amount INTEGER,
  currency TEXT DEFAULT 'KRW',
  payload JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_events_user_id ON payment_events(user_id);
CREATE INDEX idx_payment_events_created_at ON payment_events(created_at DESC);

ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- 어드민만 조회 가능
CREATE POLICY "Admins can view payment events"
  ON payment_events FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE POLICY "Admins can insert payment events"
  ON payment_events FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ============================================================
-- 6. compass_usage (AI 사용량 추적)
-- ============================================================
CREATE TABLE compass_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  used_at DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER NOT NULL DEFAULT 1,
  UNIQUE (user_id, used_at)
);

CREATE INDEX idx_compass_usage_user_date ON compass_usage(user_id, used_at);

ALTER TABLE compass_usage ENABLE ROW LEVEL SECURITY;

-- 일반 사용자: 자기 사용량 조회/삽입/업데이트
CREATE POLICY "Users can view own compass usage"
  ON compass_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own compass usage"
  ON compass_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own compass usage"
  ON compass_usage FOR UPDATE
  USING (auth.uid() = user_id);

-- 어드민: 조회
CREATE POLICY "Admins can view all compass usage"
  ON compass_usage FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ============================================================
-- 7. 서버 함수 & 트리거
-- ============================================================

-- updated_at 자동 갱신 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 신규 유저 자동 free 구독 생성 함수
CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, plan_id, status, provider)
  VALUES (NEW.id, 'free', 'active', 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_user_created_subscription
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user_subscription();

-- 사용자 권한 조회 함수 (플랜 features + 오버라이드 병합)
CREATE OR REPLACE FUNCTION get_user_entitlements(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_plan_features JSONB := '{}'::JSONB;
  v_overrides JSONB := '{}'::JSONB;
  v_result JSONB;
  v_override RECORD;
BEGIN
  -- 1. 활성 구독의 플랜 features 가져오기
  SELECT p.features INTO v_plan_features
  FROM user_subscriptions us
  JOIN plans p ON p.id = us.plan_id
  WHERE us.user_id = p_user_id
    AND us.status IN ('active', 'trialing')
  ORDER BY p.sort_order DESC
  LIMIT 1;

  -- 구독이 없으면 free 플랜 features
  IF v_plan_features IS NULL THEN
    SELECT features INTO v_plan_features
    FROM plans WHERE id = 'free';
  END IF;

  -- 2. 유효한 오버라이드 가져와서 병합
  FOR v_override IN
    SELECT feature_key, feature_value
    FROM user_entitlement_overrides
    WHERE user_id = p_user_id
      AND (expires_at IS NULL OR expires_at > NOW())
  LOOP
    v_overrides := v_overrides || jsonb_build_object(v_override.feature_key, v_override.feature_value);
  END LOOP;

  -- 3. 병합: 플랜 features + overrides (오버라이드가 우선)
  v_result := v_plan_features || v_overrides;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- 8. 기존 사용자 백필: 전원에 free 구독 생성
-- ============================================================
INSERT INTO user_subscriptions (user_id, plan_id, status, provider)
SELECT u.id, 'free', 'active', 'admin'
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_subscriptions us WHERE us.user_id = u.id
);
