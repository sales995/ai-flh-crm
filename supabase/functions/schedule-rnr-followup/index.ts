import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation helper
const validateLeadId = (leadId: unknown): string => {
  if (typeof leadId !== 'string') {
    throw new Error('lead_id must be a string');
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(leadId)) {
    throw new Error('Invalid lead_id format. Must be a valid UUID');
  }
  
  return leadId;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const lead_id = validateLeadId(body.lead_id);

    if (!lead_id) {
      throw new Error('lead_id is required');
    }

    console.log(`Processing RNR/SWO follow-up scheduling for lead: ${lead_id}`);

    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('created_at, status, last_contacted_at')
      .eq('id', lead_id)
      .single();

    if (leadError) throw leadError;

    // Calculate days since last contact (or creation if never contacted)
    const lastContactDate = lead.last_contacted_at 
      ? new Date(lead.last_contacted_at)
      : new Date(lead.created_at);
    
    const now = new Date();
    const daysSinceLastContact = Math.floor((now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24));

    console.log(`Days since last contact: ${daysSinceLastContact}`);

    // Determine next follow-up interval based on days
    let followUpDays: number;
    let shouldMoveToLost = false;

    if (daysSinceLastContact >= 45) {
      // Move to Lost after 45 days
      shouldMoveToLost = true;
      followUpDays = 0;
    } else if (daysSinceLastContact >= 31) {
      // Days 31-45: Every 7 days
      followUpDays = 7;
    } else if (daysSinceLastContact >= 15) {
      // Days 15-30: Every 5 days
      followUpDays = 5;
    } else {
      // Days 0-14: Every 3 days
      followUpDays = 3;
    }

    if (shouldMoveToLost) {
      // Move lead to Lost status
      const { error: updateError } = await supabase
        .from('leads')
        .update({ 
          status: 'lost',
          junk_reason: 'Automatically moved to Lost after 45+ days in RNR/SWO without response'
        })
        .eq('id', lead_id);

      if (updateError) throw updateError;

      // Log the automated action
      const { error: activityError } = await supabase
        .from('activities')
        .insert({
          lead_id: lead_id,
          activity_type: 'note',
          notes: 'System auto-moved lead to Lost status after 45+ days in RNR/SWO without engagement',
          completed_at: now.toISOString(),
          created_by: lead_id // Using lead_id as system action
        });

      if (activityError) console.error('Error logging activity:', activityError);

      console.log(`Lead ${lead_id} moved to Lost status`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          action: 'moved_to_lost',
          message: 'Lead moved to Lost after 45+ days'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate next follow-up date
    const nextFollowUpDate = new Date(now);
    nextFollowUpDate.setDate(nextFollowUpDate.getDate() + followUpDays);

    // Format as dd/mm/yyyy
    const day = String(nextFollowUpDate.getDate()).padStart(2, '0');
    const month = String(nextFollowUpDate.getMonth() + 1).padStart(2, '0');
    const year = nextFollowUpDate.getFullYear();
    const formattedDate = `${year}-${month}-${day}`; // ISO format for database

    // Default follow-up time: 10:00:00
    const followUpTime = '10:00:00';

    // Update lead with next follow-up date
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        next_followup_date: formattedDate,
        next_followup_time: followUpTime
      })
      .eq('id', lead_id);

    if (updateError) throw updateError;

    // Log the automated scheduling to activities
    const { error: activityError } = await supabase
      .from('activities')
      .insert({
        lead_id: lead_id,
        activity_type: 'note',
        notes: `System auto-scheduled follow-up for ${day}/${month}/${year} at ${followUpTime} (RNR/SWO - Day ${daysSinceLastContact}, Interval: ${followUpDays} days)`,
        completed_at: now.toISOString(),
        created_by: lead_id // Using lead_id as system action indicator
      });

    if (activityError) {
      console.error('Error logging activity:', activityError);
    }

    console.log(`Follow-up scheduled for ${day}/${month}/${year} at ${followUpTime}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        next_followup_date: `${day}/${month}/${year}`,
        next_followup_time: followUpTime,
        days_since_contact: daysSinceLastContact,
        interval_days: followUpDays
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in schedule-rnr-followup:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const statusCode = errorMessage.includes('Invalid') || errorMessage.includes('must be') ? 400 : 500;
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
