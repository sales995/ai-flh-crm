import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

export default function Matchings() {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Check user role
  useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      setUserRole(data?.role || "agent");
    };

    checkUserRole();
  }, []);

  const { data: matchings, isLoading } = useQuery({
    queryKey: ["all-matchings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matchings")
        .select("*, leads(name, location, project_type, tags), projects(name, location, price, price_min, price_max, project_type, tags)")
        .order("score", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Realtime subscription for matchings
  useEffect(() => {
    const channel = supabase
      .channel("matchings-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matchings",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["all-matchings"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const updateApproval = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase
        .from("matchings")
        .update({ approved })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-matchings"] });
      toast.success("Matching approval updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update approval");
    },
  });

  const generateMatchings = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("generate-matchings");
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["all-matchings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Matchings generated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate matchings");
    } finally {
      setGenerating(false);
    }
  };

  const canApprove = userRole === "admin" || userRole === "manager";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Matchings</h1>
          <p className="text-muted-foreground">
            AI-powered lead to project matching
          </p>
        </div>
        <Button onClick={generateMatchings} disabled={generating}>
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Matchings
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading matchings...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {matchings?.map((matching) => (
            <Card key={matching.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-primary">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">
                    {(matching.leads as any)?.name}
                  </CardTitle>
                  <Badge className="bg-primary">
                    {matching.score}% Match
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Matched Project</p>
                  <p className="font-medium">{(matching.projects as any)?.name}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Lead Location</p>
                    <p>{(matching.leads as any)?.location || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Project Location</p>
                    <p>{(matching.projects as any)?.location}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Lead Type</p>
                    <p className="capitalize">{(matching.leads as any)?.project_type || "Any"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Project Type</p>
                    <p className="capitalize">{(matching.projects as any)?.project_type}</p>
                  </div>
                </div>

                {matching.match_reasons && matching.match_reasons.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Match Reasons</p>
                    <div className="flex flex-wrap gap-1">
                      {matching.match_reasons.map((reason, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    Price: ${(matching.projects as any)?.price?.toLocaleString() || 
                      `${(matching.projects as any)?.price_min?.toLocaleString()} - ${(matching.projects as any)?.price_max?.toLocaleString()}`}
                  </p>
                </div>

                {/* Approval Toggle */}
                <div className="pt-3 border-t flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {matching.approved ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Label className="text-sm">
                      {matching.approved ? "Approved" : "Not Approved"}
                    </Label>
                  </div>
                  {canApprove && (
                    <Switch
                      checked={matching.approved || false}
                      onCheckedChange={(checked) =>
                        updateApproval.mutate({ id: matching.id, approved: checked })
                      }
                      disabled={updateApproval.isPending}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {(!matchings || matchings.length === 0) && (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-muted-foreground">
                No matchings generated yet. Click "Generate Matchings" to create AI-powered recommendations!
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}