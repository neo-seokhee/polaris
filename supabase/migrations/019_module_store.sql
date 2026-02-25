-- ============================================================
-- 019_module_store.sql
-- Module Store: Products, Bundles, User Purchases
-- ============================================================

-- ============================================================
-- 1. products (개별 판매 상품)
-- ============================================================
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('module', 'feature', 'addon')),
  name TEXT NOT NULL,
  description TEXT,
  price_krw INTEGER NOT NULL,
  icon_name TEXT,
  module_id TEXT,
  feature_key TEXT,
  feature_value JSONB DEFAULT 'true'::JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins have full access to products"
  ON products FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 시드 데이터
INSERT INTO products (id, type, name, description, price_krw, icon_name, module_id, feature_key, sort_order) VALUES
  ('module:settlement', 'module', '영상 발주 관리', '촬영·편집 발주를 체계적으로 관리하세요', 2900, 'Clapperboard', 'settlement', NULL, 0),
  ('module:budget', 'module', '자산 관리', '수입·지출을 한눈에 파악하세요', 2900, 'Wallet', 'budget', NULL, 1),
  ('module:habits', 'module', '마음 챙김', '매일의 습관을 꾸준히 기록하세요', 2900, 'Heart', 'habits', NULL, 2),
  ('feature:google_calendar_sync', 'feature', 'Google Calendar 연동', 'Google 캘린더와 양방향 동기화', 1900, 'Calendar', NULL, 'google_calendar_sync', 3),
  ('feature:compass_unlimited', 'feature', 'Compass AI 무제한', 'AI 코칭을 제한 없이 사용하세요', 3900, 'Sparkles', NULL, 'compass_daily_limit', 4);

-- compass_unlimited의 feature_value를 null로 설정 (무제한)
UPDATE products SET feature_value = 'null'::JSONB WHERE id = 'feature:compass_unlimited';

-- ============================================================
-- 2. bundles (패키지 상품)
-- ============================================================
CREATE TABLE bundles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_krw INTEGER NOT NULL,
  original_price_krw INTEGER,
  product_ids TEXT[] NOT NULL,
  icon_name TEXT,
  badge TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active bundles"
  ON bundles FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins have full access to bundles"
  ON bundles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

CREATE TRIGGER update_bundles_updated_at
  BEFORE UPDATE ON bundles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 시드 데이터
INSERT INTO bundles (id, name, description, price_krw, original_price_krw, product_ids, icon_name, badge, sort_order) VALUES
  ('all_modules', '전체 모듈 패키지', '모든 프리미엄 모듈을 한번에', 6900, 8700, ARRAY['module:settlement', 'module:budget', 'module:habits'], 'Package', '인기', 0);

-- ============================================================
-- 3. user_purchases (구매 기록)
-- ============================================================
CREATE TABLE user_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  product_id TEXT REFERENCES products(id),
  bundle_id TEXT REFERENCES bundles(id),
  price_paid INTEGER NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('admin', 'promo', 'revenuecat', 'stripe', 'iap')),
  provider_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'refunded', 'expired')),
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  memo TEXT,
  CONSTRAINT chk_product_or_bundle CHECK (
    (product_id IS NOT NULL AND bundle_id IS NULL) OR
    (product_id IS NULL AND bundle_id IS NOT NULL)
  )
);

CREATE INDEX idx_user_purchases_user_id ON user_purchases(user_id);
CREATE INDEX idx_user_purchases_user_active ON user_purchases(user_id, status)
  WHERE status = 'active';

ALTER TABLE user_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases"
  ON user_purchases FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins have full access to purchases"
  ON user_purchases FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- ============================================================
-- 4. get_user_entitlements() RPC 확장
--    구독 features + 개별 구매 + 번들 구매 + 오버라이드 병합
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_entitlements(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_plan_features JSONB := '{}'::JSONB;
  v_result JSONB;
  v_modules JSONB;
  v_override RECORD;
  v_purchase RECORD;
  v_product RECORD;
  v_bundle RECORD;
  v_product_id TEXT;
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

  v_result := v_plan_features;
  v_modules := COALESCE(v_result->'modules', '[]'::JSONB);

  -- 2. 활성 개별 구매 → 모듈이면 modules 배열에 추가, feature면 해당 key 오버라이드
  FOR v_purchase IN
    SELECT product_id, bundle_id
    FROM user_purchases
    WHERE user_id = p_user_id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > NOW())
  LOOP
    IF v_purchase.product_id IS NOT NULL THEN
      -- 개별 상품 구매
      SELECT * INTO v_product FROM products WHERE id = v_purchase.product_id;
      IF v_product.type = 'module' AND v_product.module_id IS NOT NULL THEN
        -- 모듈이면 modules 배열에 추가
        IF NOT v_modules ? v_product.module_id THEN
          v_modules := v_modules || to_jsonb(v_product.module_id);
        END IF;
      ELSIF v_product.feature_key IS NOT NULL THEN
        -- feature면 해당 key 값 오버라이드
        v_result := v_result || jsonb_build_object(v_product.feature_key, v_product.feature_value);
      END IF;
    ELSIF v_purchase.bundle_id IS NOT NULL THEN
      -- 번들 구매 → 포함된 모든 products 처리
      SELECT * INTO v_bundle FROM bundles WHERE id = v_purchase.bundle_id;
      IF v_bundle.product_ids IS NOT NULL THEN
        FOREACH v_product_id IN ARRAY v_bundle.product_ids
        LOOP
          SELECT * INTO v_product FROM products WHERE id = v_product_id;
          IF v_product IS NOT NULL THEN
            IF v_product.type = 'module' AND v_product.module_id IS NOT NULL THEN
              IF NOT v_modules ? v_product.module_id THEN
                v_modules := v_modules || to_jsonb(v_product.module_id);
              END IF;
            ELSIF v_product.feature_key IS NOT NULL THEN
              v_result := v_result || jsonb_build_object(v_product.feature_key, v_product.feature_value);
            END IF;
          END IF;
        END LOOP;
      END IF;
    END IF;
  END LOOP;

  -- modules 배열 업데이트
  v_result := v_result || jsonb_build_object('modules', v_modules);

  -- 3. 유효한 오버라이드 가져와서 병합 (최우선)
  FOR v_override IN
    SELECT feature_key, feature_value
    FROM user_entitlement_overrides
    WHERE user_id = p_user_id
      AND (expires_at IS NULL OR expires_at > NOW())
  LOOP
    v_result := v_result || jsonb_build_object(v_override.feature_key, v_override.feature_value);
  END LOOP;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
