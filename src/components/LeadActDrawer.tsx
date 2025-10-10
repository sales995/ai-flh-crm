import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Phone, User, Clock, Activity, Building2, Plus, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface LeadActDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
}

interface LocationWithRadius {
  location: string;
  radius_km: number;
}

export function LeadActDrawer({ open, onOpenChange, leadId }: LeadActDrawerProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("call");

  // Fetch lead data
  const { data: lead } = useQuery({
    queryKey: ["lead-detail", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, profiles:created_by(full_name), assigned_profile:assigned_to(full_name)")
        .eq("id", leadId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch lead details
  const { data: leadDetails } = useQuery({
    queryKey: ["lead-details", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_details")
        .select("*")
        .eq("lead_id", leadId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch activities
  const { data: activities } = useQuery({
    queryKey: ["lead-activities", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activities")
        .select("*, profiles:created_by(full_name)")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch external actions
  const { data: externalActions } = useQuery({
    queryKey: ["external-actions", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("external_actions")
        .select("*")
        .eq("lead_id", leadId)
        .order("action_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Call Information State
  const [callInfo, setCallInfo] = useState({
    calling_status: "",
    call_date: "",
    call_time: "",
    attempts: lead?.attempt_count || 0,
  });

  // Parse preferred locations properly
  const parsePreferredLocations = (locations: any): LocationWithRadius[] => {
    if (!locations) return [{ location: "", radius_km: 0 }];
    if (Array.isArray(locations)) {
      // Handle jsonb array
      return locations.map(loc => {
        if (typeof loc === 'object' && loc.location) {
          return { location: loc.location, radius_km: loc.radius_km || 0 };
        }
        return { location: String(loc), radius_km: 0 };
      });
    }
    return [{ location: "", radius_km: 0 }];
  };

  // Customer Assessment State
  const [assessment, setAssessment] = useState({
    // Buyer Intent
    primary_purchase_objective: leadDetails?.primary_purchase_objective || "",
    buying_for: leadDetails?.buying_for || "",
    specify_buying_for: leadDetails?.specify_buying_for || "",
    occupation: leadDetails?.occupation || "",
    
    // Location Preferences (up to 3)
    locations: parsePreferredLocations(leadDetails?.preferred_locations),
    
    // Property Preferences
    property_type: leadDetails?.property_type || "",
    size_sqft: leadDetails?.size_sqft || "",
    bhk: leadDetails?.bhk || "",
    facing: leadDetails?.facing || "",
    floor_preference: leadDetails?.floor_preference || "",
    food_preference: leadDetails?.food_preference || "",
    
    // Financial Assessment
    budget_min: leadDetails?.budget_min || "",
    budget_max: leadDetails?.budget_max || "",
    budget_flexibility: leadDetails?.budget_flexibility || "",
    expected_rental_yield: leadDetails?.expected_rental_yield || "",
    expected_appreciation_percent: leadDetails?.expected_appreciation_percent || "",
    investment_horizon_months: leadDetails?.investment_horizon_months || "",
    
    // Decision Criteria
    priority: leadDetails?.priority || "",
    minimum_requirement: leadDetails?.minimum_requirement || "",
    additional_requirements: leadDetails?.additional_requirements || "",
    
    // Internal Assessment
    pressure_point: leadDetails?.pressure_point || "",
  });

  // Update assessment when leadDetails changes
  useEffect(() => {
    if (leadDetails) {
      setAssessment({
        primary_purchase_objective: leadDetails.primary_purchase_objective || "",
        buying_for: leadDetails.buying_for || "",
        specify_buying_for: leadDetails.specify_buying_for || "",
        occupation: leadDetails.occupation || "",
        locations: parsePreferredLocations(leadDetails.preferred_locations),
        property_type: leadDetails.property_type || "",
        size_sqft: leadDetails.size_sqft || "",
        bhk: leadDetails.bhk || "",
        facing: leadDetails.facing || "",
        floor_preference: leadDetails.floor_preference || "",
        food_preference: leadDetails.food_preference || "",
        budget_min: leadDetails.budget_min || "",
        budget_max: leadDetails.budget_max || "",
        budget_flexibility: leadDetails.budget_flexibility || "",
        expected_rental_yield: leadDetails.expected_rental_yield || "",
        expected_appreciation_percent: leadDetails.expected_appreciation_percent || "",
        investment_horizon_months: leadDetails.investment_horizon_months || "",
        priority: leadDetails.priority || "",
        minimum_requirement: leadDetails.minimum_requirement || "",
        additional_requirements: leadDetails.additional_requirements || "",
        pressure_point: leadDetails.pressure_point || "",
      });
    }
  }, [leadDetails]);

  // External Action State
  const [externalAction, setExternalAction] = useState({
    builder_name: "",
    project_name: "",
    action_taken: "",
    notes: "",
  });

  // Status & Follow-up State
  const [statusInfo, setStatusInfo] = useState({
    status: (lead?.status || "new") as "new" | "contacted" | "reached" | "qualified" | "interested" | "site_visit_scheduled" | "site_visit_rescheduled" | "site_visit_completed" | "not_interested" | "converted" | "lost" | "junk",
    next_followup_date: lead?.next_followup_date || "",
    notes: "",
  });

  // Location Management Functions
  const addLocation = () => {
    if (assessment.locations.length < 3) {
      setAssessment({
        ...assessment,
        locations: [...assessment.locations, { location: "", radius_km: 0 }]
      });
    }
  };

  const removeLocation = (index: number) => {
    if (assessment.locations.length > 1) {
      setAssessment({
        ...assessment,
        locations: assessment.locations.filter((_, i) => i !== index)
      });
    }
  };

  const updateLocation = (index: number, field: 'location' | 'radius_km', value: string | number) => {
    const newLocations = [...assessment.locations];
    newLocations[index] = { ...newLocations[index], [field]: value };
    setAssessment({ ...assessment, locations: newLocations });
  };

  // Save call activity
  const logCallActivity = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: activityError } = await supabase.from("activities").insert({
        lead_id: leadId,
        activity_type: "call",
        notes: `${callInfo.calling_status} - ${callInfo.attempts} attempts`,
        completed_at: `${callInfo.call_date}T${callInfo.call_time}`,
        created_by: user.id,
      });

      if (activityError) throw activityError;

      const { error: leadError } = await supabase
        .from("leads")
        .update({
          attempt_count: lead.attempt_count + 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", leadId);

      if (leadError) throw leadError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-activities", leadId] });
      queryClient.invalidateQueries({ queryKey: ["lead-detail", leadId] });
      toast.success("Call activity logged");
    },
  });

  // Save assessment
  const saveAssessment = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Filter out empty locations
      const validLocations = assessment.locations.filter(loc => loc.location.trim() !== "");

      // Check if lead_details exists
      const { data: existing } = await supabase
        .from("lead_details")
        .select("id")
        .eq("lead_id", leadId)
        .maybeSingle();

      const payload = {
        lead_id: leadId,
        primary_purchase_objective: assessment.primary_purchase_objective,
        buying_for: assessment.buying_for,
        specify_buying_for: assessment.specify_buying_for,
        occupation: assessment.occupation,
        preferred_locations: validLocations as any,
        property_type: assessment.property_type,
        size_sqft: assessment.size_sqft ? parseInt(String(assessment.size_sqft)) : null,
        bhk: assessment.bhk,
        facing: assessment.facing,
        floor_preference: assessment.floor_preference,
        food_preference: assessment.food_preference,
        budget_min: assessment.budget_min ? parseFloat(String(assessment.budget_min)) : null,
        budget_max: assessment.budget_max ? parseFloat(String(assessment.budget_max)) : null,
        budget_flexibility: assessment.budget_flexibility,
        expected_rental_yield: assessment.expected_rental_yield ? parseFloat(String(assessment.expected_rental_yield)) : null,
        expected_appreciation_percent: assessment.expected_appreciation_percent ? parseFloat(String(assessment.expected_appreciation_percent)) : null,
        investment_horizon_months: assessment.investment_horizon_months ? parseInt(String(assessment.investment_horizon_months)) : null,
        priority: assessment.priority,
        minimum_requirement: assessment.minimum_requirement,
        additional_requirements: assessment.additional_requirements,
        pressure_point: assessment.pressure_point,
        last_assessed_at: new Date().toISOString(),
      };

      let error;
      if (existing) {
        // Update existing record
        const result = await supabase
          .from("lead_details")
          .update(payload as any)
          .eq("lead_id", leadId);
        error = result.error;
      } else {
        // Insert new record
        const result = await supabase
          .from("lead_details")
          .insert(payload as any);
        error = result.error;
      }

      if (error) throw error;

      // Log activity for assessment
      await supabase.from("activities").insert({
        lead_id: leadId,
        activity_type: "note",
        notes: "Buyer Assessment Updated",
        created_by: user.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-details", leadId] });
      queryClient.invalidateQueries({ queryKey: ["lead-activities", leadId] });
      toast.success("Assessment saved successfully");
    },
  });

  // Log external action
  const logExternalAction = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("external_actions").insert({
        lead_id: leadId,
        builder_name: externalAction.builder_name,
        project_name: externalAction.project_name,
        action_taken: externalAction.action_taken,
        notes: externalAction.notes,
        created_by: user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["external-actions", leadId] });
      queryClient.invalidateQueries({ queryKey: ["lead-activities", leadId] });
      toast.success("External action logged");
      setExternalAction({ builder_name: "", project_name: "", action_taken: "", notes: "" });
    },
  });

  // Update status and follow-up
  const updateStatus = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: leadError } = await supabase
        .from("leads")
        .update({
          status: statusInfo.status as any,
          next_followup_date: statusInfo.next_followup_date || null,
        })
        .eq("id", leadId);

      if (leadError) throw leadError;

      if (statusInfo.notes) {
        const { error: activityError } = await supabase.from("activities").insert({
          lead_id: leadId,
          activity_type: "note",
          notes: statusInfo.notes,
          created_by: user.id,
        });

        if (activityError) throw activityError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-detail", leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-activities", leadId] });
      toast.success("Status updated");
      setStatusInfo({ ...statusInfo, notes: "" });
    },
  });

  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Lead Activity & Details</SheetTitle>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="font-medium">{lead.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <span>{lead.phone}</span>
            </div>
            {lead.email && <div className="text-muted-foreground">{lead.email}</div>}
          </div>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="call">Call</TabsTrigger>
            <TabsTrigger value="assessment">Assessment</TabsTrigger>
            <TabsTrigger value="external">External</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          {/* Call Information Tab */}
          <TabsContent value="call" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Calling Status</Label>
                <Select
                  value={callInfo.calling_status}
                  onValueChange={(value) =>
                    setCallInfo({ ...callInfo, calling_status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consulted">Consulted</SelectItem>
                    <SelectItem value="asked_for_reconnect">Asked for Reconnect</SelectItem>
                    <SelectItem value="rnr_swo">RNR-SWO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Call Date</Label>
                  <Input
                    type="date"
                    value={callInfo.call_date}
                    onChange={(e) => setCallInfo({ ...callInfo, call_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Call Time</Label>
                  <Input
                    type="time"
                    value={callInfo.call_time}
                    onChange={(e) => setCallInfo({ ...callInfo, call_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Number of Attempts</Label>
                <Input type="number" value={lead.attempt_count || 0} disabled />
              </div>

              <Button
                onClick={() => logCallActivity.mutate()}
                disabled={logCallActivity.isPending}
                className="w-full"
              >
                Log Call Activity
              </Button>
            </div>
          </TabsContent>

          {/* Customer Assessment Tab */}
          <TabsContent value="assessment" className="space-y-6">
            <div className="space-y-6">
              {/* Buyer Intent Section */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">🟣 Buyer Intent & Profile</h3>
                
                <div className="space-y-2">
                  <Label>Primary Purchase Objective *</Label>
                  <Select
                    value={assessment.primary_purchase_objective}
                    onValueChange={(value) =>
                      setAssessment({ ...assessment, primary_purchase_objective: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select objective" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="end_use">End Use (For Self)</SelectItem>
                      <SelectItem value="investment">Investment Purpose</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Buying On Behalf Of</Label>
                  <Select
                    value={assessment.buying_for}
                    onValueChange={(value) =>
                      setAssessment({ ...assessment, buying_for: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self">Self</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {assessment.buying_for === "other" && (
                  <div className="space-y-2">
                    <Label>For Whom? (Specify)</Label>
                    <Input
                      value={assessment.specify_buying_for}
                      onChange={(e) =>
                        setAssessment({ ...assessment, specify_buying_for: e.target.value })
                      }
                      placeholder="e.g., Parents, Children, Relative"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Occupation</Label>
                  <Input
                    value={assessment.occupation}
                    onChange={(e) => setAssessment({ ...assessment, occupation: e.target.value })}
                    placeholder="Job title or business type"
                  />
                </div>
              </div>

              <Separator />

              {/* Preferred Location Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">🟢 Preferred Locations (with Radius)</h3>
                  {assessment.locations.length < 3 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLocation}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Location
                    </Button>
                  )}
                </div>

                {assessment.locations.map((loc, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-7 space-y-2">
                      <Label>Preferred Location {index + 1}</Label>
                      <Input
                        value={loc.location}
                        onChange={(e) => updateLocation(index, 'location', e.target.value)}
                        placeholder="e.g., Perungalathur"
                      />
                    </div>
                    <div className="col-span-4 space-y-2">
                      <Label>Radius (km)</Label>
                      <Input
                        type="number"
                        value={loc.radius_km || ""}
                        onChange={(e) => updateLocation(index, 'radius_km', parseFloat(e.target.value) || 0)}
                        placeholder="5"
                      />
                    </div>
                    {assessment.locations.length > 1 && (
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLocation(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <Separator />

              {/* Property & Lifestyle Preferences */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">🟡 Property & Lifestyle Preferences</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Property Type</Label>
                    <Select
                      value={assessment.property_type}
                      onValueChange={(value) =>
                        setAssessment({ ...assessment, property_type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat</SelectItem>
                        <SelectItem value="villa">Villa</SelectItem>
                        <SelectItem value="plot">Plot</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Size (sq.ft)</Label>
                    <Input
                      type="number"
                      value={assessment.size_sqft}
                      onChange={(e) => setAssessment({ ...assessment, size_sqft: e.target.value })}
                      placeholder="1200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>BHK</Label>
                    <Select
                      value={assessment.bhk}
                      onValueChange={(value) => setAssessment({ ...assessment, bhk: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select BHK" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 BHK</SelectItem>
                        <SelectItem value="2">2 BHK</SelectItem>
                        <SelectItem value="3">3 BHK</SelectItem>
                        <SelectItem value="4">4 BHK</SelectItem>
                        <SelectItem value="5">5 BHK</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Facing</Label>
                    <Select
                      value={assessment.facing}
                      onValueChange={(value) => setAssessment({ ...assessment, facing: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select facing" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="east">East</SelectItem>
                        <SelectItem value="west">West</SelectItem>
                        <SelectItem value="north">North</SelectItem>
                        <SelectItem value="south">South</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Floor Preference</Label>
                    <Select
                      value={assessment.floor_preference}
                      onValueChange={(value) =>
                        setAssessment({ ...assessment, floor_preference: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select floor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ground">Ground</SelectItem>
                        <SelectItem value="middle">Middle</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Food Preference</Label>
                    <Select
                      value={assessment.food_preference}
                      onValueChange={(value) =>
                        setAssessment({ ...assessment, food_preference: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select preference" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="veg">Veg</SelectItem>
                        <SelectItem value="non_veg">Non-Veg</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Financial Assessment */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">🟠 Financial Assessment</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Minimum Budget (₹)</Label>
                    <Input
                      type="number"
                      value={assessment.budget_min}
                      onChange={(e) => setAssessment({ ...assessment, budget_min: e.target.value })}
                      placeholder="8000000"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Maximum Budget (₹)</Label>
                    <Input
                      type="number"
                      value={assessment.budget_max}
                      onChange={(e) => setAssessment({ ...assessment, budget_max: e.target.value })}
                      placeholder="10000000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Budget Flexibility</Label>
                  <Input
                    value={assessment.budget_flexibility}
                    onChange={(e) =>
                      setAssessment({ ...assessment, budget_flexibility: e.target.value })
                    }
                    placeholder="e.g., Can stretch 10% if location is prime"
                  />
                </div>

                {assessment.primary_purchase_objective === "investment" && (
                  <>
                    <div className="space-y-2">
                      <Label>Expected ROI (Rental Yield per Month) ₹</Label>
                      <Input
                        type="number"
                        value={assessment.expected_rental_yield}
                        onChange={(e) =>
                          setAssessment({ ...assessment, expected_rental_yield: e.target.value })
                        }
                        placeholder="35000"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Expected Appreciation (%)</Label>
                        <Input
                          type="number"
                          value={assessment.expected_appreciation_percent}
                          onChange={(e) =>
                            setAssessment({ ...assessment, expected_appreciation_percent: e.target.value })
                          }
                          placeholder="12"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Investment Horizon (Months)</Label>
                        <Input
                          type="number"
                          value={assessment.investment_horizon_months}
                          onChange={(e) =>
                            setAssessment({ ...assessment, investment_horizon_months: e.target.value })
                          }
                          placeholder="36"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <Separator />

              {/* Decision Criteria */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">🟣 Decision Criteria</h3>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={assessment.priority}
                    onValueChange={(value) => setAssessment({ ...assessment, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="location">Location</SelectItem>
                      <SelectItem value="property">Property</SelectItem>
                      <SelectItem value="price">Price</SelectItem>
                      <SelectItem value="builder">Builder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Minimum Requirement</Label>
                  <Textarea
                    value={assessment.minimum_requirement}
                    onChange={(e) =>
                      setAssessment({ ...assessment, minimum_requirement: e.target.value })
                    }
                    placeholder="Must have covered parking and security"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Additional Requirements</Label>
                  <Textarea
                    value={assessment.additional_requirements}
                    onChange={(e) =>
                      setAssessment({ ...assessment, additional_requirements: e.target.value })
                    }
                    placeholder="Prefer park-facing units"
                    rows={2}
                  />
                </div>
              </div>

              <Separator />

              {/* Internal Team Assessment */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">🔵 Internal Team Assessment</h3>
                <p className="text-sm text-muted-foreground">
                  Captured by pre-sales/agent after assessment stage
                </p>

                <div className="space-y-2">
                  <Label>Pressure Point (Motivation)</Label>
                  <Textarea
                    value={assessment.pressure_point}
                    onChange={(e) =>
                      setAssessment({ ...assessment, pressure_point: e.target.value })
                    }
                    placeholder="e.g., Family expansion / rental saving / job transfer / ROI target"
                    rows={3}
                  />
                </div>
              </div>

              <Button
                onClick={() => saveAssessment.mutate()}
                disabled={saveAssessment.isPending}
                className="w-full"
                size="lg"
              >
                💾 Save Assessment
              </Button>
            </div>
          </TabsContent>

          {/* External Portal Updates Tab */}
          <TabsContent value="external" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg mb-2">🧱 Property Suggestion Tracking</h3>
                <p className="text-sm text-muted-foreground">
                  Log actions taken in external builder portals
                </p>
              </div>

              <div className="space-y-2">
                <Label>Builder Name *</Label>
                <Input
                  value={externalAction.builder_name}
                  onChange={(e) =>
                    setExternalAction({ ...externalAction, builder_name: e.target.value })
                  }
                  placeholder="e.g., Shriram Properties"
                />
              </div>

              <div className="space-y-2">
                <Label>Project Name *</Label>
                <Input
                  value={externalAction.project_name}
                  onChange={(e) =>
                    setExternalAction({ ...externalAction, project_name: e.target.value })
                  }
                  placeholder="e.g., Park 63"
                />
              </div>

              <div className="space-y-2">
                <Label>Action Taken *</Label>
                <Select
                  value={externalAction.action_taken}
                  onValueChange={(value) =>
                    setExternalAction({ ...externalAction, action_taken: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="shared_details">Shared Details</SelectItem>
                    <SelectItem value="updated_in_portal">Updated in Portal</SelectItem>
                    <SelectItem value="follow_up_logged">Follow-Up Logged</SelectItem>
                    <SelectItem value="site_visit_requested">Site Visit Requested</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={externalAction.notes}
                  onChange={(e) =>
                    setExternalAction({ ...externalAction, notes: e.target.value })
                  }
                  placeholder="Updated customer's details in builder portal"
                  rows={3}
                />
              </div>

              <Button
                onClick={() => logExternalAction.mutate()}
                disabled={
                  logExternalAction.isPending ||
                  !externalAction.builder_name ||
                  !externalAction.project_name ||
                  !externalAction.action_taken
                }
                className="w-full"
              >
                <Building2 className="h-4 w-4 mr-2" />
                Log External Action
              </Button>

              <Separator className="my-4" />

              {/* External Actions History */}
              <div>
                <h4 className="font-semibold mb-3">External Actions History</h4>
                <div className="space-y-3">
                  {externalActions && externalActions.length > 0 ? (
                    externalActions.map((action) => (
                      <div key={action.id} className="border rounded-lg p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{action.builder_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(action.action_date).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">{action.project_name}</div>
                        <div className="text-sm">
                          <span className="font-medium">Action: </span>
                          {action.action_taken.replace(/_/g, " ")}
                        </div>
                        {action.notes && (
                          <div className="text-sm text-muted-foreground">{action.notes}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      No external actions logged yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Status & Follow-up Tab */}
          <TabsContent value="status" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Lead Status</Label>
                <Select
                  value={statusInfo.status}
                  onValueChange={(value) =>
                    setStatusInfo({ ...statusInfo, status: value as typeof statusInfo.status })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="reached">Reached</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="interested">Interested</SelectItem>
                    <SelectItem value="site_visit_scheduled">Site Visit Scheduled</SelectItem>
                    <SelectItem value="site_visit_rescheduled">
                      Site Visit Rescheduled
                    </SelectItem>
                    <SelectItem value="site_visit_completed">Site Visit Completed</SelectItem>
                    <SelectItem value="not_interested">Not Interested</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="junk">Junk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Next Follow-Up Date</Label>
                <Input
                  type="date"
                  value={statusInfo.next_followup_date}
                  onChange={(e) =>
                    setStatusInfo({ ...statusInfo, next_followup_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={statusInfo.notes}
                  onChange={(e) => setStatusInfo({ ...statusInfo, notes: e.target.value })}
                  placeholder="Add notes about this status change"
                  rows={4}
                />
              </div>

              <Button
                onClick={() => updateStatus.mutate()}
                disabled={updateStatus.isPending}
                className="w-full"
              >
                Update Status
              </Button>
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-4">
            <div className="space-y-4">
              {activities && activities.length > 0 ? (
                activities.map((activity) => (
                  <div key={activity.id} className="border-l-2 border-primary pl-4 pb-4">
                    <div className="flex items-start gap-3">
                      <Activity className="h-4 w-4 mt-1 text-primary" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium capitalize">{activity.activity_type}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(activity.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{activity.notes}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          By: {activity.profiles?.full_name || "System"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No activities logged yet
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
