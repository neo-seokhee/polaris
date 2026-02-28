-- ============================================================
-- 024_remove_plan_system.sql
-- 플랜 기반 → 모듈 단위 판매 전환
--
-- 핵심: module_config.access_type이 접근 권한의 source of truth
-- - 기본 모듈(todo, goals, memo, schedule) = 무료
-- - 프리미엄 모듈(settlement, budget, habits 등) = 개별 구매
-- - 기능 제한(compass 일일 5회, 할일 100개, 메모 50개) = 전부 제거
-- ============================================================

-- ============================================================
-- 1. get_user_entitlements() RPC 전면 재작성
--    기존: plans.features → 구매 병합 → is_visible → overrides
--    변경: module_config.access_type → 구매 병합 → is_visible → overrides
-- ============================================================
CREATE OR REPLACE FUNCTION get_user_entitlements(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_modules JSONB := '[]'::JSONB;
  v_default_vis JSONB := '{}'::JSONB;
  v_override RECORD;
  v_purchase RECORD;
  v_product RECORD;
  v_bundle RECORD;
  v_product_id TEXT;
  v_mod RECORD;
BEGIN
  -- 1. Base: 모든 제한 해제
  v_result := jsonb_build_object(
    'compass_daily_limit', NULL,
    'google_calendar_sync', true,
    'max_todos', NULL,
    'max_memos', NULL,
    'default_visibility', '{}'::JSONB
  );

  -- 2. modules 배열: module_config에서 access_type='free' AND status='available'인 모듈
  FOR v_mod IN
    SELECT module_id FROM module_config
    WHERE access_type = 'free' AND status = 'available'
  LOOP
    IF NOT v_modules ? v_mod.module_id THEN
      v_modules := v_modules || to_jsonb(v_mod.module_id);
    END IF;
  END LOOP;

  -- 3. 구매 병합: user_purchases(개별+번들) → modules 배열에 추가 / feature 오버라이드
  FOR v_purchase IN
    SELECT product_id, bundle_id
    FROM user_purchases
    WHERE user_id = p_user_id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at > NOW())
  LOOP
    IF v_purchase.product_id IS NOT NULL THEN
      SELECT * INTO v_product FROM products WHERE id = v_purchase.product_id;
      IF v_product.type = 'module' AND v_product.module_id IS NOT NULL THEN
        IF NOT v_modules ? v_product.module_id THEN
          v_modules := v_modules || to_jsonb(v_product.module_id);
        END IF;
      ELSIF v_product.feature_key IS NOT NULL THEN
        v_result := v_result || jsonb_build_object(v_product.feature_key, v_product.feature_value);
      END IF;
    ELSIF v_purchase.bundle_id IS NOT NULL THEN
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

  -- 4. is_visible 처리: is_visible=false이고 접근 권한 없는 모듈 → default_visibility에 false
  v_default_vis := COALESCE(v_result->'default_visibility', '{}'::JSONB);
  FOR v_mod IN
    SELECT module_id FROM module_config WHERE is_visible = false
  LOOP
    IF NOT (v_modules ? v_mod.module_id) THEN
      v_default_vis := v_default_vis || jsonb_build_object(v_mod.module_id, false);
    END IF;
  END LOOP;
  v_result := jsonb_set(v_result, '{default_visibility}', v_default_vis);

  -- 5. user_entitlement_overrides 병합 (최우선)
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

-- ============================================================
-- 2. 데이터 마이그레이션
-- ============================================================

-- 2-1. module_config: settlement을 paid로 변경 (현재 잘못 'free'로 설정됨)
UPDATE module_config SET access_type = 'paid' WHERE module_id = 'settlement';

-- 2-2. 기존 Pro 구독자 → user_purchases로 전환 (module 상품)
INSERT INTO user_purchases (user_id, product_id, price_paid, provider, status, memo)
SELECT us.user_id, p.id, 0, 'admin', 'active', 'Pro 구독 전환'
FROM user_subscriptions us
CROSS JOIN products p
WHERE us.status IN ('active', 'trialing')
  AND us.plan_id IN ('pro_monthly', 'pro_yearly')
  AND p.type = 'module' AND p.module_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM user_purchases up
    WHERE up.user_id = us.user_id AND up.product_id = p.id AND up.status = 'active'
  );

-- 2-3. 기존 Pro 구독자 → user_purchases로 전환 (feature 상품)
INSERT INTO user_purchases (user_id, product_id, price_paid, provider, status, memo)
SELECT us.user_id, p.id, 0, 'admin', 'active', 'Pro 구독 전환'
FROM user_subscriptions us
CROSS JOIN products p
WHERE us.status IN ('active', 'trialing')
  AND us.plan_id IN ('pro_monthly', 'pro_yearly')
  AND p.type = 'feature'
  AND NOT EXISTS (
    SELECT 1 FROM user_purchases up
    WHERE up.user_id = us.user_id AND up.product_id = p.id AND up.status = 'active'
  );

-- 2-4. Pro 구독 취소
UPDATE user_subscriptions
SET status = 'canceled', canceled_at = NOW(),
    memo = COALESCE(memo, '') || ' [모듈 단위 판매 전환]'
WHERE status IN ('active', 'trialing')
  AND plan_id IN ('pro_monthly', 'pro_yearly');

-- 2-5. Pro 플랜 비활성화
UPDATE plans SET is_active = false WHERE id IN ('pro_monthly', 'pro_yearly');
