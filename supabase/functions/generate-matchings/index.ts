import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Starting matching generation...");

    // Get all active leads
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("*")
      .in("status", ["new", "contacted", "qualified", "interested"]);

    if (leadsError) {
      console.error("Error fetching leads:", leadsError);
      throw leadsError;
    }

    // Get all active projects
    const { data: projects, error: projectsError } = await supabase
      .from("projects")
      .select("*")
      .eq("is_active", true);

    if (projectsError) {
      console.error("Error fetching projects:", projectsError);
      throw projectsError;
    }

    console.log(`Processing ${leads?.length || 0} leads and ${projects?.length || 0} projects`);

    // Clear existing matchings
    const { error: deleteError } = await supabase
      .from("matchings")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (deleteError) {
      console.error("Error clearing matchings:", deleteError);
    }

    // Generate matchings
    const matchings = [];

    for (const lead of leads || []) {
      for (const project of projects || []) {
        const score = calculateMatchScore(lead, project);
        const reasons = getMatchReasons(lead, project);

        if (score >= 30) {
          matchings.push({
            lead_id: lead.id,
            project_id: project.id,
            score,
            match_reasons: reasons,
          });
        }
      }
    }

    console.log(`Generated ${matchings.length} matchings`);

    // Insert matchings in batches
    if (matchings.length > 0) {
      const { error: insertError } = await supabase
        .from("matchings")
        .insert(matchings);

      if (insertError) {
        console.error("Error inserting matchings:", insertError);
        throw insertError;
      }
    }

    // Log audit event
    await supabase.rpc('log_audit', {
      _action: 'matchings_generated',
      _table_name: 'matchings',
      _record_id: null,
      _details: { count: matchings.length }
    });

    return new Response(
      JSON.stringify({
        success: true,
        matchingsCreated: matchings.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-matchings:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function calculateMatchScore(lead: any, project: any): number {
  let score = 0;

  // Location match - 30 points
  if (lead.location && project.location) {
    if (
      lead.location.toLowerCase().includes(project.location.toLowerCase()) ||
      project.location.toLowerCase().includes(lead.location.toLowerCase())
    ) {
      score += 30;
    }
  }

  // Project type match - 30 points
  if (lead.project_type && lead.project_type === project.project_type) {
    score += 30;
  }

  // Budget match - 40 points (within price range)
  if (lead.budget_min && lead.budget_max) {
    const leadMin = lead.budget_min;
    const leadMax = lead.budget_max;
    
    if (project.price_min && project.price_max) {
      // New: price range matching
      const projMin = project.price_min;
      const projMax = project.price_max;
      
      // Check if ranges overlap
      if (leadMin <= projMax && leadMax >= projMin) {
        score += 40;
      }
    } else if (project.price) {
      // Legacy: single price field
      if (project.price >= leadMin && project.price <= leadMax) {
        score += 40;
      } else if (Math.abs(project.price - leadMax) / leadMax < 0.2) {
        score += 25;
      }
    }
  }

  // Tags match - 10 points
  if (lead.tags && project.tags && Array.isArray(lead.tags) && Array.isArray(project.tags)) {
    const intersection = lead.tags.filter((tag: string) => 
      project.tags.includes(tag)
    );
    if (intersection.length > 0) {
      score += 10;
    }
  }

  return Math.min(score, 100);
}

function getMatchReasons(lead: any, project: any): string[] {
  const reasons = [];

  if (lead.location && project.location) {
    if (
      lead.location.toLowerCase().includes(project.location.toLowerCase()) ||
      project.location.toLowerCase().includes(lead.location.toLowerCase())
    ) {
      reasons.push("Location match");
    }
  }

  if (lead.project_type && lead.project_type === project.project_type) {
    reasons.push("Project type match");
  }

  if (lead.budget_min && lead.budget_max) {
    const leadMin = lead.budget_min;
    const leadMax = lead.budget_max;
    
    if (project.price_min && project.price_max) {
      const projMin = project.price_min;
      const projMax = project.price_max;
      
      if (leadMin <= projMax && leadMax >= projMin) {
        reasons.push("Budget ranges overlap");
      }
    } else if (project.price) {
      if (project.price >= leadMin && project.price <= leadMax) {
        reasons.push("Within budget");
      } else if (project.price < leadMin) {
        reasons.push("Below budget");
      } else if (Math.abs(project.price - leadMax) / leadMax < 0.2) {
        reasons.push("Close to budget");
      } else {
        reasons.push("Slightly above budget");
      }
    }
  }

  if (lead.tags && project.tags && Array.isArray(lead.tags) && Array.isArray(project.tags)) {
    const intersection = lead.tags.filter((tag: string) => 
      project.tags.includes(tag)
    );
    if (intersection.length > 0) {
      reasons.push(`Matching tags: ${intersection.join(", ")}`);
    }
  }

  return reasons;
}