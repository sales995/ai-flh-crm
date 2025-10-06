import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, Activity, Sparkles, TrendingUp, CheckCircle2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export default function Dashboard() {
  const queryClient = useQueryClient();

  // Realtime subscriptions for live updates
  useEffect(() => {
    const leadsChannel = supabase
      .channel("leads-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leads",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
          queryClient.invalidateQueries({ queryKey: ["recent-leads"] });
          queryClient.invalidateQueries({ queryKey: ["leads-by-source"] });
          queryClient.invalidateQueries({ queryKey: ["leads-by-status"] });
          queryClient.invalidateQueries({ queryKey: ["top-campaigns"] });
        }
      )
      .subscribe();

    const projectsChannel = supabase
      .channel("projects-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        }
      )
      .subscribe();

    const activitiesChannel = supabase
      .channel("activities-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activities",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        }
      )
      .subscribe();

    const matchingsChannel = supabase
      .channel("matchings-changes-dashboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matchings",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(projectsChannel);
      supabase.removeChannel(activitiesChannel);
      supabase.removeChannel(matchingsChannel);
    };
  }, [queryClient]);

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [
        { count: totalLeads },
        { count: activeLeads },
        { count: convertedLeads },
        { count: totalProjects },
        { count: recentActivities },
        { count: totalMatchings },
      ] = await Promise.all([
        supabase.from("leads").select("*", { count: "exact", head: true }),
        supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .in("status", ["new", "contacted", "qualified", "interested"]),
        supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("status", "converted"),
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
        convertedLeads: convertedLeads || 0,
        totalProjects: totalProjects || 0,
        recentActivities: recentActivities || 0,
        totalMatchings: totalMatchings || 0,
      };
    },
  });

  const { data: leadsBySource } = useQuery({
    queryKey: ["leads-by-source"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("source")
        .not("source", "is", null);
      
      const sourceCounts = (data || []).reduce((acc: Record<string, number>, lead) => {
        const source = lead.source || "Unknown";
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(sourceCounts).map(([name, value]) => ({ name, value }));
    },
  });

  const { data: leadsByStatus } = useQuery({
    queryKey: ["leads-by-status"],
    queryFn: async () => {
      const { data } = await supabase.from("leads").select("status");
      
      const statusCounts = (data || []).reduce((acc: Record<string, number>, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    },
  });

  const { data: topCampaigns } = useQuery({
    queryKey: ["top-campaigns"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("campaign")
        .not("campaign", "is", null);
      
      const campaignCounts = (data || []).reduce((acc: Record<string, number>, lead) => {
        const campaign = lead.campaign || "Unknown";
        acc[campaign] = (acc[campaign] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(campaignCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
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
      color: "text-primary",
    },
    {
      title: "Active Leads",
      value: stats?.activeLeads || 0,
      icon: TrendingUp,
      description: "Currently in pipeline",
      trend: "In progress",
      color: "text-accent",
    },
    {
      title: "Converted Leads",
      value: stats?.convertedLeads || 0,
      icon: CheckCircle2,
      description: "Successfully closed",
      trend: `${stats?.totalLeads ? Math.round((stats.convertedLeads / stats.totalLeads) * 100) : 0}% conversion`,
      color: "text-success",
    },
    {
      title: "Projects",
      value: stats?.totalProjects || 0,
      icon: Building2,
      description: "Available projects",
      trend: "Active listings",
      color: "text-primary",
    },
    {
      title: "Recent Activities",
      value: stats?.recentActivities || 0,
      icon: Activity,
      description: "Last 7 days",
      trend: "This week",
      color: "text-accent",
    },
    {
      title: "Matchings",
      value: stats?.totalMatchings || 0,
      icon: Sparkles,
      description: "Lead-project matches",
      trend: "Auto-generated",
      color: "text-primary",
    },
  ];

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your lead management system
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
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

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leads by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={leadsBySource || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem'
                  }} 
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Pipeline Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadsByStatus || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {(leadsByStatus || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem'
                  }} 
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCampaigns || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={100} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem'
                  }} 
                />
                <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

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
                    {lead.source && (
                      <p className="text-xs text-muted-foreground">
                        Source: {lead.source}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium capitalize">
                      {lead.status.replace("_", " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(lead.profiles as any)?.full_name || "Unknown"}
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
    </div>
  );
}