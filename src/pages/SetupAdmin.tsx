import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, KeyRound } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SetupAdmin() {
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const navigate = useNavigate();

  const createFirstAdmin = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-first-admin");

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        navigate("/auth");
        return;
      }

      setCredentials(data.credentials);
      toast.success("Admin user created successfully!");
    } catch (error: any) {
      console.error("Error creating admin:", error);
      toast.error(error.message || "Failed to create admin user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl font-bold">Initial Setup</CardTitle>
          </div>
          <CardDescription>
            Create your first administrator account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!credentials ? (
            <>
              <Alert>
                <KeyRound className="h-4 w-4" />
                <AlertDescription>
                  This will create the first administrator account. This can only be done once.
                </AlertDescription>
              </Alert>
              <Button 
                onClick={createFirstAdmin} 
                className="w-full" 
                disabled={loading}
              >
                {loading ? "Creating Admin..." : "Create First Admin"}
              </Button>
            </>
          ) : (
            <>
              <Alert className="bg-primary/10 border-primary">
                <KeyRound className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <p className="font-semibold">Admin credentials created:</p>
                  <div className="bg-background p-3 rounded-md space-y-1 font-mono text-sm">
                    <p><strong>Email:</strong> {credentials.email}</p>
                    <p><strong>Password:</strong> {credentials.password}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    ⚠️ Save these credentials securely and change the password immediately after first login.
                  </p>
                </AlertDescription>
              </Alert>
              <Button 
                onClick={() => navigate("/auth")} 
                className="w-full"
              >
                Go to Login
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
