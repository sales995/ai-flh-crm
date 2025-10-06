-- Fix remaining functions without search_path
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_lead_last_contacted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL THEN
    UPDATE public.leads
    SET last_contacted_at = NEW.completed_at
    WHERE id = NEW.lead_id;
  END IF;
  RETURN NEW;
END;
$$;