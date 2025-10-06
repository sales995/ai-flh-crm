import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Matchings() {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);

  const { data: matchings, isLoading } = useQuery({
    queryKey: ["all-matchings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matchings")
        .select("*, leads(name, location, project_type), projects(name, location, price, project_type)")
        .order("score", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const generateMatchings = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke("generate-matchings");
      
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ["all-matchings"] });
      toast.success("Matchings generated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to generate matchings");
    } finally {
      setGenerating(false);
    }
  };

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
            <Card key={matching.id} className="hover:shadow-lg transition-shadow">
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
                    Price: ${(matching.projects as any)?.price.toLocaleString()}
                  </p>
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
