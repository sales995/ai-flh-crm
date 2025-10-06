import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, Clock } from "lucide-react";

export default function Activities() {
  const queryClient = useQueryClient();

  // Realtime subscription for activities
  useEffect(() => {
    const channel = supabase
      .channel("activities-page-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activities",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["all-activities"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: activities, isLoading } = useQuery({
    queryKey: ["all-activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*, leads(name), profiles:created_by(full_name)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Activities</h1>
        <p className="text-muted-foreground">
          Track all interactions with leads
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading activities...</div>
      ) : (
        <div className="space-y-4">
          {activities?.map((activity) => (
            <Card key={activity.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {activity.activity_type}
                    </Badge>
                    {activity.outcome && (
                      <Badge variant="secondary" className="capitalize">
                        {activity.outcome.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {new Date(activity.created_at).toLocaleString()}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {(activity.leads as any)?.name}
                    </span>
                  </div>
                  {activity.duration && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{activity.duration} minutes</span>
                    </div>
                  )}
                  {activity.notes && (
                    <p className="text-sm text-muted-foreground">{activity.notes}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Logged by {(activity.profiles as any)?.full_name || "Unknown"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!activities || activities.length === 0) && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No activities logged yet. Start tracking your lead interactions!
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
