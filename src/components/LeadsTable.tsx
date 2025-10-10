import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Activity, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LeadActDrawer } from "./LeadActDrawer";
import { formatTimestamp } from "@/lib/utils";

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
      recheck_required: "bg-amber-500",
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
            <TableHead>Lead Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead>Created At</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                No leads found. Create your first lead to get started!
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead) => {
              const isToday = new Date(lead.created_at).toDateString() === new Date().toDateString();
              const isDuplicate = lead.lead_type === 'duplicate';
              
              return (
                <TableRow 
                  key={lead.id}
                  className={isDuplicate ? "bg-yellow-50 dark:bg-yellow-950/20" : ""}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {lead.name}
                      {isToday && (
                        <Badge variant="secondary" className="text-xs">
                          🕒 New Today
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{lead.phone}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lead.source || "-"}
                  </TableCell>
                  <TableCell>
                    {lead.lead_type === 'duplicate' ? (
                      <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20">
                        ⚠️ Duplicate
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/20">
                        🟢 Fresh
                      </Badge>
                    )}
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
                  🕒 {formatTimestamp(lead.created_at)}
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
              );
            })
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
