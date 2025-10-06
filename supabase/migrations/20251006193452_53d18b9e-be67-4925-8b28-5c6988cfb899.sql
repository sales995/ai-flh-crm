-- Add new columns to leads table
ALTER TABLE public.leads 
ADD COLUMN source text,
ADD COLUMN campaign text,
ADD COLUMN next_followup_date date,
ADD COLUMN tags text[],
ADD COLUMN consent boolean DEFAULT false;

-- Add new columns to projects table
ALTER TABLE public.projects 
ADD COLUMN price_min numeric,
ADD COLUMN price_max numeric,
ADD COLUMN availability_date date,
ADD COLUMN tags text[];

-- Add new columns to activities table
ALTER TABLE public.activities 
ADD COLUMN duration integer;

-- Add new columns to matchings table
ALTER TABLE public.matchings 
ADD COLUMN approved boolean DEFAULT false;

-- Create audit_logs table for security tracking
CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit_logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit(
  _action text,
  _table_name text,
  _record_id uuid,
  _details jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, table_name, record_id, details)
  VALUES (auth.uid(), _action, _table_name, _record_id, _details);
END;
$$;

-- Trigger function to auto-generate matchings on new lead
CREATE OR REPLACE FUNCTION public.trigger_generate_matchings()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the new lead creation
  PERFORM log_audit('lead_created', 'leads', NEW.id, to_jsonb(NEW));
  
  -- Note: The actual matching generation will be handled by the edge function
  -- This trigger just logs the event
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_lead_created
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_generate_matchings();

-- Trigger function to log activity changes
CREATE OR REPLACE FUNCTION public.log_activity_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM log_audit('activity_logged', 'activities', NEW.id, to_jsonb(NEW));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_activity_created
  AFTER INSERT ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.log_activity_change();

-- Update RLS policies for stricter agent access
DROP POLICY IF EXISTS "Users can view all leads" ON public.leads;

CREATE POLICY "Agents can view assigned leads"
ON public.leads
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  (auth.uid() = created_by) OR 
  (auth.uid() = assigned_to)
);

CREATE POLICY "Managers can view all leads"
ON public.leads
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager')
);

-- Agents can only update leads assigned to them
DROP POLICY IF EXISTS "Users can update own leads" ON public.leads;

CREATE POLICY "Agents can update assigned leads"
ON public.leads
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager') OR 
  (auth.uid() = assigned_to)
);

-- Only managers and admins can delete leads
CREATE POLICY "Only managers can delete leads"
ON public.leads
FOR DELETE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager')
);

-- Update activities RLS
DROP POLICY IF EXISTS "Users can view activities for their leads" ON public.activities;

CREATE POLICY "Agents can view activities for assigned leads"
ON public.activities
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'manager') OR
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = activities.lead_id 
    AND (leads.assigned_to = auth.uid() OR leads.created_by = auth.uid())
  )
);

-- Enable realtime for matchings table
ALTER PUBLICATION supabase_realtime ADD TABLE public.matchings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;