-- ============================================================
-- CS-318 MULTI-TENANT CRM DATABASE SCHEMA
-- Advanced Database Management Systems Project
-- ============================================================

-- 1. Create custom types/enums
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'sales_agent');
CREATE TYPE public.deal_stage AS ENUM ('lead', 'qualified', 'proposal', 'closed_won', 'closed_lost');
CREATE TYPE public.activity_type AS ENUM ('task', 'call', 'meeting', 'email', 'note');
CREATE TYPE public.audit_action AS ENUM ('INSERT', 'UPDATE', 'DELETE');

-- ============================================================
-- 2. TENANTS TABLE - Organizations using the CRM
-- ============================================================
CREATE TABLE public.tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    subdomain TEXT UNIQUE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast tenant lookup
CREATE INDEX idx_tenants_subdomain ON public.tenants(subdomain);

-- ============================================================
-- 3. PROFILES TABLE - Users linked to auth.users
-- ============================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    tenant_id UUID REFERENCES public.tenants(tenant_id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for profiles
CREATE INDEX idx_profiles_tenant ON public.profiles(tenant_id);
CREATE INDEX idx_profiles_user ON public.profiles(user_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- ============================================================
-- 4. USER_ROLES TABLE - Role-based access control
-- ============================================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.tenants(tenant_id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'sales_agent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, tenant_id)
);

-- Indexes for user roles
CREATE INDEX idx_user_roles_tenant ON public.user_roles(tenant_id);
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);

-- ============================================================
-- 5. CONTACTS TABLE - CRM Contacts
-- ============================================================
CREATE TABLE public.contacts (
    contact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(tenant_id) ON DELETE CASCADE NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    job_title TEXT,
    notes TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    -- Prevent duplicate emails within same tenant
    UNIQUE(tenant_id, email)
);

-- Indexes for contacts
CREATE INDEX idx_contacts_tenant ON public.contacts(tenant_id);
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contacts_owner ON public.contacts(owner_id);
CREATE INDEX idx_contacts_search ON public.contacts USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || COALESCE(company, '')));

-- ============================================================
-- 6. DEALS TABLE - Sales Pipeline
-- ============================================================
CREATE TABLE public.deals (
    deal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(tenant_id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES public.contacts(contact_id) ON DELETE SET NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    stage deal_stage NOT NULL DEFAULT 'lead',
    value DECIMAL(15, 2) DEFAULT 0,
    currency TEXT DEFAULT 'USD',
    probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    expected_close_date DATE,
    actual_close_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1
);

-- Indexes for deals
CREATE INDEX idx_deals_tenant ON public.deals(tenant_id);
CREATE INDEX idx_deals_stage ON public.deals(stage);
CREATE INDEX idx_deals_owner ON public.deals(owner_id);
CREATE INDEX idx_deals_contact ON public.deals(contact_id);
CREATE INDEX idx_deals_close_date ON public.deals(expected_close_date);

-- ============================================================
-- 7. ACTIVITIES TABLE - Tasks, Calls, Meetings
-- ============================================================
CREATE TABLE public.activities (
    activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(tenant_id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES public.contacts(contact_id) ON DELETE CASCADE,
    deal_id UUID REFERENCES public.deals(deal_id) ON DELETE CASCADE,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    activity_type activity_type NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    is_completed BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for activities
CREATE INDEX idx_activities_tenant ON public.activities(tenant_id);
CREATE INDEX idx_activities_contact ON public.activities(contact_id);
CREATE INDEX idx_activities_deal ON public.activities(deal_id);
CREATE INDEX idx_activities_owner ON public.activities(owner_id);
CREATE INDEX idx_activities_due_date ON public.activities(due_date);
CREATE INDEX idx_activities_type ON public.activities(activity_type);

-- ============================================================
-- 8. AUDIT_LOGS TABLE - Track all changes
-- ============================================================
CREATE TABLE public.audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(tenant_id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action audit_action NOT NULL,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX idx_audit_tenant ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_table ON public.audit_logs(table_name);
CREATE INDEX idx_audit_record ON public.audit_logs(record_id);
CREATE INDEX idx_audit_created ON public.audit_logs(created_at DESC);

-- ============================================================
-- SECURITY DEFINER FUNCTIONS (Prevent RLS recursion)
-- ============================================================

-- Function to get user's tenant_id safely
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT tenant_id FROM public.profiles WHERE user_id = p_user_id LIMIT 1;
$$;

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(p_user_id UUID, p_role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = p_user_id AND role = p_role
    );
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = p_user_id AND role = 'admin'
    );
$$;

-- ============================================================
-- EMAIL VALIDATION FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_email(email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;

-- ============================================================
-- PHONE VALIDATION FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_phone(phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF phone IS NULL OR phone = '' THEN
        RETURN TRUE;
    END IF;
    RETURN phone ~* '^\+?[0-9\s\-\(\)]{7,20}$';
END;
$$;

-- ============================================================
-- REVENUE CALCULATION FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_tenant_revenue(p_tenant_id UUID)
RETURNS DECIMAL
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(SUM(value), 0)
    FROM public.deals
    WHERE tenant_id = p_tenant_id AND stage = 'closed_won';
$$;

-- ============================================================
-- DEAL SUCCESS RATE FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_deal_success_rate(p_tenant_id UUID)
RETURNS DECIMAL
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT CASE 
        WHEN COUNT(*) FILTER (WHERE stage IN ('closed_won', 'closed_lost')) = 0 THEN 0
        ELSE ROUND(
            (COUNT(*) FILTER (WHERE stage = 'closed_won')::DECIMAL / 
             COUNT(*) FILTER (WHERE stage IN ('closed_won', 'closed_lost'))::DECIMAL) * 100, 2
        )
    END
    FROM public.deals
    WHERE tenant_id = p_tenant_id;
$$;

-- ============================================================
-- TIMESTAMP UPDATE TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================================
-- VERSION INCREMENT TRIGGER FUNCTION (Optimistic Locking)
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.version = COALESCE(OLD.version, 0) + 1;
    RETURN NEW;
END;
$$;

-- ============================================================
-- CONTACT VALIDATION TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validate email format
    IF NEW.email IS NOT NULL AND NEW.email != '' AND NOT public.validate_email(NEW.email) THEN
        RAISE EXCEPTION 'Invalid email format: %', NEW.email;
    END IF;
    
    -- Validate phone format
    IF NEW.phone IS NOT NULL AND NEW.phone != '' AND NOT public.validate_phone(NEW.phone) THEN
        RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================================
-- DEAL STAGE TRANSITION VALIDATION
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_deal_stage_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Set actual close date when deal is closed
    IF NEW.stage IN ('closed_won', 'closed_lost') AND OLD.stage NOT IN ('closed_won', 'closed_lost') THEN
        NEW.actual_close_date = CURRENT_DATE;
    END IF;
    
    -- Update probability based on stage
    IF NEW.stage = 'lead' THEN
        NEW.probability = 10;
    ELSIF NEW.stage = 'qualified' THEN
        NEW.probability = 30;
    ELSIF NEW.stage = 'proposal' THEN
        NEW.probability = 60;
    ELSIF NEW.stage = 'closed_won' THEN
        NEW.probability = 100;
    ELSIF NEW.stage = 'closed_lost' THEN
        NEW.probability = 0;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ============================================================
-- AUDIT LOG TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
    v_record_id UUID;
    v_action audit_action;
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        v_action := 'INSERT';
        v_record_id := NEW.contact_id;
        v_tenant_id := NEW.tenant_id;
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'UPDATE';
        v_record_id := NEW.contact_id;
        v_tenant_id := NEW.tenant_id;
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
        v_record_id := OLD.contact_id;
        v_tenant_id := OLD.tenant_id;
    END IF;

    -- Handle different primary key column names
    IF TG_TABLE_NAME = 'deals' THEN
        v_record_id := COALESCE(NEW.deal_id, OLD.deal_id);
    ELSIF TG_TABLE_NAME = 'activities' THEN
        v_record_id := COALESCE(NEW.activity_id, OLD.activity_id);
    ELSIF TG_TABLE_NAME = 'contacts' THEN
        v_record_id := COALESCE(NEW.contact_id, OLD.contact_id);
    END IF;

    INSERT INTO public.audit_logs (
        tenant_id,
        user_id,
        table_name,
        record_id,
        action,
        old_data,
        new_data
    ) VALUES (
        v_tenant_id,
        auth.uid(),
        TG_TABLE_NAME,
        v_record_id,
        v_action,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

-- ============================================================
-- TENANT ONBOARDING STORED PROCEDURE
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_tenant_with_admin(
    p_tenant_name TEXT,
    p_user_id UUID,
    p_user_email TEXT,
    p_user_name TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Create tenant
    INSERT INTO public.tenants (name)
    VALUES (p_tenant_name)
    RETURNING tenant_id INTO v_tenant_id;
    
    -- Create user profile
    INSERT INTO public.profiles (user_id, tenant_id, email, full_name)
    VALUES (p_user_id, v_tenant_id, p_user_email, COALESCE(p_user_name, p_user_email));
    
    -- Assign admin role
    INSERT INTO public.user_roles (user_id, tenant_id, role)
    VALUES (p_user_id, v_tenant_id, 'admin');
    
    RETURN v_tenant_id;
END;
$$;

-- ============================================================
-- ADD USER TO TENANT PROCEDURE
-- ============================================================
CREATE OR REPLACE FUNCTION public.add_user_to_tenant(
    p_tenant_id UUID,
    p_user_id UUID,
    p_user_email TEXT,
    p_user_name TEXT DEFAULT NULL,
    p_role app_role DEFAULT 'sales_agent'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create user profile
    INSERT INTO public.profiles (user_id, tenant_id, email, full_name)
    VALUES (p_user_id, p_tenant_id, p_user_email, COALESCE(p_user_name, p_user_email))
    ON CONFLICT (user_id) DO UPDATE SET
        tenant_id = p_tenant_id,
        email = p_user_email,
        full_name = COALESCE(p_user_name, p_user_email);
    
    -- Assign role
    INSERT INTO public.user_roles (user_id, tenant_id, role)
    VALUES (p_user_id, p_tenant_id, p_role)
    ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = p_role;
    
    RETURN TRUE;
END;
$$;

-- ============================================================
-- CREATE TRIGGERS
-- ============================================================

-- Timestamp triggers
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_deals_updated_at BEFORE UPDATE ON public.deals
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Version increment triggers (optimistic locking)
CREATE TRIGGER increment_contacts_version BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION public.increment_version();

CREATE TRIGGER increment_deals_version BEFORE UPDATE ON public.deals
    FOR EACH ROW EXECUTE FUNCTION public.increment_version();

-- Validation triggers
CREATE TRIGGER validate_contact_before_insert BEFORE INSERT ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION public.validate_contact();

CREATE TRIGGER validate_contact_before_update BEFORE UPDATE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION public.validate_contact();

CREATE TRIGGER validate_deal_stage BEFORE UPDATE ON public.deals
    FOR EACH ROW EXECUTE FUNCTION public.validate_deal_stage_transition();

-- Audit triggers
CREATE TRIGGER audit_contacts AFTER INSERT OR UPDATE OR DELETE ON public.contacts
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_deals AFTER INSERT OR UPDATE OR DELETE ON public.deals
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

CREATE TRIGGER audit_activities AFTER INSERT OR UPDATE OR DELETE ON public.activities
    FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES - Multi-tenant data isolation
-- ============================================================

-- Tenants: Users can only see their own tenant
CREATE POLICY "Users can view their own tenant"
    ON public.tenants FOR SELECT
    USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Profiles: Users can see profiles in their tenant
CREATE POLICY "Users can view profiles in their tenant"
    ON public.profiles FOR SELECT
    USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Allow insert during signup"
    ON public.profiles FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- User Roles: Users can see roles in their tenant
CREATE POLICY "Users can view roles in their tenant"
    ON public.user_roles FOR SELECT
    USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Admins can manage roles in their tenant"
    ON public.user_roles FOR ALL
    USING (
        tenant_id = public.get_user_tenant_id(auth.uid()) 
        AND public.is_admin(auth.uid())
    );

-- Contacts: Full multi-tenant isolation
CREATE POLICY "Users can view contacts in their tenant"
    ON public.contacts FOR SELECT
    USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can create contacts in their tenant"
    ON public.contacts FOR INSERT
    WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update contacts in their tenant"
    ON public.contacts FOR UPDATE
    USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete contacts in their tenant"
    ON public.contacts FOR DELETE
    USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Deals: Full multi-tenant isolation
CREATE POLICY "Users can view deals in their tenant"
    ON public.deals FOR SELECT
    USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can create deals in their tenant"
    ON public.deals FOR INSERT
    WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update deals in their tenant"
    ON public.deals FOR UPDATE
    USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete deals in their tenant"
    ON public.deals FOR DELETE
    USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Activities: Full multi-tenant isolation
CREATE POLICY "Users can view activities in their tenant"
    ON public.activities FOR SELECT
    USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can create activities in their tenant"
    ON public.activities FOR INSERT
    WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can update activities in their tenant"
    ON public.activities FOR UPDATE
    USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Users can delete activities in their tenant"
    ON public.activities FOR DELETE
    USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Audit Logs: Admins can view audit logs
CREATE POLICY "Admins can view audit logs in their tenant"
    ON public.audit_logs FOR SELECT
    USING (
        tenant_id = public.get_user_tenant_id(auth.uid())
        AND public.is_admin(auth.uid())
    );