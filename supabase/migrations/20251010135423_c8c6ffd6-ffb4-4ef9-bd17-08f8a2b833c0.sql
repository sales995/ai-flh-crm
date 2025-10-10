-- Fix RLS policies for activities table to allow viewing activity timeline

-- Allow users to view activities for leads they have access to
CREATE POLICY "Users can view activities for accessible leads"
ON public.activities
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'business_manager'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.leads
    WHERE leads.id = activities.lead_id
    AND (
      leads.assigned_to = auth.uid() OR
      leads.created_by = auth.uid()
    )
  )
);