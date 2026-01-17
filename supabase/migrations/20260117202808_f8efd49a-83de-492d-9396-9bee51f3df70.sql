-- Fix search_path for all functions
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    NEW.version = COALESCE(OLD.version, 0) + 1;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF NEW.email IS NOT NULL AND NEW.email != '' AND NOT public.validate_email(NEW.email) THEN
        RAISE EXCEPTION 'Invalid email format: %', NEW.email;
    END IF;
    
    IF NEW.phone IS NOT NULL AND NEW.phone != '' AND NOT public.validate_phone(NEW.phone) THEN
        RAISE EXCEPTION 'Invalid phone format: %', NEW.phone;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_deal_stage_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF NEW.stage IN ('closed_won', 'closed_lost') AND OLD.stage NOT IN ('closed_won', 'closed_lost') THEN
        NEW.actual_close_date = CURRENT_DATE;
    END IF;
    
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

CREATE OR REPLACE FUNCTION public.validate_email(email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_phone(phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
    IF phone IS NULL OR phone = '' THEN
        RETURN TRUE;
    END IF;
    RETURN phone ~* '^\+?[0-9\s\-\(\)]{7,20}$';
END;
$$;