-- ============================================================
-- 021_fix_search_path.sql
-- Fix SECURITY DEFINER functions: add SET search_path = public
--
-- Root cause: SECURITY DEFINER functions without explicit search_path
-- inherit the CALLER's search_path. GoTrue (Supabase auth service)
-- runs with a session where 'public' is NOT in search_path,
-- causing all DML to public schema tables to fail silently.
-- This resulted in "Database error saving new user" on signup.
-- ============================================================

-- 1. handle_new_user (trigger: auth.users → public.users)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. handle_new_user_subscription (trigger: public.users → user_subscriptions)
CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, plan_id, status, provider)
  VALUES (NEW.id, 'free', 'active', 'admin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. is_admin (used in RLS policies)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 4. get_user_entitlements (RPC for user entitlement resolution)
ALTER FUNCTION public.get_user_entitlements(UUID) SET search_path = public;
