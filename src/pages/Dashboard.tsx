import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Activity, Sparkles, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [
        { count: totalLeads },
        { count: activeLeads },
        { count: totalProjects },
        { count: recentActivities },
        { count: totalMatchings },
      ] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .in("status", ["new", "contacted", "qualified", "interested"]),
        supabase.from("projects").select("*", { count: "exact", head: true }),
        supabase
          .from("activities")
          .select("*", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("matchings").select("*", { count: "exact", head: true }),
      ]);

      return {
        totalLeads: totalLeads || 0,
        activeLeads: activeLeads || 0,
        totalProjects: totalProjects || 0,
        recentActivities: recentActivities || 0,
        totalMatchings: totalMatchings || 0,
      };
    },
  });

  const { data: recentLeads } = useQuery({
    queryKey: ["recent-leads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("*, profiles:created_by(full_name)")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const statCards = [
    {
      title: "Total Leads",
      value: stats?.totalLeads || 0,
      icon: Users,
      description: "All time leads",
      trend: `${stats?.activeLeads || 0} active`,
    },
    {
      title: "Projects",
      value: stats?.totalProjects || 0,
      icon: Building2,
      description: "Available projects",
      trend: "Active listings",
    },
    {
      title: "Recent Activities",
      value: stats?.recentActivities || 0,
      icon: Activity,
      description: "Last 7 days",
      trend: "This week",
    },
    {
      title: "Matchings",
      value: stats?.totalMatchings || 0,
      icon: Sparkles,
      description: "Lead-project matches",
      trend: "Auto-generated",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your lead management system
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
              <div className="flex items-center mt-2 text-xs text-primary">
                <TrendingUp className="h-3 w-3 mr-1" />
                {stat.trend}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentLeads?.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div>
                  <p className="font-medium">{lead.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {lead.email || lead.phone}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium capitalize">
                    {lead.status.replace("_", " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Created by {(lead.profiles as any)?.full_name || "Unknown"}
                  </p>
                </div>
              </div>
            ))}
            {(!recentLeads || recentLeads.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                No leads yet. Create your first lead to get started!
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
