import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation schema
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

interface Lead {
  id: string;
  project_type?: string;
  budget_min?: number;
  budget_max?: number;
  location?: string;
}

interface Project {
  id: string;
  name: string;
  location: string;
  price_min?: number;
  price_max?: number;
  project_type: string;
  tags?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const lead_id = validateLeadId(body.lead_id);

    console.log('Matching lead:', lead_id);

    // Get lead details
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('id, project_type, budget_min, budget_max, location')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      throw new Error('Lead not found');
    }

    // Get all active projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('is_active', true);

    if (projectsError) {
      throw new Error('Failed to fetch projects');
    }

    // Calculate match scores
    const matches = projects
      .map((project: Project) => {
        const score = calculateMatchScore(lead, project);
        const reasons = getMatchReasons(lead, project);
        
        return {
          lead_id: lead.id,
          project_id: project.id,
          score,
          match_reasons: reasons,
          highly_suitable: score >= 80, // Top matches
        };
      })
      .filter(match => match.score >= 30) // Minimum threshold
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5 matches

    // Delete existing matches for this lead
    await supabase
      .from('matchings')
      .delete()
      .eq('lead_id', lead_id);

    // Insert new matches
    if (matches.length > 0) {
      const { error: insertError } = await supabase
        .from('matchings')
        .insert(matches);

      if (insertError) {
        console.error('Error inserting matches:', insertError);
        throw insertError;
      }
    }

    console.log(`Generated ${matches.length} matches for lead ${lead_id}`);

    return new Response(
      JSON.stringify({ success: true, matches_count: matches.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in match-lead-supply:', error);
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

function calculateMatchScore(lead: Lead, project: Project): number {
  let score = 0;

  // Budget match (40 points)
  if (lead.budget_min && lead.budget_max && project.price_min && project.price_max) {
    const leadMidpoint = (lead.budget_min + lead.budget_max) / 2;
    const projectMidpoint = (project.price_min + project.price_max) / 2;
    const budgetDiff = Math.abs(leadMidpoint - projectMidpoint) / leadMidpoint;

    if (budgetDiff <= 0.1) {
      score += 40; // Within 10%
    } else if (budgetDiff <= 0.2) {
      score += 32; // Within 20%
    } else if (budgetDiff <= 0.3) {
      score += 24; // Within 30%
    } else if (budgetDiff <= 0.4) {
      score += 16; // Within 40%
    }
  }

  // Location match (30 points)
  if (lead.location && project.location) {
    const leadLoc = lead.location.toLowerCase().trim();
    const projectLoc = project.location.toLowerCase().trim();
    
    if (leadLoc === projectLoc) {
      score += 30; // Exact match
    } else if (leadLoc.includes(projectLoc) || projectLoc.includes(leadLoc)) {
      score += 24; // Partial match
    }
  }

  // Property type match (20 points)
  if (lead.project_type && project.project_type) {
    if (lead.project_type === project.project_type) {
      score += 20;
    } else if (
      (lead.project_type === 'apartment' && project.project_type === 'villa') ||
      (lead.project_type === 'villa' && project.project_type === 'apartment')
    ) {
      score += 10; // Similar types
    }
  }

  // Tags bonus (10 points)
  if (project.tags && project.tags.length > 0) {
    const hasInvestmentTag = project.tags.some(tag => 
      tag.toLowerCase().includes('investment') || tag.toLowerCase().includes('roi')
    );
    if (hasInvestmentTag) {
      score += 10;
    }
  }

  return Math.min(score, 100);
}

function getMatchReasons(lead: Lead, project: Project): string[] {
  const reasons: string[] = [];

  // Budget
  if (lead.budget_min && lead.budget_max && project.price_min && project.price_max) {
    const leadMidpoint = (lead.budget_min + lead.budget_max) / 2;
    const projectMidpoint = (project.price_min + project.price_max) / 2;
    const budgetDiff = Math.abs(leadMidpoint - projectMidpoint) / leadMidpoint;

    if (budgetDiff <= 0.2) {
      reasons.push('Budget aligns perfectly');
    }
  }

  // Location
  if (lead.location && project.location) {
    const leadLoc = lead.location.toLowerCase().trim();
    const projectLoc = project.location.toLowerCase().trim();
    
    if (leadLoc === projectLoc) {
      reasons.push('Exact location match');
    }
  }

  // Property type
  if (lead.project_type === project.project_type) {
    reasons.push('Property type matches');
  }

  // ROI
  if (project.tags) {
    const roiTag = project.tags.find(tag => tag.toLowerCase().includes('roi'));
    if (roiTag) {
      reasons.push(`Investment potential: ${roiTag}`);
    }
  }

  return reasons;
}
