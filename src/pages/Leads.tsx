import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Upload, Search, X } from "lucide-react";
import { LeadDialog } from "@/components/LeadDialog";
import { LeadsTable } from "@/components/LeadsTable";
import { LeadsBulkUpload } from "@/components/LeadsBulkUpload";

export default function Leads() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  // Realtime subscription for leads
  useEffect(() => {
    const channel = supabase
      .channel("leads-page-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leads",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["leads"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: leads, isLoading } = useQuery({
    queryKey: ["leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, created_by_profile:profiles!created_by(full_name), assigned_profile:profiles!assigned_to(full_name)")
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

  // Filter leads based on search query
  const filteredLeads = (leads || []).filter((lead) => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      lead.name?.toLowerCase().includes(query) ||
      lead.phone?.toLowerCase().includes(query) ||
      lead.email?.toLowerCase().includes(query) ||
      lead.source?.toLowerCase().includes(query) ||
      lead.status?.toLowerCase().includes(query) ||
      lead.assigned_profile?.full_name?.toLowerCase().includes(query)
    );
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
          <Button variant="outline" onClick={() => setBulkUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Bulk Upload
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Name, Phone, Email, Source, Status, or Assigned To..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {searchQuery && (
          <div className="text-sm text-muted-foreground">
            {filteredLeads.length} result{filteredLeads.length !== 1 ? "s" : ""} found
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12">Loading leads...</div>
      ) : (
        <LeadsTable leads={filteredLeads} />
      )}

      <LeadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projects={projects || []}
      />
      
      <LeadsBulkUpload
        open={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["leads"] })}
      />
    </div>
  );
}
