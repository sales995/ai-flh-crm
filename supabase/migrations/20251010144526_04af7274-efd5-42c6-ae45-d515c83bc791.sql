-- Create lead_type enum if not exists
DO $$ BEGIN
  CREATE TYPE public.lead_type AS ENUM ('fresh', 'duplicate');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add lead_type column to leads table if not exists
DO $$ BEGIN
  ALTER TABLE public.leads 
  ADD COLUMN lead_type public.lead_type DEFAULT 'fresh';
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;