import { useState } from "react";
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
import { Phone, User, Clock, Activity } from "lucide-react";

interface LeadActDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
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

  // Call Information State
  const [callInfo, setCallInfo] = useState({
    calling_status: "",
    call_date: "",
    call_time: "",
    attempts: lead?.attempt_count || 0,
  });

  // Customer Assessment State
  const propertyReqs = (leadDetails?.property_requirements as Record<string, any>) || {};
  const [assessment, setAssessment] = useState({
    purchase_intent: leadDetails?.purchase_intent || "",
    buying_for: leadDetails?.buying_for || "",
    roi_months: leadDetails?.roi_months || "",
    specify_buying_for: leadDetails?.specify_buying_for || "",
    occupation: propertyReqs.occupation || "",
    preferred_locations: leadDetails?.preferred_locations || [],
    radius_km: propertyReqs.radius_km || "",
    property_type: propertyReqs.property_type || "",
    size_sqft: propertyReqs.size_sqft || "",
    bhk: propertyReqs.bhk || "",
    facing: propertyReqs.facing || "",
    food_preference: propertyReqs.food_preference || "",
    floor_preference: propertyReqs.floor_preference || "",
    priority: propertyReqs.priority || "",
    additional_requirements: leadDetails?.additional_notes || "",
    minimum_requirement: propertyReqs.minimum_requirement || "",
    budget_flexibility: leadDetails?.budget_flexibility || "",
    pressure_point: propertyReqs.pressure_point || "",
  });

  // Status & Follow-up State
  const [statusInfo, setStatusInfo] = useState({
    status: (lead?.status || "new") as "new" | "contacted" | "reached" | "qualified" | "interested" | "site_visit_scheduled" | "site_visit_rescheduled" | "site_visit_completed" | "not_interested" | "converted" | "lost" | "junk",
    next_followup_date: lead?.next_followup_date || "",
    notes: "",
  });

  // Save call activity
  const logCallActivity = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create activity
      const { error: activityError } = await supabase.from("activities").insert({
        lead_id: leadId,
        activity_type: "call",
        notes: `${callInfo.calling_status} - ${callInfo.attempts} attempts`,
        completed_at: `${callInfo.call_date}T${callInfo.call_time}`,
        created_by: user.id,
      });

      if (activityError) throw activityError;

      // Update lead attempt count
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

      const propertyRequirements = {
        occupation: assessment.occupation,
        radius_km: assessment.radius_km,
        property_type: assessment.property_type,
        size_sqft: assessment.size_sqft,
        bhk: assessment.bhk,
        facing: assessment.facing,
        food_preference: assessment.food_preference,
        floor_preference: assessment.floor_preference,
        priority: assessment.priority,
        minimum_requirement: assessment.minimum_requirement,
        pressure_point: assessment.pressure_point,
      };

      const { error } = await supabase.from("lead_details").upsert({
        lead_id: leadId,
        preferred_locations: assessment.preferred_locations,
        property_requirements: propertyRequirements,
        budget_flexibility: assessment.budget_flexibility,
        additional_notes: assessment.additional_requirements,
        purchase_intent: assessment.purchase_intent,
        buying_for: assessment.buying_for,
        roi_months: assessment.roi_months ? parseInt(String(assessment.roi_months)) : null,
        specify_buying_for: assessment.specify_buying_for,
      });

      if (error) throw error;

      // Log activity for buyer intent capture
      if (assessment.purchase_intent) {
        await supabase.from("activities").insert({
          lead_id: leadId,
          activity_type: "note",
          notes: "Buyer Intent Captured",
          created_by: user.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-details", leadId] });
      toast.success("Assessment saved");
    },
  });

  // Update status and follow-up
  const updateStatus = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update lead status and next follow-up
      const { error: leadError } = await supabase
        .from("leads")
        .update({
          status: statusInfo.status as any,
          next_followup_date: statusInfo.next_followup_date || null,
        })
        .eq("id", leadId);

      if (leadError) throw leadError;

      // Log activity if notes provided
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
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="call">Call</TabsTrigger>
            <TabsTrigger value="assessment">Assessment</TabsTrigger>
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
          <TabsContent value="assessment" className="space-y-4">
            <div className="space-y-4">
              {/* Buyer Intent Section */}
              <div className="space-y-4">
                <h3 className="font-semibold">Buyer Intent Information</h3>
                
                <div className="space-y-2">
                  <Label>
                    Primary Purchase Objective *
                  </Label>
                  <Select
                    value={assessment.purchase_intent}
                    onValueChange={(value) => {
                      setAssessment({ ...assessment, purchase_intent: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select purchase objective" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="end_use">End-Use (For Self)</SelectItem>
                      <SelectItem value="investment">Investment Purpose</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {assessment.purchase_intent === 'investment' && (
                  <div className="space-y-2">
                    <Label>Expected ROI or Holding Period (Months)</Label>
                    <Input
                      type="number"
                      value={assessment.roi_months}
                      onChange={(e) => setAssessment({ ...assessment, roi_months: e.target.value })}
                      placeholder="e.g., 24 months"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>
                    Buying On Behalf Of
                  </Label>
                  <Select
                    value={assessment.buying_for}
                    onValueChange={(value) => {
                      setAssessment({ ...assessment, buying_for: value });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select who is buying" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="self">Self</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {assessment.buying_for === 'other' && (
                  <div className="space-y-2">
                    <Label>Specify for whom this property is being considered</Label>
                    <Input
                      value={assessment.specify_buying_for}
                      onChange={(e) => setAssessment({ ...assessment, specify_buying_for: e.target.value })}
                      placeholder="e.g., Parents, Children, Investment Partner"
                    />
                  </div>
                )}
              </div>

              {/* Rest of Assessment Fields */}
              <div className="space-y-2">
                <Label>Occupation</Label>
                <Input
                  value={assessment.occupation}
                  onChange={(e) => setAssessment({ ...assessment, occupation: e.target.value })}
                  placeholder="Job title or business"
                />
              </div>

              <div className="space-y-2">
                <Label>Preferred Locations (comma-separated)</Label>
                <Input
                  value={assessment.preferred_locations.join(", ")}
                  onChange={(e) =>
                    setAssessment({
                      ...assessment,
                      preferred_locations: e.target.value.split(",").map((s) => s.trim()),
                    })
                  }
                  placeholder="Location 1, Location 2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Radius (km)</Label>
                  <Input
                    type="number"
                    value={assessment.radius_km}
                    onChange={(e) => setAssessment({ ...assessment, radius_km: e.target.value })}
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Size (sq.ft)</Label>
                  <Input
                    type="number"
                    value={assessment.size_sqft}
                    onChange={(e) => setAssessment({ ...assessment, size_sqft: e.target.value })}
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Budget Flexibility</Label>
                <Input
                  value={assessment.budget_flexibility}
                  onChange={(e) =>
                    setAssessment({ ...assessment, budget_flexibility: e.target.value })
                  }
                  placeholder="e.g., Can stretch 10%"
                />
              </div>

              <div className="space-y-2">
                <Label>Minimum Requirement</Label>
                <Textarea
                  value={assessment.minimum_requirement}
                  onChange={(e) =>
                    setAssessment({ ...assessment, minimum_requirement: e.target.value })
                  }
                  placeholder="Must-have features"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Pressure Point (Motivation)</Label>
                <Textarea
                  value={assessment.pressure_point}
                  onChange={(e) =>
                    setAssessment({ ...assessment, pressure_point: e.target.value })
                  }
                  placeholder="What's driving the purchase?"
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
                  placeholder="Any other notes"
                  rows={3}
                />
              </div>

              <Button
                onClick={() => saveAssessment.mutate()}
                disabled={saveAssessment.isPending}
                className="w-full"
              >
                Save Assessment
              </Button>
            </div>
          </TabsContent>

          {/* Status & Follow-up Tab */}
          <TabsContent value="status" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Lead Status</Label>
                <Select
                  value={statusInfo.status}
                  onValueChange={(value) => setStatusInfo({ ...statusInfo, status: value as typeof statusInfo.status })}
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
