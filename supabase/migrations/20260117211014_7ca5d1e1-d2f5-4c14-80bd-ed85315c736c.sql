-- Security hardening: tenant-scoped authorization + privacy controls

-- 1) Helper for manager checks (keeps roles in separate table)
CREATE OR REPLACE FUNCTION public.is_manager(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(p_user_id, 'manager');
$$;

-- 2) ACTIVITIES: tighten access to owner by default; allow admins/managers to read within tenant
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view activities in their tenant" ON public.activities;
DROP POLICY IF EXISTS "Users can update activities in their tenant" ON public.activities;
DROP POLICY IF EXISTS "Users can delete activities in their tenant" ON public.activities;
DROP POLICY IF EXISTS "Users can create activities in their tenant" ON public.activities;

CREATE POLICY "Users can view activities they are allowed to see"
ON public.activities
FOR SELECT
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    owner_id = auth.uid()
    OR public.is_admin(auth.uid())
    OR public.is_manager(auth.uid())
  )
);

CREATE POLICY "Users can create their own activities"
ON public.activities
FOR INSERT
WITH CHECK (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND owner_id = auth.uid()
);

CREATE POLICY "Users can update their own activities"
ON public.activities
FOR UPDATE
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    owner_id = auth.uid()
    OR public.is_admin(auth.uid())
  )
);

CREATE POLICY "Users can delete their own activities"
ON public.activities
FOR DELETE
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND (
    owner_id = auth.uid()
    OR public.is_admin(auth.uid())
  )
);

-- 3) RPCs: prevent cross-tenant probing (SECURITY DEFINER functions must validate caller)
CREATE OR REPLACE FUNCTION public.calculate_tenant_revenue(p_tenant_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_tenant_id <> public.get_user_tenant_id(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN (
    SELECT COALESCE(SUM(value), 0)
    FROM public.deals
    WHERE tenant_id = p_tenant_id
      AND stage = 'closed_won'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_deal_success_rate(p_tenant_id uuid)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_closed numeric;
  total_won numeric;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_tenant_id <> public.get_user_tenant_id(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE stage IN ('closed_won', 'closed_lost'))::numeric,
    COUNT(*) FILTER (WHERE stage = 'closed_won')::numeric
  INTO total_closed, total_won
  FROM public.deals
  WHERE tenant_id = p_tenant_id;

  IF total_closed = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND((total_won / total_closed) * 100, 2);
END;
$$;

-- 4) TENANTS: add explicit restrictive policies for write operations
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can update their tenant" ON public.tenants;
DROP POLICY IF EXISTS "No one can insert tenants" ON public.tenants;
DROP POLICY IF EXISTS "No one can delete tenants" ON public.tenants;

-- Users can already SELECT their tenant via existing policy.

CREATE POLICY "Admins can update their tenant"
ON public.tenants
FOR UPDATE
USING (
  tenant_id = public.get_user_tenant_id(auth.uid())
  AND public.is_admin(auth.uid())
);

CREATE POLICY "No direct tenant inserts"
ON public.tenants
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No direct tenant deletes"
ON public.tenants
FOR DELETE
USING (false);

-- 5) PROFILES: prevent tenant-wide email harvesting by denying broad SELECT
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.profiles;

CREATE POLICY "Users can view their own profile; admins can view all in tenant"
ON public.profiles
FOR SELECT
USING (
  (user_id = auth.uid())
  OR (
    tenant_id = public.get_user_tenant_id(auth.uid())
    AND public.is_admin(auth.uid())
  )
);

-- Create a safe view for non-sensitive team listings (no email)
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker=on)
AS
  SELECT id, user_id, tenant_id, full_name, avatar_url, created_at, updated_at
  FROM public.profiles;
