import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(200),
  description: z.string().max(2000).optional(),
  location: z.string().min(2, "Location is required").max(200),
  price: z.number().min(0, "Price must be positive").optional(),
  price_min: z.number().min(0, "Price must be positive").optional(),
  price_max: z.number().min(0, "Price must be positive").optional(),
  bedrooms: z.number().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  size_sqft: z.number().min(0).optional(),
  availability_date: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).refine((data) => {
  if (data.price_min && data.price_max) {
    return data.price_min <= data.price_max;
  }
  return true;
}, {
  message: "Min price must be less than or equal to max price",
  path: ["price_max"],
});

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: any;
}

export function ProjectDialog({ open, onOpenChange, project }: ProjectDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: project?.name || "",
    description: project?.description || "",
    project_type: project?.project_type || "apartment",
    location: project?.location || "",
    price: project?.price || "",
    price_min: project?.price_min || "",
    price_max: project?.price_max || "",
    bedrooms: project?.bedrooms || "",
    bathrooms: project?.bathrooms || "",
    size_sqft: project?.size_sqft || "",
    availability_date: project?.availability_date || "",
    tags: project?.tags?.join(", ") || "",
    is_active: project?.is_active ?? true,
  });

  const createProject = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("projects").insert({
        ...data,
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Project created successfully");
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create project");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      project_type: "apartment",
      location: "",
      price: "",
      price_min: "",
      price_max: "",
      bedrooms: "",
      bathrooms: "",
      size_sqft: "",
      availability_date: "",
      tags: "",
      is_active: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Parse tags
      const tagsArray = formData.tags
        ? formData.tags.split(",").map(t => t.trim()).filter(Boolean)
        : [];

      const validated = projectSchema.parse({
        name: formData.name,
        description: formData.description || undefined,
        location: formData.location,
        price: formData.price ? parseFloat(formData.price) : undefined,
        price_min: formData.price_min ? parseFloat(formData.price_min) : undefined,
        price_max: formData.price_max ? parseFloat(formData.price_max) : undefined,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : undefined,
        size_sqft: formData.size_sqft ? parseInt(formData.size_sqft) : undefined,
        availability_date: formData.availability_date || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
      });

      const submitData = {
        ...validated,
        project_type: formData.project_type,
        is_active: formData.is_active,
      };

      createProject.mutate(submitData);
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
          <DialogTitle>{project ? "Edit Project" : "Add New Project"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter project name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Describe the project..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="project_type">Project Type *</Label>
              <Select value={formData.project_type} onValueChange={(value) => setFormData({ ...formData, project_type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="apartment">Apartment</SelectItem>
                  <SelectItem value="house">House</SelectItem>
                  <SelectItem value="condo">Condo</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="land">Land</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="City or region"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_min">Min Price</Label>
              <Input
                id="price_min"
                type="number"
                value={formData.price_min}
                onChange={(e) => setFormData({ ...formData, price_min: e.target.value })}
                placeholder="Minimum price"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_max">Max Price</Label>
              <Input
                id="price_max"
                type="number"
                value={formData.price_max}
                onChange={(e) => setFormData({ ...formData, price_max: e.target.value })}
                placeholder="Maximum price"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Single Price (Legacy)</Label>
            <Input
              id="price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="Or enter single price"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="availability_date">Availability Date</Label>
            <Input
              id="availability_date"
              type="date"
              value={formData.availability_date}
              onChange={(e) => setFormData({ ...formData, availability_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g., luxury, downtown, new-build"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bedrooms">Bedrooms</Label>
              <Input
                id="bedrooms"
                type="number"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input
                id="bathrooms"
                type="number"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size_sqft">Size (sqft)</Label>
              <Input
                id="size_sqft"
                type="number"
                value={formData.size_sqft}
                onChange={(e) => setFormData({ ...formData, size_sqft: e.target.value })}
                placeholder="0"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {project ? "Update" : "Create"} Project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}