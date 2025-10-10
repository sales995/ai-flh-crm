-- Update lead_details table to support enhanced buyer intent and financial assessment
ALTER TABLE public.lead_details
ADD COLUMN IF NOT EXISTS primary_purchase_objective text,
ADD COLUMN IF NOT EXISTS occupation text,
ADD COLUMN IF NOT EXISTS property_type text,
ADD COLUMN IF NOT EXISTS size_sqft integer,
ADD COLUMN IF NOT EXISTS bhk text,
ADD COLUMN IF NOT EXISTS facing text,
ADD COLUMN IF NOT EXISTS floor_preference text,
ADD COLUMN IF NOT EXISTS food_preference text,
ADD COLUMN IF NOT EXISTS budget_min numeric,
ADD COLUMN IF NOT EXISTS budget_max numeric,
ADD COLUMN IF NOT EXISTS expected_rental_yield numeric,
ADD COLUMN IF NOT EXISTS expected_appreciation_percent numeric,
ADD COLUMN IF NOT EXISTS investment_horizon_months integer,
ADD COLUMN IF NOT EXISTS priority text,
ADD COLUMN IF NOT EXISTS minimum_requirement text,
ADD COLUMN IF NOT EXISTS additional_requirements text,
ADD COLUMN IF NOT EXISTS pressure_point text,
ADD COLUMN IF NOT EXISTS last_assessed_at timestamp with time zone;

-- Convert preferred_locations from text[] to jsonb with proper structure
-- First, create a temporary column
ALTER TABLE public.lead_details ADD COLUMN IF NOT EXISTS preferred_locations_new jsonb;

-- Convert existing data to new format
UPDATE public.lead_details
SET preferred_locations_new = (
  SELECT jsonb_agg(jsonb_build_object('location', loc, 'radius_km', 10))
  FROM unnest(preferred_locations) AS loc
)
WHERE preferred_locations IS NOT NULL AND array_length(preferred_locations, 1) > 0;

-- Drop old column and rename new one
ALTER TABLE public.lead_details DROP COLUMN IF EXISTS preferred_locations;
ALTER TABLE public.lead_details RENAME COLUMN preferred_locations_new TO preferred_locations;

-- Create external_actions table for tracking builder portal updates
CREATE TABLE IF NOT EXISTS public.external_actions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  builder_name text NOT NULL,
  project_name text NOT NULL,
  action_taken text NOT NULL,
  action_date timestamp with time zone NOT NULL DEFAULT now(),
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on external_actions
ALTER TABLE public.external_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for external_actions
CREATE POLICY "Users can view external actions for accessible leads"
ON public.external_actions
FOR SELECT
USING (
  has_role(auth.uid(), 'admin') OR
  has_role(auth.uid(), 'business_manager') OR
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = external_actions.lead_id
    AND (leads.assigned_to = auth.uid() OR leads.created_by = auth.uid())
  )
);

CREATE POLICY "Users can create external actions for assigned leads"
ON public.external_actions
FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = external_actions.lead_id
    AND (leads.assigned_to = auth.uid() OR leads.created_by = auth.uid())
  )
);

CREATE POLICY "Users can update own external actions"
ON public.external_actions
FOR UPDATE
USING (auth.uid() = created_by);

-- Add trigger for updated_at
CREATE TRIGGER update_external_actions_updated_at
BEFORE UPDATE ON public.external_actions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_external_actions_lead_id ON public.external_actions(lead_id);
CREATE INDEX IF NOT EXISTS idx_external_actions_action_date ON public.external_actions(action_date DESC);

-- Add indexes for lead search optimization
CREATE INDEX IF NOT EXISTS idx_leads_name ON public.leads(name);
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);