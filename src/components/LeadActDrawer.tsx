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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Phone, User, Plus, X, Sparkles, Loader2 } from "lucide-react";
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
  const [selectedActions, setSelectedActions] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);

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

  // Fetch AI-matched projects
  const { data: aiMatches } = useQuery({
    queryKey: ["ai-matches", leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matchings")
        .select(`
          *,
          project:projects(
            id,
            name,
            location,
            price_min,
            price_max,
            project_type,
            builder:builders(name)
          )
        `)
        .eq("lead_id", leadId)
        .order("score", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
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

  // Call Information State with auto date/time
  const getCurrentDateTime = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // yyyy-mm-dd
    const timeStr = now.toTimeString().slice(0, 5); // hh:mm
    return { dateStr, timeStr };
  };

  const { dateStr: currentDate, timeStr: currentTime } = getCurrentDateTime();

  const [callInfo, setCallInfo] = useState({
    calling_status: "",
    call_date: currentDate,
    call_time: currentTime,
    next_followup_date: "",
    next_followup_time: "",
    notes: "",
  });

  // Auto-calculate next follow-up date (+15 days)
  useEffect(() => {
    if (callInfo.call_date) {
      const callDate = new Date(callInfo.call_date);
      callDate.setDate(callDate.getDate() + 15);
      const followupDate = callDate.toISOString().split('T')[0];
      setCallInfo(prev => ({ ...prev, next_followup_date: followupDate }));
    }
  }, [callInfo.call_date]);

  // Parse preferred locations properly
  const parsePreferredLocations = (locations: any): LocationWithRadius[] => {
    if (!locations) return [{ location: "", radius_km: 0 }];
    if (Array.isArray(locations)) {
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
    primary_purchase_objective: leadDetails?.primary_purchase_objective || "",
    buying_for: leadDetails?.buying_for || "",
    specify_buying_for: leadDetails?.specify_buying_for || "",
    occupation: leadDetails?.occupation || "",
    locations: parsePreferredLocations(leadDetails?.preferred_locations),
    property_type: leadDetails?.property_type || "",
    size_sqft: leadDetails?.size_sqft || "",
    bhk: leadDetails?.bhk || "",
    facing: leadDetails?.facing || "",
    floor_preference: leadDetails?.floor_preference || "",
    food_preference: leadDetails?.food_preference || "",
    budget_min: leadDetails?.budget_min || "",
    budget_max: leadDetails?.budget_max || "",
    budget_flexibility: leadDetails?.budget_flexibility || "",
    expected_rental_yield: leadDetails?.expected_rental_yield || "",
    expected_appreciation_percent: leadDetails?.expected_appreciation_percent || "",
    investment_horizon_months: leadDetails?.investment_horizon_months || "",
    priority: leadDetails?.priority || "",
    minimum_requirement: leadDetails?.minimum_requirement || "",
    additional_requirements: leadDetails?.additional_requirements || "",
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

      const newAttemptCount = (lead?.attempt_count || 0) + 1;

      // Insert call activity
      const { error: activityError } = await supabase.from("activities").insert({
        lead_id: leadId,
        activity_type: "call",
        calling_status: callInfo.calling_status as any,
        call_date: new Date(callInfo.call_date).toISOString(),
        call_time: callInfo.call_time,
        next_followup_date: callInfo.next_followup_date,
        next_followup_time: callInfo.next_followup_time || null,
        notes: callInfo.notes,
        completed_at: new Date().toISOString(),
        created_by: user.id,
      });

      if (activityError) throw activityError;

      // Update lead with attempt count and follow-up
      const { error: leadError } = await supabase
        .from("leads")
        .update({
          attempt_count: newAttemptCount,
          last_attempt_at: new Date().toISOString(),
          next_followup_date: callInfo.next_followup_date,
          next_followup_time: callInfo.next_followup_time || null,
        })
        .eq("id", leadId);

      if (leadError) throw leadError;

      // Check if 3rd attempt - create notification
      if (newAttemptCount === 3) {
        // Get all managers to notify
        const { data: managers } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("role", ["business_manager", "sales_manager"]);

        if (managers && managers.length > 0) {
          const notifications = managers.map(manager => ({
            type: "third_attempt",
            title: "⚠️ 3rd Attempt Escalation",
            message: `Lead: ${lead.name} (${lead.phone})\nStatus: 3rd Attempt Logged — Possible Cold Lead\nPlease review action plan.`,
            lead_id: leadId,
            recipient_id: manager.user_id,
          }));

          await supabase.from("notifications").insert(notifications);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-activities", leadId] });
      queryClient.invalidateQueries({ queryKey: ["lead-detail", leadId] });
      toast.success("Call activity logged successfully");
      
      // Reset call info for next call
      const { dateStr, timeStr } = getCurrentDateTime();
      setCallInfo({
        calling_status: "",
        call_date: dateStr,
        call_time: timeStr,
        next_followup_date: "",
        next_followup_time: "",
        notes: "",
      });
    },
  });

  // Save assessment with property actions
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
        const result = await supabase
          .from("lead_details")
          .update(payload as any)
          .eq("lead_id", leadId);
        error = result.error;
      } else {
        const result = await supabase
          .from("lead_details")
          .insert(payload as any);
        error = result.error;
      }

      if (error) throw error;

      // Save external actions for selected projects
      const actionsToSave = Object.entries(selectedActions)
        .filter(([_, actionType]) => actionType)
        .map(([projectId, actionType]) => {
          const match = aiMatches?.find((m: any) => m.project_id === projectId);
          return {
            lead_id: leadId,
            builder_name: match?.project?.builder?.name || "Unknown",
            project_name: match?.project?.name || "Unknown",
            action_taken: actionType,
            action_date: new Date().toISOString(),
            notes: `Auto-logged from ACT Panel during call`,
            created_by: user.id,
          };
        });

      if (actionsToSave.length > 0) {
        const { error: actionsError } = await supabase
          .from("external_actions")
          .insert(actionsToSave);
        if (actionsError) throw actionsError;
      }

      // Log activity for assessment
      await supabase.from("activities").insert({
        lead_id: leadId,
        activity_type: "note",
        notes: "Buyer Assessment & Property Actions Updated",
        created_by: user.id,
      });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["lead-details", leadId] });
      queryClient.invalidateQueries({ queryKey: ["external-actions", leadId] });
      queryClient.invalidateQueries({ queryKey: ["lead-activities", leadId] });
      toast.success("Assessment saved successfully");
      setSelectedActions({});
      
      // Auto-trigger matching
      try {
        setGenerating(true);
        toast.info("Generating AI property matches...");
        const { error } = await supabase.functions.invoke("match-lead-supply", {
          body: { lead_id: leadId }
        });
        
        if (error) throw error;
        
        queryClient.invalidateQueries({ queryKey: ["ai-matches", leadId] });
        toast.success("AI matches generated successfully");
        setActiveTab("matches");
      } catch (e) {
        console.error("Error generating matches:", e);
        toast.error("Failed to generate matches");
      } finally {
        setGenerating(false);
      }
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
          <SheetTitle>Lead ACT Panel</SheetTitle>
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
            <TabsTrigger value="intent">Intent</TabsTrigger>
            <TabsTrigger value="matches">AI Matches</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          {/* Call Information Tab */}
          <TabsContent value="call" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Calling Status *</Label>
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
                    <SelectItem value="rnr_swo">RNR/SWO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Call Date (Auto)</Label>
                  <Input
                    type="date"
                    value={callInfo.call_date}
                    onChange={(e) => setCallInfo({ ...callInfo, call_date: e.target.value })}
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Call Time (Auto)</Label>
                  <Input
                    type="time"
                    value={callInfo.call_time}
                    onChange={(e) => setCallInfo({ ...callInfo, call_time: e.target.value })}
                    className="bg-muted"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Number of Attempts</Label>
                <Input type="number" value={lead?.attempt_count || 0} disabled className="bg-muted" />
                {(lead?.attempt_count || 0) >= 2 && (
                  <p className="text-sm text-destructive">
                    ⚠️ Warning: Next attempt will move lead to Junk status
                  </p>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Follow-Up Schedule</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Next Follow-Up Date (Auto +15 days)</Label>
                    <Input
                      type="date"
                      value={callInfo.next_followup_date}
                      onChange={(e) => setCallInfo({ ...callInfo, next_followup_date: e.target.value })}
                      className="bg-muted"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Next Follow-Up Time (Optional)</Label>
                    <Input
                      type="time"
                      value={callInfo.next_followup_time}
                      onChange={(e) => setCallInfo({ ...callInfo, next_followup_time: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={callInfo.notes}
                  onChange={(e) => setCallInfo({ ...callInfo, notes: e.target.value })}
                  placeholder="Call summary or feedback..."
                  rows={3}
                />
              </div>

              <Button
                onClick={() => logCallActivity.mutate()}
                disabled={logCallActivity.isPending || !callInfo.calling_status}
                className="w-full"
              >
                {logCallActivity.isPending ? "Logging..." : "Log Call"}
              </Button>
            </div>
          </TabsContent>

          {/* Buyer Intent & Assessment Tab */}
          <TabsContent value="intent" className="space-y-6">
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

                {/* Investment Snapshot - Conditional */}
                {assessment.primary_purchase_objective === "investment" && (
                  <div className="p-4 border rounded-lg bg-muted/50 space-y-4">
                    <h4 className="font-semibold text-sm">💡 Investment Snapshot – Quick Intent Capture</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-2">
                        <Label>Expected Monthly ROI (₹)</Label>
                        <Input
                          type="number"
                          value={assessment.expected_rental_yield}
                          onChange={(e) =>
                            setAssessment({ ...assessment, expected_rental_yield: e.target.value })
                          }
                          placeholder="e.g., 35,000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Expected Appreciation (%)</Label>
                        <Input
                          type="number"
                          value={assessment.expected_appreciation_percent}
                          onChange={(e) =>
                            setAssessment({ ...assessment, expected_appreciation_percent: e.target.value })
                          }
                          placeholder="e.g., 10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Planned Holding Period (Months)</Label>
                        <Input
                          type="number"
                          value={assessment.investment_horizon_months}
                          onChange={(e) =>
                            setAssessment({ ...assessment, investment_horizon_months: e.target.value })
                          }
                          placeholder="e.g., 36"
                        />
                      </div>
                    </div>
                  </div>
                )}

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
                <h3 className="font-semibold text-lg">💰 Financial Assessment</h3>

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
                    placeholder="e.g., Can stretch 10% for prime projects"
                  />
                </div>
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
                    placeholder="e.g., Rental saving / relocation / investment portfolio expansion"
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
                💾 Save & Close Lead Call
              </Button>
            </div>
          </TabsContent>

          {/* AI Property Matches Tab */}
          <TabsContent value="matches" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold">🤖 AI Property Matches</h3>
                <p className="text-sm text-muted-foreground">
                  Auto-matched projects based on location, budget, and preferences
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Matches refresh automatically when assessment is saved
                </p>
              </div>

              {generating && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Generating AI matches...</span>
                </div>
              )}

              {!generating && aiMatches && aiMatches.length > 0 ? (
                <div className="space-y-3">
                  {aiMatches.map((match: any, index: number) => (
                    <div key={match.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold">{match.project?.name}</h4>
                            <Badge variant="secondary">{match.score}% Match</Badge>
                            {match.highly_suitable && (
                              <Badge variant="default" className="bg-green-600">
                                ⭐ Highly Suitable
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {match.project?.builder?.name} • {match.project?.location}
                          </p>
                          <p className="text-sm">
                            {match.project?.project_type} • ₹{match.project?.price_min?.toLocaleString()} - ₹{match.project?.price_max?.toLocaleString()}
                          </p>
                          {match.match_reasons && match.match_reasons.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {match.match_reasons.map((reason: string, idx: number) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">✅ Real-Time Lead Action (During Call)</Label>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`action-site-${match.project_id}`}
                              checked={selectedActions[match.project_id] === "Lead Registered + Pushed for Site Visit"}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedActions({
                                    ...selectedActions,
                                    [match.project_id]: "Lead Registered + Pushed for Site Visit"
                                  });
                                } else {
                                  const newActions = { ...selectedActions };
                                  delete newActions[match.project_id];
                                  setSelectedActions(newActions);
                                }
                              }}
                            />
                            <label
                              htmlFor={`action-site-${match.project_id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Lead Registered + Pushed for Site Visit
                            </label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`action-reg-${match.project_id}`}
                              checked={selectedActions[match.project_id] === "Lead Registered Only"}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedActions({
                                    ...selectedActions,
                                    [match.project_id]: "Lead Registered Only"
                                  });
                                } else {
                                  const newActions = { ...selectedActions };
                                  delete newActions[match.project_id];
                                  setSelectedActions(newActions);
                                }
                              }}
                            />
                            <label
                              htmlFor={`action-reg-${match.project_id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              Lead Registered Only
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                !generating && (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <p className="font-medium">No AI matches available yet</p>
                    <p className="text-sm mt-1">
                      Save buyer assessment to automatically generate AI-powered property matches
                    </p>
                  </div>
                )
              )}

              {externalActions && externalActions.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="font-semibold text-sm">📦 Previous Property Actions</h4>
                  <div className="space-y-2">
                    {externalActions.map((action: any) => (
                      <div key={action.id} className="p-3 border rounded-lg bg-muted/30">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{action.project_name}</p>
                            <p className="text-xs text-muted-foreground">{action.builder_name}</p>
                            <Badge variant="outline" className="mt-1 text-xs">{action.action_taken}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(action.action_date).toLocaleDateString()}
                          </p>
                        </div>
                        {action.notes && (
                          <p className="text-xs text-muted-foreground mt-2">{action.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Status & Follow-up Tab */}
          <TabsContent value="status" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Lead Status</Label>
                <Select
                  value={statusInfo.status}
                  onValueChange={(value: any) =>
                    setStatusInfo({ ...statusInfo, status: value })
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
                    <SelectItem value="site_visit_completed">Site Visit Completed</SelectItem>
                    <SelectItem value="not_interested">Not Interested</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                    <SelectItem value="junk">Junk</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Next Follow-up Date</Label>
                <Input
                  type="date"
                  value={statusInfo.next_followup_date}
                  onChange={(e) =>
                    setStatusInfo({ ...statusInfo, next_followup_date: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Textarea
                  value={statusInfo.notes}
                  onChange={(e) => setStatusInfo({ ...statusInfo, notes: e.target.value })}
                  placeholder="Add any additional notes..."
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
              <h3 className="font-semibold text-lg">Activity Timeline</h3>
              {activities && activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.map((activity: any) => (
                    <div key={activity.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="outline" className="mb-1">
                            {activity.activity_type}
                          </Badge>
                          <p className="text-sm">{activity.notes}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            By {activity.profiles?.full_name || "Unknown"}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No activities yet
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
