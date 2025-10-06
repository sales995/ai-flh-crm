import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Building, MapPin, Phone } from "lucide-react";
import { BuilderDialog } from "@/components/BuilderDialog";
import { Badge } from "@/components/ui/badge";

export default function Builders() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Realtime subscription for builders
  useEffect(() => {
    const channel = supabase
      .channel("builders-page-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "builders",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["builders"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: builders, isLoading } = useQuery({
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Builders</h1>
          <p className="text-muted-foreground">
            Manage builder partners and developers
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Builder
        </Button>
      </div>

      {isLoading ? (
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

                {(builder.latitude && builder.longitude) && (
                  <div className="text-xs text-muted-foreground">
                    Coordinates: {builder.latitude}, {builder.longitude}
                  </div>
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

      <BuilderDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}