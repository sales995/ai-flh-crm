import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  location: z.string().min(2).max(200),
  price: z.number().min(0).optional(),
  price_min: z.number().min(0).optional(),
  price_max: z.number().min(0).optional(),
  bedrooms: z.number().min(0).optional(),
  bathrooms: z.number().min(0).optional(),
  size_sqft: z.number().min(0).optional(),
  availability_date: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: any;
}

export function ProjectDialog({ open, onOpenChange, project }: ProjectDialogProps) {
  const queryClient = useQueryClient();
  
  const { data: builders } = useQuery({
    queryKey: ["builders"],
    queryFn: async () => {
      const { data } = await supabase.from("builders").select("*").order("name");
      return data || [];
    },
  });

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
    // Supply side fields
    builder_id: project?.builder_id || "",
    total_land_area: project?.total_land_area || "",
    total_units: project?.total_units || "",
    total_amenities: project?.total_amenities || "",
    construction_stage: project?.construction_stage || "planned",
    launch_date: project?.launch_date || "",
    rera_possession_date: project?.rera_possession_date || "",
    builder_possession_date: project?.builder_possession_date || "",
    brochure_link: project?.brochure_link || "",
    detailed_pricing_link: project?.detailed_pricing_link || "",
    price_per_sqft: project?.price_per_sqft || "",
    plot_range: project?.plot_range || "",
    price_range: project?.price_range || "",
    total_towers: project?.total_towers || "",
    number_of_floors: project?.number_of_floors || "",
    // Inventory
    inventory_1rk: project?.inventory_1rk || "",
    inventory_1bhk: project?.inventory_1bhk || "",
    inventory_1_5bhk: project?.inventory_1_5bhk || "",
    inventory_2bhk: project?.inventory_2bhk || "",
    inventory_2bhk_1t: project?.inventory_2bhk_1t || "",
    inventory_2_5bhk: project?.inventory_2_5bhk || "",
    inventory_3bhk: project?.inventory_3bhk || "",
    inventory_3bhk_2t: project?.inventory_3bhk_2t || "",
    inventory_4bhk: project?.inventory_4bhk || "",
    inventory_5bhk: project?.inventory_5bhk || "",
    // Pricing
    starting_price_1rk: project?.starting_price_1rk || "",
    starting_price_1bhk: project?.starting_price_1bhk || "",
    starting_price_1_5bhk: project?.starting_price_1_5bhk || "",
    starting_price_2bhk: project?.starting_price_2bhk || "",
    starting_price_2_5bhk: project?.starting_price_2_5bhk || "",
    starting_price_3bhk: project?.starting_price_3bhk || "",
    starting_price_4bhk: project?.starting_price_4bhk || "",
    starting_price_5bhk: project?.starting_price_5bhk || "",
    // Villa/Plot
    villa_type: project?.villa_type || "",
    structure: project?.structure || "",
    starting_size_2bhk: project?.starting_size_2bhk || "",
    starting_size_3bhk: project?.starting_size_3bhk || "",
    starting_size_4bhk: project?.starting_size_4bhk || "",
    starting_size_5bhk: project?.starting_size_5bhk || "",
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
      builder_id: "",
      total_land_area: "",
      total_units: "",
      total_amenities: "",
      construction_stage: "planned",
      launch_date: "",
      rera_possession_date: "",
      builder_possession_date: "",
      brochure_link: "",
      detailed_pricing_link: "",
      price_per_sqft: "",
      plot_range: "",
      price_range: "",
      total_towers: "",
      number_of_floors: "",
      inventory_1rk: "",
      inventory_1bhk: "",
      inventory_1_5bhk: "",
      inventory_2bhk: "",
      inventory_2bhk_1t: "",
      inventory_2_5bhk: "",
      inventory_3bhk: "",
      inventory_3bhk_2t: "",
      inventory_4bhk: "",
      inventory_5bhk: "",
      starting_price_1rk: "",
      starting_price_1bhk: "",
      starting_price_1_5bhk: "",
      starting_price_2bhk: "",
      starting_price_2_5bhk: "",
      starting_price_3bhk: "",
      starting_price_4bhk: "",
      starting_price_5bhk: "",
      villa_type: "",
      structure: "",
      starting_size_2bhk: "",
      starting_size_3bhk: "",
      starting_size_4bhk: "",
      starting_size_5bhk: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const tagsArray = formData.tags
        ? formData.tags.split(",").map(t => t.trim()).filter(Boolean)
        : [];

      const submitData = {
        name: formData.name,
        description: formData.description || null,
        project_type: formData.project_type,
        location: formData.location,
        price: formData.price ? parseFloat(formData.price) : null,
        price_min: formData.price_min ? parseFloat(formData.price_min) : null,
        price_max: formData.price_max ? parseFloat(formData.price_max) : null,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        size_sqft: formData.size_sqft ? parseInt(formData.size_sqft) : null,
        availability_date: formData.availability_date || null,
        tags: tagsArray.length > 0 ? tagsArray : null,
        is_active: formData.is_active,
        // Supply fields
        builder_id: formData.builder_id || null,
        total_land_area: formData.total_land_area ? parseFloat(formData.total_land_area) : null,
        total_units: formData.total_units ? parseInt(formData.total_units) : null,
        total_amenities: formData.total_amenities ? parseInt(formData.total_amenities) : null,
        construction_stage: formData.construction_stage || null,
        launch_date: formData.launch_date || null,
        rera_possession_date: formData.rera_possession_date || null,
        builder_possession_date: formData.builder_possession_date || null,
        brochure_link: formData.brochure_link || null,
        detailed_pricing_link: formData.detailed_pricing_link || null,
        price_per_sqft: formData.price_per_sqft ? parseFloat(formData.price_per_sqft) : null,
        plot_range: formData.plot_range || null,
        price_range: formData.price_range || null,
        total_towers: formData.total_towers ? parseInt(formData.total_towers) : null,
        number_of_floors: formData.number_of_floors ? parseInt(formData.number_of_floors) : null,
        // Inventory
        inventory_1rk: formData.inventory_1rk ? parseInt(formData.inventory_1rk) : 0,
        inventory_1bhk: formData.inventory_1bhk ? parseInt(formData.inventory_1bhk) : 0,
        inventory_1_5bhk: formData.inventory_1_5bhk ? parseInt(formData.inventory_1_5bhk) : 0,
        inventory_2bhk: formData.inventory_2bhk ? parseInt(formData.inventory_2bhk) : 0,
        inventory_2bhk_1t: formData.inventory_2bhk_1t ? parseInt(formData.inventory_2bhk_1t) : 0,
        inventory_2_5bhk: formData.inventory_2_5bhk ? parseInt(formData.inventory_2_5bhk) : 0,
        inventory_3bhk: formData.inventory_3bhk ? parseInt(formData.inventory_3bhk) : 0,
        inventory_3bhk_2t: formData.inventory_3bhk_2t ? parseInt(formData.inventory_3bhk_2t) : 0,
        inventory_4bhk: formData.inventory_4bhk ? parseInt(formData.inventory_4bhk) : 0,
        inventory_5bhk: formData.inventory_5bhk ? parseInt(formData.inventory_5bhk) : 0,
        // Pricing
        starting_price_1rk: formData.starting_price_1rk ? parseFloat(formData.starting_price_1rk) : null,
        starting_price_1bhk: formData.starting_price_1bhk ? parseFloat(formData.starting_price_1bhk) : null,
        starting_price_1_5bhk: formData.starting_price_1_5bhk ? parseFloat(formData.starting_price_1_5bhk) : null,
        starting_price_2bhk: formData.starting_price_2bhk ? parseFloat(formData.starting_price_2bhk) : null,
        starting_price_2_5bhk: formData.starting_price_2_5bhk ? parseFloat(formData.starting_price_2_5bhk) : null,
        starting_price_3bhk: formData.starting_price_3bhk ? parseFloat(formData.starting_price_3bhk) : null,
        starting_price_4bhk: formData.starting_price_4bhk ? parseFloat(formData.starting_price_4bhk) : null,
        starting_price_5bhk: formData.starting_price_5bhk ? parseFloat(formData.starting_price_5bhk) : null,
        // Villa
        villa_type: formData.villa_type || null,
        structure: formData.structure || null,
        starting_size_2bhk: formData.starting_size_2bhk ? parseFloat(formData.starting_size_2bhk) : null,
        starting_size_3bhk: formData.starting_size_3bhk ? parseFloat(formData.starting_size_3bhk) : null,
        starting_size_4bhk: formData.starting_size_4bhk ? parseFloat(formData.starting_size_4bhk) : null,
        starting_size_5bhk: formData.starting_size_5bhk ? parseFloat(formData.starting_size_5bhk) : null,
      };

      createProject.mutate(submitData);
    } catch (error) {
      toast.error("Failed to submit project");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "Add New Project"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="supply">Supply Info</TabsTrigger>
              <TabsTrigger value="inventory">Inventory</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bedrooms">Bedrooms</Label>
                  <Input
                    id="bedrooms"
                    type="number"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bathrooms">Bathrooms</Label>
                  <Input
                    id="bathrooms"
                    type="number"
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="size_sqft">Size (sqft)</Label>
                  <Input
                    id="size_sqft"
                    type="number"
                    value={formData.size_sqft}
                    onChange={(e) => setFormData({ ...formData, size_sqft: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="luxury, downtown, new-build"
                />
              </div>
            </TabsContent>

            <TabsContent value="supply" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="builder_id">Builder</Label>
                <Select value={formData.builder_id} onValueChange={(value) => setFormData({ ...formData, builder_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select builder" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    {builders?.map((builder) => (
                      <SelectItem key={builder.id} value={builder.id}>
                        {builder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="construction_stage">Construction Stage</Label>
                  <Select value={formData.construction_stage} onValueChange={(value) => setFormData({ ...formData, construction_stage: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover z-50">
                      <SelectItem value="planned">Planned</SelectItem>
                      <SelectItem value="under_construction">Under Construction</SelectItem>
                      <SelectItem value="ready">Ready</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_units">Total Units</Label>
                  <Input
                    id="total_units"
                    type="number"
                    value={formData.total_units}
                    onChange={(e) => setFormData({ ...formData, total_units: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_land_area">Total Land Area (sqft)</Label>
                  <Input
                    id="total_land_area"
                    type="number"
                    value={formData.total_land_area}
                    onChange={(e) => setFormData({ ...formData, total_land_area: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_amenities">Total Amenities</Label>
                  <Input
                    id="total_amenities"
                    type="number"
                    value={formData.total_amenities}
                    onChange={(e) => setFormData({ ...formData, total_amenities: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="launch_date">Launch Date</Label>
                  <Input
                    id="launch_date"
                    type="date"
                    value={formData.launch_date}
                    onChange={(e) => setFormData({ ...formData, launch_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rera_possession_date">RERA Possession</Label>
                  <Input
                    id="rera_possession_date"
                    type="date"
                    value={formData.rera_possession_date}
                    onChange={(e) => setFormData({ ...formData, rera_possession_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="builder_possession_date">Builder Possession</Label>
                  <Input
                    id="builder_possession_date"
                    type="date"
                    value={formData.builder_possession_date}
                    onChange={(e) => setFormData({ ...formData, builder_possession_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="brochure_link">Brochure Link</Label>
                  <Input
                    id="brochure_link"
                    value={formData.brochure_link}
                    onChange={(e) => setFormData({ ...formData, brochure_link: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="detailed_pricing_link">Pricing Link</Label>
                  <Input
                    id="detailed_pricing_link"
                    value={formData.detailed_pricing_link}
                    onChange={(e) => setFormData({ ...formData, detailed_pricing_link: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="total_towers">Total Towers</Label>
                  <Input
                    id="total_towers"
                    type="number"
                    value={formData.total_towers}
                    onChange={(e) => setFormData({ ...formData, total_towers: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="number_of_floors">Number of Floors</Label>
                  <Input
                    id="number_of_floors"
                    type="number"
                    value={formData.number_of_floors}
                    onChange={(e) => setFormData({ ...formData, number_of_floors: e.target.value })}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="inventory" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>1 RK</Label>
                  <Input
                    type="number"
                    value={formData.inventory_1rk}
                    onChange={(e) => setFormData({ ...formData, inventory_1rk: e.target.value })}
                    placeholder="Units"
                  />
                </div>
                <div className="space-y-2">
                  <Label>1 BHK</Label>
                  <Input
                    type="number"
                    value={formData.inventory_1bhk}
                    onChange={(e) => setFormData({ ...formData, inventory_1bhk: e.target.value })}
                    placeholder="Units"
                  />
                </div>
                <div className="space-y-2">
                  <Label>1.5 BHK</Label>
                  <Input
                    type="number"
                    value={formData.inventory_1_5bhk}
                    onChange={(e) => setFormData({ ...formData, inventory_1_5bhk: e.target.value })}
                    placeholder="Units"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>2 BHK</Label>
                  <Input
                    type="number"
                    value={formData.inventory_2bhk}
                    onChange={(e) => setFormData({ ...formData, inventory_2bhk: e.target.value })}
                    placeholder="Units"
                  />
                </div>
                <div className="space-y-2">
                  <Label>2 BHK + 1T</Label>
                  <Input
                    type="number"
                    value={formData.inventory_2bhk_1t}
                    onChange={(e) => setFormData({ ...formData, inventory_2bhk_1t: e.target.value })}
                    placeholder="Units"
                  />
                </div>
                <div className="space-y-2">
                  <Label>2.5 BHK</Label>
                  <Input
                    type="number"
                    value={formData.inventory_2_5bhk}
                    onChange={(e) => setFormData({ ...formData, inventory_2_5bhk: e.target.value })}
                    placeholder="Units"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>3 BHK</Label>
                  <Input
                    type="number"
                    value={formData.inventory_3bhk}
                    onChange={(e) => setFormData({ ...formData, inventory_3bhk: e.target.value })}
                    placeholder="Units"
                  />
                </div>
                <div className="space-y-2">
                  <Label>3 BHK + 2T</Label>
                  <Input
                    type="number"
                    value={formData.inventory_3bhk_2t}
                    onChange={(e) => setFormData({ ...formData, inventory_3bhk_2t: e.target.value })}
                    placeholder="Units"
                  />
                </div>
                <div className="space-y-2">
                  <Label>4 BHK</Label>
                  <Input
                    type="number"
                    value={formData.inventory_4bhk}
                    onChange={(e) => setFormData({ ...formData, inventory_4bhk: e.target.value })}
                    placeholder="Units"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Villa Type</Label>
                  <Input
                    value={formData.villa_type}
                    onChange={(e) => setFormData({ ...formData, villa_type: e.target.value })}
                    placeholder="e.g., Independent, Row House"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Structure</Label>
                  <Input
                    value={formData.structure}
                    onChange={(e) => setFormData({ ...formData, structure: e.target.value })}
                    placeholder="e.g., RCC, Steel Frame"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price_min">Min Price</Label>
                  <Input
                    id="price_min"
                    type="number"
                    value={formData.price_min}
                    onChange={(e) => setFormData({ ...formData, price_min: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_max">Max Price</Label>
                  <Input
                    id="price_max"
                    type="number"
                    value={formData.price_max}
                    onChange={(e) => setFormData({ ...formData, price_max: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price_per_sqft">Price per Sqft</Label>
                  <Input
                    id="price_per_sqft"
                    type="number"
                    value={formData.price_per_sqft}
                    onChange={(e) => setFormData({ ...formData, price_per_sqft: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_range">Price Range (text)</Label>
                  <Input
                    id="price_range"
                    value={formData.price_range}
                    onChange={(e) => setFormData({ ...formData, price_range: e.target.value })}
                    placeholder="e.g., $500K - $2M"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Starting Prices by Configuration</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">1 RK Starting Price</Label>
                    <Input
                      type="number"
                      value={formData.starting_price_1rk}
                      onChange={(e) => setFormData({ ...formData, starting_price_1rk: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">1 BHK Starting Price</Label>
                    <Input
                      type="number"
                      value={formData.starting_price_1bhk}
                      onChange={(e) => setFormData({ ...formData, starting_price_1bhk: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">2 BHK Starting Price</Label>
                    <Input
                      type="number"
                      value={formData.starting_price_2bhk}
                      onChange={(e) => setFormData({ ...formData, starting_price_2bhk: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">3 BHK Starting Price</Label>
                    <Input
                      type="number"
                      value={formData.starting_price_3bhk}
                      onChange={(e) => setFormData({ ...formData, starting_price_3bhk: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">4 BHK Starting Price</Label>
                    <Input
                      type="number"
                      value={formData.starting_price_4bhk}
                      onChange={(e) => setFormData({ ...formData, starting_price_4bhk: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">5 BHK Starting Price</Label>
                    <Input
                      type="number"
                      value={formData.starting_price_5bhk}
                      onChange={(e) => setFormData({ ...formData, starting_price_5bhk: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-base font-semibold">Starting Sizes (sqft)</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">2 BHK Size</Label>
                    <Input
                      type="number"
                      value={formData.starting_size_2bhk}
                      onChange={(e) => setFormData({ ...formData, starting_size_2bhk: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">3 BHK Size</Label>
                    <Input
                      type="number"
                      value={formData.starting_size_3bhk}
                      onChange={(e) => setFormData({ ...formData, starting_size_3bhk: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">4 BHK Size</Label>
                    <Input
                      type="number"
                      value={formData.starting_size_4bhk}
                      onChange={(e) => setFormData({ ...formData, starting_size_4bhk: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">5 BHK Size</Label>
                    <Input
                      type="number"
                      value={formData.starting_size_5bhk}
                      onChange={(e) => setFormData({ ...formData, starting_size_5bhk: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6">
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