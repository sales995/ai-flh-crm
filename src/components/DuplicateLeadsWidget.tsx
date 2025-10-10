import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function DuplicateLeadsWidget() {
  const navigate = useNavigate();

  const { data: duplicateStats } = useQuery({
    queryKey: ["duplicate-stats"],
    queryFn: async () => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      // Get duplicates this week
      const { count: weekCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("lead_type", "duplicate")
        .gte("created_at", oneWeekAgo.toISOString());

      // Get total duplicates
      const { count: totalCount } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("lead_type", "duplicate");

      // Get top source with most duplicates
      const { data: sourcesData } = await supabase
        .from("leads")
        .select("source")
        .eq("lead_type", "duplicate")
        .not("source", "is", null);

      const sourceCounts = (sourcesData || []).reduce((acc: Record<string, number>, lead) => {
        const source = lead.source || "Unknown";
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {});

      const topSource = Object.entries(sourceCounts)
        .sort((a, b) => b[1] - a[1])[0];

      const topSourceName = topSource ? topSource[0] : "N/A";
      const topSourcePercentage = topSource && totalCount 
        ? Math.round((topSource[1] / (totalCount || 1)) * 100) 
        : 0;

      return {
        weekCount: weekCount || 0,
        totalCount: totalCount || 0,
        topSource: topSourceName,
        topSourcePercentage,
      };
    },
  });

  return (
    <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-400">
          🟡 Duplicate Leads Overview
        </CardTitle>
        <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-500" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-amber-700 dark:text-amber-400">This Week:</span>
            <span className="text-2xl font-bold text-amber-800 dark:text-amber-300">
              {duplicateStats?.weekCount || 0}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-amber-700 dark:text-amber-400">Total Duplicates:</span>
            <span className="text-xl font-semibold text-amber-800 dark:text-amber-300">
              {duplicateStats?.totalCount || 0}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-amber-700 dark:text-amber-400">Top Source:</span>
            <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {duplicateStats?.topSource} ({duplicateStats?.topSourcePercentage}%)
            </span>
          </div>
          <div className="pt-2 border-t border-amber-300 dark:border-amber-800">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-amber-400 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/30"
              onClick={() => navigate("/leads")}
            >
              View Duplicate Leads →
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
