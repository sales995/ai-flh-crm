import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Input validation helpers
const validateEmail = (email: string): void => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }
};

const validatePassword = (password: string): void => {
  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters long');
  }
};

const validatePhone = (phone: string | undefined): void => {
  if (phone && phone.length > 0) {
    const phoneRegex = /^[0-9+\-\s()]+$/;
    if (!phoneRegex.test(phone)) {
      throw new Error('Invalid phone number format');
    }
  }
};

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  role: "admin" | "manager" | "agent";
  username?: string;
  phone?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization token from request
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Verify the requesting user is an admin
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
    const body: CreateUserRequest = await req.json();
    const { email, password, full_name, role, username, phone } = body;

    // Validate required fields
    if (!email || !password || !full_name || !role) {
      throw new Error("Missing required fields: email, password, full_name, role");
    }

    // Validate inputs
    validateEmail(email);
    validatePassword(password);
    validatePhone(phone);

    console.log("Creating user:", { email, full_name, role });

    // Create the user using admin client
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw createError;
    }

    console.log("User created successfully:", newUser.user.id);

    // Update profile with additional fields
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name,
        username: username || null,
        phone: phone || null,
        status: "active",
      })
      .eq("id", newUser.user.id);

    if (profileError) {
      console.error("Error updating profile:", profileError);
      // Don't throw here, user is already created
    }

    // Update user role if different from default
    if (role !== "agent") {
      const { error: roleUpdateError } = await supabaseAdmin
        .from("user_roles")
        .update({ role })
        .eq("user_id", newUser.user.id);

      if (roleUpdateError) {
        console.error("Error updating role:", roleUpdateError);
        // Don't throw here, user is already created
      }
    }

    // Log the action
    await supabaseAdmin
      .from("audit_logs")
      .insert({
        user_id: user.id,
        action: "user_created",
        table_name: "profiles",
        record_id: newUser.user.id,
        details: { email, role, full_name },
      });

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name,
          role,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in create-user function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === "Unauthorized" || error.message === "Unauthorized - Admin access required" ? 403 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
