-- Fix RLS policies for leads table to allow proper access

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can create leads" ON public.leads;

-- Allow users to view leads they created, are assigned to, or if they're admin/business manager
CREATE POLICY "Users can view accessible leads"
ON public.leads
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'business_manager'::app_role) OR
  assigned_to = auth.uid() OR
  created_by = auth.uid()
);

-- Allow users to create leads
CREATE POLICY "Users can create leads"
ON public.leads
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Allow users to update leads they're assigned to or created, or if they're admin/business manager
CREATE POLICY "Users can update accessible leads"
ON public.leads
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'business_manager'::app_role) OR
  assigned_to = auth.uid() OR
  created_by = auth.uid()
);

-- Allow admins and business managers to delete leads
CREATE POLICY "Admins can delete leads"
ON public.leads
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'business_manager'::app_role)
);