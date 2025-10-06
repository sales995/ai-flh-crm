import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UpdateUserRequest {
  user_id: string;
  email?: string;
  password?: string;
  full_name?: string;
  role?: "admin" | "manager" | "agent";
  username?: string;
  phone?: string;
  status?: "active" | "inactive";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      throw new Error("Unauthorized");
    }

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      console.error("Role check failed:", roleError);
      throw new Error("Unauthorized - Admin access required");
    }

    // Parse request body
    const body: UpdateUserRequest = await req.json();
    const { user_id, email, password, full_name, role, username, phone, status } = body;

    if (!user_id) {
      throw new Error("user_id is required");
    }

    console.log("Updating user:", { user_id, email, role, status });

    // Update auth user if email or password changed
    if (email || password) {
      const updateData: any = {};
      if (email) updateData.email = email;
      if (password) updateData.password = password;

      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        updateData
      );

      if (authUpdateError) {
        console.error("Error updating auth user:", authUpdateError);
        throw authUpdateError;
      }
    }

    // Update profile
    const profileUpdates: any = {};
    if (full_name !== undefined) profileUpdates.full_name = full_name;
    if (username !== undefined) profileUpdates.username = username;
    if (phone !== undefined) profileUpdates.phone = phone;
    if (status !== undefined) profileUpdates.status = status;

    if (Object.keys(profileUpdates).length > 0) {
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update(profileUpdates)
        .eq("id", user_id);

      if (profileError) {
        console.error("Error updating profile:", profileError);
        throw profileError;
      }
    }

    // Update role if provided
    if (role) {
      const { error: roleUpdateError } = await supabaseAdmin
        .from("user_roles")
        .update({ role })
        .eq("user_id", user_id);

      if (roleUpdateError) {
        console.error("Error updating role:", roleUpdateError);
        throw roleUpdateError;
      }
    }

    // Log the action
    await supabaseAdmin
      .from("audit_logs")
      .insert({
        user_id: user.id,
        action: "user_updated",
        table_name: "profiles",
        record_id: user_id,
        details: { email, role, full_name, status },
      });

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in update-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message.includes("Unauthorized") ? 403 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
