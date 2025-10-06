import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Building2, Package, TrendingUp, HardHat } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

export default function SupplyDashboard() {
  const queryClient = useQueryClient();

  // Realtime subscriptions
  useEffect(() => {
    const buildersChannel = supabase
      .channel("supply-builders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "builders" }, () => {
        queryClient.invalidateQueries({ queryKey: ["supply-stats"] });
      })
      .subscribe();

    const projectsChannel = supabase
      .channel("supply-projects-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        queryClient.invalidateQueries({ queryKey: ["supply-stats"] });
        queryClient.invalidateQueries({ queryKey: ["projects-by-stage"] });
        queryClient.invalidateQueries({ queryKey: ["projects-by-builder"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(buildersChannel);
      supabase.removeChannel(projectsChannel);
    };
  }, [queryClient]);

  const { data: stats } = useQuery({
    queryKey: ["supply-stats"],
    queryFn: async () => {
      const [
        { count: totalBuilders },
        { count: totalProjects },
        { count: activeProjects },
        { count: readyProjects },
        { data: totalUnitsData },
      ] = await Promise.all([
        supabase.from("builders").select("*", { count: "exact", head: true }),
        supabase.from("projects").select("*", { count: "exact", head: true }),
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("construction_stage", "ready"),
        supabase.from("projects").select("total_units"),
      ]);

      const totalUnits = (totalUnitsData || []).reduce((sum, p) => sum + (p.total_units || 0), 0);

      return {
        totalBuilders: totalBuilders || 0,
        totalProjects: totalProjects || 0,
        activeProjects: activeProjects || 0,
        readyProjects: readyProjects || 0,
        totalUnits,
      };
    },
  });

  const { data: projectsByStage } = useQuery({
    queryKey: ["projects-by-stage"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("construction_stage");
      
      const stageCounts = (data || []).reduce((acc: Record<string, number>, proj) => {
        const stage = proj.construction_stage || "unknown";
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(stageCounts).map(([name, value]) => ({ 
        name: name.replace("_", " ").charAt(0).toUpperCase() + name.slice(1), 
        value 
      }));
    },
  });

  const { data: projectsByBuilder } = useQuery({
    queryKey: ["projects-by-builder"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("builder_id, builders(name)")
        .not("builder_id", "is", null);
      
      const builderCounts = (data || []).reduce((acc: Record<string, number>, proj) => {
        const builderName = (proj.builders as any)?.name || "Unknown";
        acc[builderName] = (acc[builderName] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(builderCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
    },
  });

  const { data: inventorySummary } = useQuery({
    queryKey: ["inventory-summary"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select(`
        inventory_1rk, inventory_1bhk, inventory_2bhk, 
        inventory_3bhk, inventory_4bhk, inventory_5bhk
      `);

      const summary = (data || []).reduce((acc, proj) => ({
        "1 RK": acc["1 RK"] + (proj.inventory_1rk || 0),
        "1 BHK": acc["1 BHK"] + (proj.inventory_1bhk || 0),
        "2 BHK": acc["2 BHK"] + (proj.inventory_2bhk || 0),
        "3 BHK": acc["3 BHK"] + (proj.inventory_3bhk || 0),
        "4 BHK": acc["4 BHK"] + (proj.inventory_4bhk || 0),
        "5 BHK": acc["5 BHK"] + (proj.inventory_5bhk || 0),
      }), {
        "1 RK": 0, "1 BHK": 0, "2 BHK": 0, "3 BHK": 0, "4 BHK": 0, "5 BHK": 0
      });

      return Object.entries(summary).map(([name, value]) => ({ name, value }));
    },
  });

  const statCards = [
    {
      title: "Total Builders",
      value: stats?.totalBuilders || 0,
      icon: Building,
      description: "Registered builders",
      trend: "Active partners",
      color: "text-primary",
    },
    {
      title: "Total Projects",
      value: stats?.totalProjects || 0,
      icon: Building2,
      description: "All projects",
      trend: `${stats?.activeProjects || 0} active`,
      color: "text-accent",
    },
    {
      title: "Ready Projects",
      value: stats?.readyProjects || 0,
      icon: Package,
      description: "Move-in ready",
      trend: "Available now",
      color: "text-success",
    },
    {
      title: "Total Units",
      value: stats?.totalUnits || 0,
      icon: HardHat,
      description: "Across all projects",
      trend: "Inventory count",
      color: "text-primary",
    },
  ];

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Supply Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of builders, projects, and inventory
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-l-4 border-l-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
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
            <CardTitle>Projects by Construction Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={projectsByStage || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => entry.name}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {(projectsByStage || []).map((entry, index) => (
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

        <Card>
          <CardHeader>
            <CardTitle>Top Builders by Projects</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectsByBuilder || []} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={120} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '0.5rem'
                  }} 
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inventory Summary by Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={inventorySummary || []}>
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
              <Bar dataKey="value" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}