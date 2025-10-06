import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Upload, Building, MapPin, Phone } from "lucide-react";
import { BuilderDialog } from "@/components/BuilderDialog";
import { ProjectDialog } from "@/components/ProjectDialog";
import { BuildersBulkUpload } from "@/components/BuildersBulkUpload";
import { ProjectsBulkUpload } from "@/components/ProjectsBulkUpload";
import { ProjectsTable } from "@/components/ProjectsTable";
import { Badge } from "@/components/ui/badge";

export default function Supply() {
  const [builderDialogOpen, setBuilderDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [builderBulkUploadOpen, setBuilderBulkUploadOpen] = useState(false);
  const [projectBulkUploadOpen, setProjectBulkUploadOpen] = useState(false);
  const queryClient = useQueryClient();

  // Realtime subscriptions
  useEffect(() => {
    const buildersChannel = supabase
      .channel("supply-builders-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "builders" }, () => {
        queryClient.invalidateQueries({ queryKey: ["builders"] });
      })
      .subscribe();

    const projectsChannel = supabase
      .channel("supply-projects-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "projects" }, () => {
        queryClient.invalidateQueries({ queryKey: ["projects"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(buildersChannel);
      supabase.removeChannel(projectsChannel);
    };
  }, [queryClient]);

  const { data: builders, isLoading: buildersLoading } = useQuery({
    queryKey: ["builders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("builders")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const { data: projects, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, profiles:created_by(full_name)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Supply Management</h1>
        <p className="text-muted-foreground">
          Manage builders and their projects
        </p>
      </div>

      <Tabs defaultValue="builders" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="builders">Builders</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        {/* Builders Tab */}
        <TabsContent value="builders" className="space-y-6">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setBuilderBulkUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </Button>
            <Button onClick={() => setBuilderDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Builder
            </Button>
          </div>

          {buildersLoading ? (
            <div className="text-center py-12">Loading builders...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {builders?.map((builder) => (
                <Card key={builder.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-primary">
                  <CardContent className="p-6 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">{builder.name}</h3>
                      </div>
                      <Badge variant="secondary" className="capitalize">
                        {builder.category || "N/A"}
                      </Badge>
                    </div>

                    {builder.cp_spoc_name && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">SPOC: </span>
                        <span className="font-medium">{builder.cp_spoc_name}</span>
                      </div>
                    )}

                    {builder.contact_number && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{builder.contact_number}</span>
                      </div>
                    )}

                    {builder.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{builder.location}</span>
                      </div>
                    )}

                    {builder.google_map_link && (
                      <a
                        href={builder.google_map_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline block"
                      >
                        View on Google Maps →
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
              {(!builders || builders.length === 0) && (
                <Card className="col-span-full">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No builders added yet. Click "Add Builder" to create your first builder profile!
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-6">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setProjectBulkUploadOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </Button>
            <Button onClick={() => setProjectDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          </div>

          {projectsLoading ? (
            <div className="text-center py-12">Loading projects...</div>
          ) : (
            <ProjectsTable projects={projects || []} />
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <BuilderDialog open={builderDialogOpen} onOpenChange={setBuilderDialogOpen} />
      <ProjectDialog open={projectDialogOpen} onOpenChange={setProjectDialogOpen} />
      
      <BuildersBulkUpload
        open={builderBulkUploadOpen}
        onOpenChange={setBuilderBulkUploadOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["builders"] })}
      />
      
      <ProjectsBulkUpload
        open={projectBulkUploadOpen}
        onOpenChange={setProjectBulkUploadOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["projects"] })}
      />
    </div>
  );
}
