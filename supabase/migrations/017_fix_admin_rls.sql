-- ============================================================
-- 017_fix_admin_rls.sql
-- Fix recursive RLS issue: admin check on users table
-- ============================================================

-- RLS를 우회하는 SECURITY DEFINER 함수로 admin 체크
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- 기존 재귀 문제가 있는 어드민 정책 삭제
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- is_admin() 함수를 사용하는 새 정책
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  USING (public.is_admin());

-- 다른 테이블의 어드민 정책도 같은 방식으로 수정
-- plans
DROP POLICY IF EXISTS "Admins have full access to plans" ON plans;
CREATE POLICY "Admins have full access to plans"
  ON plans FOR ALL
  USING (public.is_admin());

-- user_subscriptions
DROP POLICY IF EXISTS "Admins have full access to subscriptions" ON user_subscriptions;
CREATE POLICY "Admins have full access to subscriptions"
  ON user_subscriptions FOR ALL
  USING (public.is_admin());

-- user_entitlement_overrides
DROP POLICY IF EXISTS "Admins have full access to overrides" ON user_entitlement_overrides;
CREATE POLICY "Admins have full access to overrides"
  ON user_entitlement_overrides FOR ALL
  USING (public.is_admin());

-- payment_events
DROP POLICY IF EXISTS "Admins can view payment events" ON payment_events;
DROP POLICY IF EXISTS "Admins can insert payment events" ON payment_events;
CREATE POLICY "Admins can view payment events"
  ON payment_events FOR SELECT
  USING (public.is_admin());
CREATE POLICY "Admins can insert payment events"
  ON payment_events FOR INSERT
  WITH CHECK (public.is_admin());

-- compass_usage
DROP POLICY IF EXISTS "Admins can view all compass usage" ON compass_usage;
CREATE POLICY "Admins can view all compass usage"
  ON compass_usage FOR SELECT
  USING (public.is_admin());
