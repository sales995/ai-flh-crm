import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Plus, List, LayoutGrid } from "lucide-react";
import { LeadDialog } from "@/components/LeadDialog";
import { LeadsTable } from "@/components/LeadsTable";
import { LeadsKanban } from "@/components/LeadsKanban";
import { toast } from "sonner";

export default function Leads() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [view, setView] = useState<"list" | "kanban">("kanban");
  const queryClient = useQueryClient();

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, profiles:created_by(full_name), assigned_profile:assigned_to(full_name)")
        .order("created_at", { ascending: false });
      
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
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const updateLeadStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "new" | "contacted" | "qualified" | "interested" | "not_interested" | "converted" | "lost" }) => {
      const { error } = await supabase
        .from("leads")
        .update({ status })
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead status updated");
    },
    onError: () => {
      toast.error("Failed to update lead status");
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">
            Manage and track your sales leads
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "kanban" ? "default" : "outline"}
            size="icon"
            onClick={() => setView("kanban")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading leads...</div>
      ) : view === "list" ? (
        <LeadsTable leads={leads || []} />
      ) : (
        <LeadsKanban
          leads={leads || []}
          onStatusChange={(id, status) =>
            updateLeadStatus.mutate({ id, status })
          }
        />
      )}

      <LeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projects={projects || []}
      />
    </div>
  );
}
