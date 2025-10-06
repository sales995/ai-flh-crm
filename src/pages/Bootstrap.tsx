import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Copy, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Bootstrap() {
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const handleBootstrap = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("bootstrap-admin");

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        if (data.email) {
          setTimeout(() => navigate("/auth"), 2000);
        }
      } else {
        setCredentials(data.credentials);
        toast.success(data.message);
      }
    } catch (error: any) {
      console.error("Bootstrap error:", error);
      toast.error(error.message || "Failed to create admin user");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl font-bold">System Setup</CardTitle>
          </div>
          <CardDescription>
            Create the first admin user for your Lead Manager system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!credentials ? (
            <>
              <p className="text-sm text-muted-foreground">
                Click the button below to create the initial admin account. You'll receive the login credentials after creation.
              </p>
              <Button 
                onClick={handleBootstrap} 
                className="w-full" 
                disabled={loading}
                size="lg"
              >
                {loading ? "Creating Admin..." : "Create Admin User"}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-semibold">Admin user created successfully!</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="font-medium text-foreground">Email:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-background px-2 py-1 rounded">
                        {credentials.email}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(credentials.email)}
                      >
                        {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <p className="font-medium text-foreground">Password:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-background px-2 py-1 rounded">
                        {credentials.password}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(credentials.password)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mt-3">
                  ⚠️ {credentials.note}
                </p>
              </div>

              <Button 
                onClick={() => navigate("/auth")} 
                className="w-full"
                size="lg"
              >
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
