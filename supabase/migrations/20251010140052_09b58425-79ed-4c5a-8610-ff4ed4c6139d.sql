-- Add missing status column to leads table
ALTER TABLE public.leads 
ADD COLUMN status lead_status NOT NULL DEFAULT 'new';