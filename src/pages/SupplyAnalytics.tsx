import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Building2, Package, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function SupplyAnalytics() {
  const queryClient = useQueryClient();

  // Realtime subscriptions
  useEffect(() => {
    const buildersChannel = supabase
      .channel("supply-builders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "builders" }, () => {
        queryClient.invalidateQueries({ queryKey: ["supply-stats"] });
        queryClient.invalidateQueries({ queryKey: ["projects-by-type"] });
      })
      .subscribe();

    const projectsChannel = supabase
      .channel("supply-projects-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        queryClient.invalidateQueries({ queryKey: ["supply-stats"] });
        queryClient.invalidateQueries({ queryKey: ["projects-by-type"] });
        queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(buildersChannel);
      supabase.removeChannel(projectsChannel);
    };
  }, [queryClient]);

  // Supply statistics
  const { data: stats } = useQuery({
    queryKey: ["supply-stats"],
    queryFn: async () => {
      const [buildersRes, projectsRes, activeProjectsRes, readyProjectsRes] = await Promise.all([
        supabase.from("builders").select("id", { count: "exact" }),
        supabase.from("projects").select("id", { count: "exact" }),
        supabase.from("projects").select("id", { count: "exact" }).eq("is_active", true),
        supabase.from("projects").select("id", { count: "exact" }).eq("construction_stage", "ready"),
      ]);

      return {
        totalBuilders: buildersRes.count || 0,
        totalProjects: projectsRes.count || 0,
        activeProjects: activeProjectsRes.count || 0,
        readyProjects: readyProjectsRes.count || 0,
      };
    },
  });

  // Projects by type
  const { data: projectsByType } = useQuery({
    queryKey: ["projects-by-type"],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("project_type");

      const typeCounts: Record<string, number> = {};
      data?.forEach((p) => {
        const type = p.project_type || "unknown";
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });

      return Object.entries(typeCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }));
    },
  });

  // Inventory summary
  const { data: inventorySummary } = useQuery({
    queryKey: ["inventory-summary"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select(`
        inventory_1rk,
        inventory_1bhk,
        inventory_1_5bhk,
        inventory_2bhk,
        inventory_2bhk_1t,
        inventory_2_5bhk,
        inventory_3bhk,
        inventory_3bhk_2t,
        inventory_4bhk,
        inventory_5bhk
      `);

      const inventory = {
        "1 RK": 0,
        "1 BHK": 0,
        "1.5 BHK": 0,
        "2 BHK": 0,
        "2 BHK+1T": 0,
        "2.5 BHK": 0,
        "3 BHK": 0,
        "3 BHK+2T": 0,
        "4 BHK": 0,
        "5 BHK": 0,
      };

      data?.forEach((p) => {
        inventory["1 RK"] += p.inventory_1rk || 0;
        inventory["1 BHK"] += p.inventory_1bhk || 0;
        inventory["1.5 BHK"] += p.inventory_1_5bhk || 0;
        inventory["2 BHK"] += p.inventory_2bhk || 0;
        inventory["2 BHK+1T"] += p.inventory_2bhk_1t || 0;
        inventory["2.5 BHK"] += p.inventory_2_5bhk || 0;
        inventory["3 BHK"] += p.inventory_3bhk || 0;
        inventory["3 BHK+2T"] += p.inventory_3bhk_2t || 0;
        inventory["4 BHK"] += p.inventory_4bhk || 0;
        inventory["5 BHK"] += p.inventory_5bhk || 0;
      });

      return Object.entries(inventory)
        .filter(([_, value]) => value > 0)
        .map(([name, Units]) => ({ name, Units }));
    },
  });

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Builders</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalBuilders || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalProjects || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeProjects || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready Projects</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.readyProjects || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Projects by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Projects by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={projectsByType || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {projectsByType?.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Inventory Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Inventory Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={inventorySummary || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Units" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
