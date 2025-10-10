import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Activity, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LeadActDrawer } from "./LeadActDrawer";

interface LeadsTableProps {
  leads: any[];
  onAssign?: (leadId: string) => void;
}

export function LeadsTable({ leads, onAssign }: LeadsTableProps) {
  const navigate = useNavigate();
  const [actDrawerOpen, setActDrawerOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const handleActClick = (leadId: string) => {
    setSelectedLeadId(leadId);
    setActDrawerOpen(true);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-500",
      contacted: "bg-yellow-500",
      reached: "bg-cyan-500",
      qualified: "bg-purple-500",
      interested: "bg-green-500",
      site_visit_scheduled: "bg-indigo-500",
      site_visit_rescheduled: "bg-orange-500",
      site_visit_completed: "bg-teal-500",
      not_interested: "bg-gray-500",
      converted: "bg-emerald-500",
      lost: "bg-red-500",
      junk: "bg-slate-500",
    };
    return colors[status] || "bg-gray-500";
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Mobile</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Last Contacted</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No leads found. Create your first lead to get started!
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">{lead.name}</TableCell>
                <TableCell>{lead.phone}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {lead.source || "-"}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(lead.status)}>
                    {lead.status.replace(/_/g, " ")}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {lead.assigned_profile?.full_name || "Unassigned"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {lead.last_contacted_at
                    ? new Date(lead.last_contacted_at).toLocaleDateString()
                    : "-"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleActClick(lead.id)}
                      title="Activity & Details"
                    >
                      <Activity className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {onAssign && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAssign(lead.id)}
                        title="Assign Lead"
                      >
                        <UserCheck className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {selectedLeadId && (
        <LeadActDrawer
          open={actDrawerOpen}
          onOpenChange={setActDrawerOpen}
          leadId={selectedLeadId}
        />
      )}
    </div>
  );
}
