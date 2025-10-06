import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Phone, Mail, MapPin, DollarSign, Calendar, Edit } from "lucide-react";
import { useState } from "react";
import { LeadDialog } from "@/components/LeadDialog";
import { ActivityDialog } from "@/components/ActivityDialog";
import { toast } from "sonner";

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [activityDialogOpen, setActivityDialogOpen] = useState(false);

  const { data: lead, isLoading } = useQuery({
    queryKey: ["lead", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, profiles:created_by(full_name), assigned_profile:assigned_to(full_name)")
        .eq("id", id!)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: activities } = useQuery({
    queryKey: ["lead-activities", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*, profiles:created_by(full_name)")
        .eq("lead_id", id!)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: matchings } = useQuery({
    queryKey: ["lead-matchings", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matchings")
        .select("*, projects(*)")
        .eq("lead_id", id!)
        .order("score", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("is_active", true);
      
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!lead) {
    return <div className="p-6">Lead not found</div>;
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-500",
      contacted: "bg-yellow-500",
      qualified: "bg-purple-500",
      interested: "bg-green-500",
      not_interested: "bg-gray-500",
      converted: "bg-emerald-500",
      lost: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/leads")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{lead.name}</h1>
            <Badge className={`mt-2 ${getStatusColor(lead.status)}`}>
              {lead.status.replace("_", " ")}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setActivityDialogOpen(true)}>
            Log Activity
          </Button>
          <Button onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Lead
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lead.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{lead.phone}</span>
              </div>
            )}
            {lead.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{lead.email}</span>
              </div>
            )}
            {lead.location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{lead.location}</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lead Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(lead.budget_min || lead.budget_max) && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span>
                  ${lead.budget_min || 0} - ${lead.budget_max || 0}
                </span>
              </div>
            )}
            {lead.project_type && (
              <div>
                <span className="text-sm text-muted-foreground">Project Type: </span>
                <span className="capitalize">{lead.project_type}</span>
              </div>
            )}
            {lead.last_contacted_at && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Last contacted: {new Date(lead.last_contacted_at).toLocaleDateString()}
                </span>
              </div>
            )}
            {lead.notes && (
              <div>
                <span className="text-sm text-muted-foreground block mb-1">Notes:</span>
                <p className="text-sm">{lead.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities?.map((activity) => (
              <div key={activity.id} className="flex gap-3 p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="capitalize">
                      {activity.activity_type}
                    </Badge>
                    {activity.outcome && (
                      <Badge variant="secondary" className="capitalize">
                        {activity.outcome.replace("_", " ")}
                      </Badge>
                    )}
                  </div>
                  {activity.notes && <p className="text-sm text-muted-foreground">{activity.notes}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    By {(activity.profiles as any)?.full_name} on{" "}
                    {new Date(activity.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {(!activities || activities.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                No activities yet. Log your first activity to get started!
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Matching Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {matchings?.map((matching) => (
              <div key={matching.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{(matching.projects as any)?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(matching.projects as any)?.location} • $
                    {(matching.projects as any)?.price}
                  </p>
                </div>
                <Badge className="bg-primary">Score: {matching.score}%</Badge>
              </div>
            ))}
            {(!matchings || matchings.length === 0) && (
              <p className="text-center text-muted-foreground py-8">
                No matching projects yet. Generate matchings to see recommendations!
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <LeadDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        projects={projects || []}
        lead={lead}
      />

      <ActivityDialog
        open={activityDialogOpen}
        onOpenChange={setActivityDialogOpen}
        leadId={id!}
      />
    </div>
  );
}
