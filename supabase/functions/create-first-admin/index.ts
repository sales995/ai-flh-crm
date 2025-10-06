import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if any admin exists
    const { data: existingAdmins, error: checkError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1);

    if (checkError) {
      console.error("Error checking for admins:", checkError);
      throw checkError;
    }

    if (existingAdmins && existingAdmins.length > 0) {
      return new Response(
        JSON.stringify({ error: "Admin user already exists. This endpoint can only be used once." }),
        {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Create the first admin user
    const email = "admin@leadmanager.com";
    const password = "Admin@123456";
    const full_name = "System Administrator";

    console.log("Creating first admin user...");

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    });

    if (createError) {
      console.error("Error creating admin user:", createError);
      throw createError;
    }

    console.log("Admin user created:", newUser.user.id);

    // Update profile
    await supabaseAdmin
      .from("profiles")
      .update({
        full_name,
        status: "active",
      })
      .eq("id", newUser.user.id);

    // Update role to admin
    await supabaseAdmin
      .from("user_roles")
      .update({ role: "admin" })
      .eq("user_id", newUser.user.id);

    console.log("First admin user created successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "First admin user created successfully",
        credentials: {
          email,
          password,
          note: "Please change this password immediately after first login"
        }
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in create-first-admin function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
