import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Running daily follow-up alerts check...');

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Find all leads with follow-ups due today
    const { data: leadsWithFollowUps, error: leadsError } = await supabase
      .from('leads')
      .select('id, name, phone, next_followup_date, next_followup_time, assigned_to')
      .eq('next_followup_date', today)
      .not('assigned_to', 'is', null);

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      throw leadsError;
    }

    console.log(`Found ${leadsWithFollowUps?.length || 0} leads with follow-ups due today`);

    // Get all managers (pre-sales and sales managers)
    const { data: managers, error: managersError } = await supabase
      .from('user_roles')
      .select('user_id, profiles:user_id(full_name)')
      .in('role', ['business_manager', 'sales_manager']);

    if (managersError) {
      console.error('Error fetching managers:', managersError);
      throw managersError;
    }

    const managerIds = managers?.map(m => m.user_id) || [];

    let notificationCount = 0;

    // Create notifications for each lead with follow-up
    if (leadsWithFollowUps && leadsWithFollowUps.length > 0) {
      for (const lead of leadsWithFollowUps) {
        const followUpTime = lead.next_followup_time || '09:00';

        const notifications = [];

        // Notify assigned agent
        if (lead.assigned_to) {
          notifications.push({
            type: 'follow_up_reminder',
            title: '🛎️ Follow-Up Reminder',
            message: `Lead: ${lead.name}\nContact: ${lead.phone}\nFollow-Up Due: ${lead.next_followup_date}, ${followUpTime}`,
            lead_id: lead.id,
            recipient_id: lead.assigned_to,
          });
        }

        // Notify all managers
        for (const managerId of managerIds) {
          notifications.push({
            type: 'follow_up_reminder',
            title: '🛎️ Follow-Up Reminder',
            message: `Lead: ${lead.name}\nContact: ${lead.phone}\nFollow-Up Due: ${lead.next_followup_date}, ${followUpTime}`,
            lead_id: lead.id,
            recipient_id: managerId,
          });
        }

        if (notifications.length > 0) {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notifications);

          if (notifError) {
            console.error('Error creating notifications for lead:', lead.id, notifError);
          } else {
            notificationCount += notifications.length;
          }
        }
      }
    }

    console.log(`Created ${notificationCount} follow-up notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        leads_checked: leadsWithFollowUps?.length || 0,
        notifications_created: notificationCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in daily-follow-up-alerts:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
