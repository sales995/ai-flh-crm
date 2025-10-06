import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Edit } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LeadsTableProps {
  leads: any[];
}

export function LeadsTable({ leads }: LeadsTableProps) {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: "bg-blue-500",
      contacted: "bg-yellow-500",
      qualified: "bg-purple-500",
      interested: "bg-green-500",
      not_interested: "bg-gray-500",
      converted: "bg-emerald-500",
      lost: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Budget</TableHead>
            <TableHead>Type</TableHead>
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
                <TableCell>
                  <div className="text-sm">
                    <div>{lead.email}</div>
                    <div className="text-muted-foreground">{lead.phone}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(lead.status)}>
                    {lead.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>{lead.location || "-"}</TableCell>
                <TableCell>
                  {lead.budget_min || lead.budget_max
                    ? `$${lead.budget_min || 0} - $${lead.budget_max || 0}`
                    : "-"}
                </TableCell>
                <TableCell className="capitalize">{lead.project_type || "-"}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/leads/${lead.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
