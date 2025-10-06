import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, TrendingUp, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function MatchMakingDashboard() {
  const queryClient = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("matchmaking-stats-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "matchings" }, () => {
        queryClient.invalidateQueries({ queryKey: ["matchmaking-stats"] });
        queryClient.invalidateQueries({ queryKey: ["matches-by-project-type"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Match Making statistics
  const { data: stats } = useQuery({
    queryKey: ["matchmaking-stats"],
    queryFn: async () => {
      const [totalRes, highScoreRes, approvedRes] = await Promise.all([
        supabase.from("matchings").select("id", { count: "exact" }),
        supabase.from("matchings").select("id", { count: "exact" }).gte("score", 80),
        supabase.from("matchings").select("id", { count: "exact" }).eq("approved", true),
      ]);

      return {
        totalMatches: totalRes.count || 0,
        highScoreMatches: highScoreRes.count || 0,
        approvedMatches: approvedRes.count || 0,
      };
    },
  });

  // Matches by project type
  const { data: matchesByType } = useQuery({
    queryKey: ["matches-by-project-type"],
    queryFn: async () => {
      const { data } = await supabase
        .from("matchings")
        .select("projects(project_type)");

      const typeCounts: Record<string, number> = {};
      data?.forEach((m) => {
        const type = (m.projects as any)?.project_type || "unknown";
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      return Object.entries(typeCounts).map(([name, Matches]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        Matches,
      }));
    },
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Matches</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMatches || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High-Score Matches (≥80%)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.highScoreMatches || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved Matches</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.approvedMatches || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Matches by Project Type</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={matchesByType || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Matches" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
