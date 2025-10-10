-- Add buyer intent fields to lead_details table
ALTER TABLE public.lead_details
ADD COLUMN IF NOT EXISTS purchase_intent text,
ADD COLUMN IF NOT EXISTS buying_for text,
ADD COLUMN IF NOT EXISTS roi_months integer,
ADD COLUMN IF NOT EXISTS specify_buying_for text;

COMMENT ON COLUMN public.lead_details.purchase_intent IS 'Primary purchase objective: End-Use or Investment';
COMMENT ON COLUMN public.lead_details.buying_for IS 'Buying on behalf of: Self or Other';
COMMENT ON COLUMN public.lead_details.roi_months IS 'Expected ROI or holding period in months';
COMMENT ON COLUMN public.lead_details.specify_buying_for IS 'Specify for whom if buying for Other';