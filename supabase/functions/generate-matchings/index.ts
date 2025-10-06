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

  // Location match (40 points)
  if (lead.location && project.location) {
    if (
      lead.location.toLowerCase().includes(project.location.toLowerCase()) ||
      project.location.toLowerCase().includes(lead.location.toLowerCase())
    ) {
      score += 40;
    }
  }

  // Project type match (30 points)
  if (lead.project_type && lead.project_type === project.project_type) {
    score += 30;
  }

  // Budget match (30 points)
  if (lead.budget_min || lead.budget_max) {
    const leadBudgetMin = lead.budget_min || 0;
    const leadBudgetMax = lead.budget_max || Infinity;
    const projectPrice = project.price;

    if (projectPrice >= leadBudgetMin && projectPrice <= leadBudgetMax) {
      score += 30;
    } else if (
      projectPrice < leadBudgetMin &&
      projectPrice >= leadBudgetMin * 0.8
    ) {
      score += 15;
    } else if (
      projectPrice > leadBudgetMax &&
      projectPrice <= leadBudgetMax * 1.2
    ) {
      score += 15;
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

  if (lead.budget_min || lead.budget_max) {
    const leadBudgetMin = lead.budget_min || 0;
    const leadBudgetMax = lead.budget_max || Infinity;
    const projectPrice = project.price;

    if (projectPrice >= leadBudgetMin && projectPrice <= leadBudgetMax) {
      reasons.push("Within budget");
    } else if (
      projectPrice < leadBudgetMin &&
      projectPrice >= leadBudgetMin * 0.8
    ) {
      reasons.push("Close to budget");
    } else if (
      projectPrice > leadBudgetMax &&
      projectPrice <= leadBudgetMax * 1.2
    ) {
      reasons.push("Slightly above budget");
    }
  }

  return reasons;
}
