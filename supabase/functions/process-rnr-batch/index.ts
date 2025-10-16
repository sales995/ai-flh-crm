import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('Starting RNR/SWO batch processing...');

    // Get all leads with RNR/SWO status
    const { data: leads, error: leadsError } = await supabase
      .from('leads')
      .select('id, created_at, last_contacted_at, next_followup_date')
      .eq('status', 'rnr_swo');

    if (leadsError) throw leadsError;

    console.log(`Found ${leads?.length || 0} RNR/SWO leads to process`);

    let processed = 0;
    let movedToLost = 0;
    let scheduled = 0;

    for (const lead of leads || []) {
      try {
        const lastContactDate = lead.last_contacted_at 
          ? new Date(lead.last_contacted_at)
          : new Date(lead.created_at);
        
        const now = new Date();
        const daysSinceLastContact = Math.floor((now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24));

        // Check if follow-up is due today
        const today = now.toISOString().split('T')[0];
        const nextFollowUp = lead.next_followup_date;

        if (nextFollowUp === today) {
          // Follow-up is due - call the scheduling function
          const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/schedule-rnr-followup`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
            },
            body: JSON.stringify({ lead_id: lead.id })
          });

          const result = await response.json();
          
          if (result.action === 'moved_to_lost') {
            movedToLost++;
          } else {
            scheduled++;
          }
          
          processed++;
        }
      } catch (error) {
        console.error(`Error processing lead ${lead.id}:`, error);
      }
    }

    console.log(`Batch processing complete. Processed: ${processed}, Scheduled: ${scheduled}, Moved to Lost: ${movedToLost}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        total_leads: leads?.length || 0,
        processed,
        scheduled,
        moved_to_lost: movedToLost
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-rnr-batch:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
