-- Add 'recheck_required' status to lead_status enum
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'recheck_required';