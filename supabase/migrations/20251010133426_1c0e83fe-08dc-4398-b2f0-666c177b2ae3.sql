-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Service role can manage roles" ON public.user_roles;

-- Drop and recreate enums with new values
DROP TYPE IF EXISTS app_role CASCADE;
CREATE TYPE app_role AS ENUM ('admin', 'business_manager', 'supply_manager', 'pre_sales_manager', 'sales_manager', 'agent', 'manager');

DROP TYPE IF EXISTS lead_status CASCADE;
CREATE TYPE lead_status AS ENUM (
  'new',
  'contacted', 
  'reached',
  'qualified',
  'interested',
  'site_visit_scheduled',
  'site_visit_rescheduled',
  'site_visit_completed',
  'not_interested',
  'converted',
  'lost',
  'junk'
);

-- Recreate user_roles table
DROP TABLE IF EXISTS public.user_roles CASCADE;
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role app_role NOT NULL DEFAULT 'agent'::app_role,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies for user_roles
CREATE POLICY "Users can view all roles" ON public.user_roles
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage roles" ON public.user_roles
  FOR ALL USING (true);

-- Recreate has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$;

-- Create sources table
CREATE TABLE IF NOT EXISTS public.sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  type TEXT CHECK (type IN ('organic', 'paid', 'referral', 'webhook', 'manual')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active sources" ON public.sources
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins and managers can manage sources" ON public.sources
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role) OR 
    has_role(auth.uid(), 'business_manager'::app_role)
  );

-- Create lead_details table
CREATE TABLE IF NOT EXISTS public.lead_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  budget_flexibility TEXT,
  timeline TEXT,
  family_size INTEGER,
  current_location TEXT,
  preferred_locations TEXT[],
  property_requirements JSONB,
  decision_maker TEXT,
  financing_status TEXT,
  additional_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lead_id)
);

ALTER TABLE public.lead_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view lead details for accessible leads" ON public.lead_details
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads 
      WHERE leads.id = lead_details.lead_id 
      AND (
        has_role(auth.uid(), 'admin'::app_role) OR
        has_role(auth.uid(), 'business_manager'::app_role) OR
        leads.assigned_to = auth.uid() OR
        leads.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage lead details for assigned leads" ON public.lead_details
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.leads 
      WHERE leads.id = lead_details.lead_id 
      AND (leads.assigned_to = auth.uid() OR leads.created_by = auth.uid())
    )
  );

-- Create assignments table
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.profiles(id),
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT
);

ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view assignment history" ON public.assignments
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'business_manager'::app_role) OR
    assigned_to = auth.uid() OR
    assigned_by = auth.uid()
  );

CREATE POLICY "Managers can create assignments" ON public.assignments
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'business_manager'::app_role)
  );

-- Create site_visits table
CREATE TABLE IF NOT EXISTS public.site_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id),
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('scheduled', 'rescheduled', 'completed', 'cancelled', 'no_show')) DEFAULT 'scheduled',
  sales_manager_id UUID REFERENCES public.profiles(id),
  pre_sales_id UUID REFERENCES public.profiles(id),
  outcome TEXT,
  feedback TEXT,
  next_steps TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relevant site visits" ON public.site_visits
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'business_manager'::app_role) OR
    has_role(auth.uid(), 'sales_manager'::app_role) OR
    sales_manager_id = auth.uid() OR
    pre_sales_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.leads 
      WHERE leads.id = site_visits.lead_id 
      AND leads.assigned_to = auth.uid()
    )
  );

CREATE POLICY "Sales and managers can manage site visits" ON public.site_visits
  FOR ALL USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'business_manager'::app_role) OR
    has_role(auth.uid(), 'sales_manager'::app_role) OR
    created_by = auth.uid()
  );

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, permission)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view role permissions" ON public.role_permissions
  FOR SELECT USING (true);

CREATE POLICY "Only admins can manage role permissions" ON public.role_permissions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Create follow_ups table
CREATE TABLE IF NOT EXISTS public.follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES public.profiles(id),
  notes TEXT,
  outcome TEXT,
  next_followup_at TIMESTAMPTZ,
  attempt_number INTEGER DEFAULT 1,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relevant follow-ups" ON public.follow_ups
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'business_manager'::app_role) OR
    assigned_to = auth.uid() OR
    created_by = auth.uid()
  );

CREATE POLICY "Users can manage their follow-ups" ON public.follow_ups
  FOR ALL USING (
    assigned_to = auth.uid() OR 
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'business_manager'::app_role)
  );

-- Add new columns to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES public.sources(id),
ADD COLUMN IF NOT EXISTS attempt_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS junk_reason TEXT;

-- Insert default sources
INSERT INTO public.sources (name, type) VALUES
  ('Website', 'organic'),
  ('Meta Ads', 'paid'),
  ('Google Ads', 'paid'),
  ('Referral', 'referral'),
  ('Walk-in', 'manual'),
  ('Webhook', 'webhook')
ON CONFLICT (name) DO NOTHING;

-- Insert default role permissions
INSERT INTO public.role_permissions (role, permission, enabled) VALUES
  ('admin', 'leads_view', true),
  ('admin', 'leads_create', true),
  ('admin', 'leads_update', true),
  ('admin', 'leads_delete', true),
  ('admin', 'leads_assign', true),
  ('admin', 'leads_export', true),
  ('admin', 'leads_import', true),
  ('admin', 'dashboards_view', true),
  ('admin', 'supply_manage', true),
  ('admin', 'audit_view', true),
  ('admin', 'site_visits_manage', true),
  ('admin', 'users_manage', true),
  ('business_manager', 'leads_view', true),
  ('business_manager', 'leads_create', true),
  ('business_manager', 'leads_update', true),
  ('business_manager', 'leads_assign', true),
  ('business_manager', 'leads_export', true),
  ('business_manager', 'leads_import', true),
  ('business_manager', 'dashboards_view', true),
  ('supply_manager', 'leads_view', true),
  ('supply_manager', 'supply_manage', true),
  ('pre_sales_manager', 'leads_view', true),
  ('pre_sales_manager', 'leads_update', true),
  ('pre_sales_manager', 'dashboards_view', true),
  ('sales_manager', 'leads_view', true),
  ('sales_manager', 'leads_update', true),
  ('sales_manager', 'site_visits_manage', true),
  ('sales_manager', 'dashboards_view', true)
ON CONFLICT (role, permission) DO NOTHING;

-- Triggers for updated_at
CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON public.sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_lead_details_updated_at BEFORE UPDATE ON public.lead_details
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_site_visits_updated_at BEFORE UPDATE ON public.site_visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_follow_ups_updated_at BEFORE UPDATE ON public.follow_ups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();