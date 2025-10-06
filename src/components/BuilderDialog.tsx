import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";

const builderSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  category: z.string(),
  cp_spoc_name: z.string().max(100).optional(),
  contact_number: z.string().regex(/^[+\d\s()-]+$/, "Invalid phone format").max(20).optional(),
  location: z.string().max(200).optional(),
  google_map_link: z.string().url("Invalid URL").optional().or(z.literal("")),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

interface BuilderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  builder?: any;
}

export function BuilderDialog({ open, onOpenChange, builder }: BuilderDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: builder?.name || "",
    category: builder?.category || "residential",
    cp_spoc_name: builder?.cp_spoc_name || "",
    contact_number: builder?.contact_number || "",
    location: builder?.location || "",
    google_map_link: builder?.google_map_link || "",
    latitude: builder?.latitude || "",
    longitude: builder?.longitude || "",
  });

  const createBuilder = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("builders").insert({
        ...data,
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["builders"] });
      toast.success("Builder created successfully");
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create builder");
    },
  });

  const updateBuilder = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("builders")
        .update(data)
        .eq("id", builder.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["builders"] });
      toast.success("Builder updated successfully");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update builder");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      category: "residential",
      cp_spoc_name: "",
      contact_number: "",
      location: "",
      google_map_link: "",
      latitude: "",
      longitude: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = builderSchema.parse({
        name: formData.name,
        category: formData.category,
        cp_spoc_name: formData.cp_spoc_name || undefined,
        contact_number: formData.contact_number || undefined,
        location: formData.location || undefined,
        google_map_link: formData.google_map_link || undefined,
        latitude: formData.latitude ? parseFloat(formData.latitude) : undefined,
        longitude: formData.longitude ? parseFloat(formData.longitude) : undefined,
      });

      if (builder) {
        updateBuilder.mutate(validated);
      } else {
        createBuilder.mutate(validated);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{builder ? "Edit Builder" : "Add New Builder"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Builder Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter builder name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="mixed">Mixed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cp_spoc_name">Contact Person (SPOC)</Label>
              <Input
                id="cp_spoc_name"
                value={formData.cp_spoc_name}
                onChange={(e) => setFormData({ ...formData, cp_spoc_name: e.target.value })}
                placeholder="Contact person name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_number">Contact Number</Label>
              <Input
                id="contact_number"
                value={formData.contact_number}
                onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="City or region"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="google_map_link">Google Maps Link</Label>
            <Input
              id="google_map_link"
              value={formData.google_map_link}
              onChange={(e) => setFormData({ ...formData, google_map_link: e.target.value })}
              placeholder="https://maps.google.com/..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                placeholder="40.7128"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                placeholder="-74.0060"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createBuilder.isPending || updateBuilder.isPending}>
              {builder ? "Update" : "Create"} Builder
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}