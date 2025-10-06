-- Fix function search paths for security
CREATE OR REPLACE FUNCTION public.is_user_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.log_user_management()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    PERFORM log_audit('user_updated', 'profiles', NEW.id, jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM log_audit('user_created', 'profiles', NEW.id, to_jsonb(NEW));
  END IF;
  RETURN NEW;
END;
$$;