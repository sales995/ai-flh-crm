import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";

const leadSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  phone: z.string().trim().min(10, "Phone number must be at least 10 digits").max(20),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  source: z.enum(["manual", "website", "meta", "google", "referral", "other"], {
    errorMap: () => ({ message: "Please select a source" }),
  }),
});

// Normalize phone number to E.164 format
const normalizePhone = (phone: string): string => {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Add +91 prefix if not present (assuming India)
  if (digits.length === 10) {
    return `+91${digits}`;
  } else if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  
  // Return with + prefix if not present
  return digits.startsWith('+') ? digits : `+${digits}`;
};

interface LeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: any[];
  lead?: any;
}

export function LeadDialog({ open, onOpenChange, projects, lead }: LeadDialogProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: lead?.name || "",
    phone: lead?.phone || "",
    email: lead?.email || "",
    source: lead?.source || "manual",
  });
  const [leadType, setLeadType] = useState<'fresh' | 'duplicate' | null>(null);
  const [checking, setChecking] = useState(false);

  // Check for duplicates
  const checkDuplicate = async (phone: string, email?: string) => {
    if (!phone || phone.length < 10) {
      setLeadType(null);
      return;
    }

    setChecking(true);
    try {
      const normalizedPhone = normalizePhone(phone);

      // Check phone duplicate
      const { data: existingByPhone } = await supabase
        .from('leads')
        .select('id')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (existingByPhone) {
        setLeadType('duplicate');
        setChecking(false);
        return;
      }

      // Check email duplicate if provided
      if (email && email.includes('@')) {
        const { data: existingByEmail } = await supabase
          .from('leads')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (existingByEmail) {
          setLeadType('duplicate');
          setChecking(false);
          return;
        }
      }

      setLeadType('fresh');
    } catch (error) {
      console.error('Error checking duplicate:', error);
    } finally {
      setChecking(false);
    }
  };

  // Check for duplicates when phone or email changes
  useEffect(() => {
    if (!lead && formData.phone.length >= 10) {
      const timer = setTimeout(() => {
        checkDuplicate(formData.phone, formData.email);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [formData.phone, formData.email, lead]);

  const createLead = useMutation({
    mutationFn: async (data: any) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Normalize phone
      const normalizedPhone = normalizePhone(data.phone);

      // Determine if duplicate
      const isDuplicate = leadType === 'duplicate';

      const { error } = await supabase.from("leads").insert({
        name: data.name,
        phone: normalizedPhone,
        email: data.email || null,
        source: data.source,
        status: "new",
        lead_type: isDuplicate ? 'duplicate' : 'fresh',
        created_by: user.id,
        consent: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["recent-leads"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["leads-by-source"] });
      queryClient.invalidateQueries({ queryKey: ["leads-by-status"] });
      toast.success("Lead created successfully");
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create lead");
    },
  });

  const updateLead = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("leads")
        .update(data)
        .eq("id", lead.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-detail"] });
      queryClient.invalidateQueries({ queryKey: ["recent-leads"] });
      toast.success("Lead updated successfully");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update lead");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      email: "",
      source: "manual",
    });
    setLeadType(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = leadSchema.parse({
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        source: formData.source,
      });

      if (lead) {
        updateLead.mutate(validated);
      } else {
        createLead.mutate(validated);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{lead ? "Edit Lead" : "Add New Lead"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter full name"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Mobile Number *</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98765 43210"
              required
            />
            <p className="text-xs text-muted-foreground">
              Will be normalized to international format (e.g., +91...)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email ID</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Source *</Label>
            <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="meta">Meta (Facebook/Instagram)</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="referral">Referral</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Lead Type Display */}
          {!lead && leadType && (
            <div className="space-y-2">
              <Label>Lead Type (Auto-detected)</Label>
              <div className={`p-3 rounded-md text-sm font-medium ${
                leadType === 'duplicate' 
                  ? 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20' 
                  : 'bg-green-500/10 text-green-600 border border-green-500/20'
              }`}>
                {leadType === 'duplicate' ? '⚠️ Duplicate Lead' : '✓ Fresh Lead'}
              </div>
              {leadType === 'duplicate' && (
                <p className="text-xs text-muted-foreground">
                  This lead will be marked as duplicate but will still be created.
                </p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createLead.isPending || updateLead.isPending}>
              {lead ? "Update" : "Create"} Lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}