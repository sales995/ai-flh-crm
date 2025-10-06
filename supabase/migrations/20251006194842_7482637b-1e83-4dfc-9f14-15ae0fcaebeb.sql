-- Create builders table
CREATE TABLE public.builders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text CHECK (category IN ('residential', 'commercial', 'mixed')),
  cp_spoc_name text,
  contact_number text,
  location text,
  google_map_link text,
  latitude numeric,
  longitude numeric,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.builders ENABLE ROW LEVEL SECURITY;

-- RLS policies for builders
CREATE POLICY "Users can view all builders"
ON public.builders
FOR SELECT
USING (true);

CREATE POLICY "Managers and admins can create builders"
ON public.builders
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager')
);

CREATE POLICY "Managers and admins can update builders"
ON public.builders
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'manager')
);

CREATE POLICY "Admins can delete builders"
ON public.builders
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Add supply-side fields to projects table
ALTER TABLE public.projects
ADD COLUMN builder_id uuid REFERENCES public.builders(id),
ADD COLUMN total_land_area numeric,
ADD COLUMN total_units integer,
ADD COLUMN total_amenities integer,
ADD COLUMN construction_stage text CHECK (construction_stage IN ('planned', 'under_construction', 'ready')),
ADD COLUMN launch_date date,
ADD COLUMN rera_possession_date date,
ADD COLUMN builder_possession_date date,
ADD COLUMN brochure_link text,
ADD COLUMN detailed_pricing_link text,
ADD COLUMN price_per_sqft numeric,
ADD COLUMN plot_range text,
ADD COLUMN price_range text,
ADD COLUMN total_towers integer,
ADD COLUMN number_of_floors integer,
-- Inventory fields
ADD COLUMN inventory_1rk integer DEFAULT 0,
ADD COLUMN inventory_1bhk integer DEFAULT 0,
ADD COLUMN inventory_1_5bhk integer DEFAULT 0,
ADD COLUMN inventory_2bhk integer DEFAULT 0,
ADD COLUMN inventory_2bhk_1t integer DEFAULT 0,
ADD COLUMN inventory_2_5bhk integer DEFAULT 0,
ADD COLUMN inventory_3bhk integer DEFAULT 0,
ADD COLUMN inventory_3bhk_2t integer DEFAULT 0,
ADD COLUMN inventory_4bhk integer DEFAULT 0,
ADD COLUMN inventory_5bhk integer DEFAULT 0,
-- Starting prices by configuration
ADD COLUMN starting_price_1rk numeric,
ADD COLUMN starting_price_1bhk numeric,
ADD COLUMN starting_price_1_5bhk numeric,
ADD COLUMN starting_price_2bhk numeric,
ADD COLUMN starting_price_2_5bhk numeric,
ADD COLUMN starting_price_3bhk numeric,
ADD COLUMN starting_price_4bhk numeric,
ADD COLUMN starting_price_5bhk numeric,
-- Villa/Plot specific fields
ADD COLUMN villa_type text,
ADD COLUMN structure text,
ADD COLUMN starting_size_2bhk numeric,
ADD COLUMN starting_size_3bhk numeric,
ADD COLUMN starting_size_4bhk numeric,
ADD COLUMN starting_size_5bhk numeric;

-- Update timestamp trigger for builders
CREATE TRIGGER update_builders_updated_at
BEFORE UPDATE ON public.builders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Add index for builder lookups
CREATE INDEX idx_projects_builder_id ON public.projects(builder_id);

-- Enable realtime for builders
ALTER PUBLICATION supabase_realtime ADD TABLE public.builders;