-- Add calling status enum
CREATE TYPE calling_status AS ENUM ('consulted', 'asked_for_reconnect', 'rnr_swo');

-- Update activities table to support call logging
ALTER TABLE activities 
ADD COLUMN IF NOT EXISTS calling_status calling_status,
ADD COLUMN IF NOT EXISTS call_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS call_time time,
ADD COLUMN IF NOT EXISTS next_followup_date date,
ADD COLUMN IF NOT EXISTS next_followup_time time;

-- Update leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS next_followup_time time;

-- Add highly_suitable flag to matchings
ALTER TABLE matchings
ADD COLUMN IF NOT EXISTS highly_suitable boolean DEFAULT false;

-- Create notifications table for alerts
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES profiles(id),
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications"
ON notifications FOR SELECT
USING (recipient_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create notifications"
ON notifications FOR INSERT
WITH CHECK (true);

-- Function to auto-increment attempt count and check for junk status
CREATE OR REPLACE FUNCTION increment_lead_attempts()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.activity_type = 'call' AND NEW.completed_at IS NOT NULL THEN
    UPDATE leads 
    SET 
      attempt_count = COALESCE(attempt_count, 0) + 1,
      last_attempt_at = NEW.completed_at,
      next_followup_date = NEW.next_followup_date,
      next_followup_time = NEW.next_followup_time
    WHERE id = NEW.lead_id;
    
    -- Check if attempts >= 3, move to junk
    UPDATE leads
    SET status = 'junk'::lead_status,
        junk_reason = '3 or more call attempts with no positive outcome'
    WHERE id = NEW.lead_id 
      AND attempt_count >= 3
      AND status != 'junk'::lead_status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_activity_call_logged
AFTER INSERT ON activities
FOR EACH ROW
EXECUTE FUNCTION increment_lead_attempts();

-- Clear existing project data and insert Koyambedu dataset
DELETE FROM matchings;
DELETE FROM projects;

-- Insert Koyambedu dummy data
INSERT INTO projects (
  name, 
  location, 
  price_min, 
  price_max, 
  project_type,
  tags,
  is_active,
  created_by,
  description,
  price
) VALUES
('Brigade Crescent', 'Koyambedu', 8500000, 9500000, 'apartment'::project_type, ARRAY['flat', 'investment', 'roi-4.5%'], true, (SELECT id FROM profiles LIMIT 1), 'Premium residential flats with excellent ROI potential', 9000000),
('Casagrand Zenith', 'Koyambedu', 7500000, 8800000, 'apartment'::project_type, ARRAY['flat', 'investment', 'roi-4.2%'], true, (SELECT id FROM profiles LIMIT 1), 'Modern apartments with good appreciation potential', 8150000),
('Radiance Icon', 'Koyambedu', 7000000, 8300000, 'apartment'::project_type, ARRAY['flat', 'investment', 'roi-4.3%'], true, (SELECT id FROM profiles LIMIT 1), 'Affordable luxury flats with solid returns', 7650000),
('Urbanrise Codename Gold', 'Koyambedu', 9200000, 10200000, 'apartment'::project_type, ARRAY['flat', 'premium', 'roi-4.6%'], true, (SELECT id FROM profiles LIMIT 1), 'High-end residential project with superior infrastructure', 9700000),
('TVS Green Enclave', 'Koyambedu', 8100000, 9100000, 'apartment'::project_type, ARRAY['flat', 'investment', 'roi-4.4%'], true, (SELECT id FROM profiles LIMIT 1), 'Eco-friendly apartments with great connectivity', 8600000);