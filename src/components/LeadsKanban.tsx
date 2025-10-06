import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, MapPin, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface LeadsKanbanProps {
  leads: any[];
  onStatusChange: (id: string, status: string) => void;
}

const statuses = [
  { value: "new", label: "New", color: "bg-blue-500" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-500" },
  { value: "qualified", label: "Qualified", color: "bg-purple-500" },
  { value: "interested", label: "Interested", color: "bg-green-500" },
  { value: "not_interested", label: "Not Interested", color: "bg-gray-500" },
  { value: "converted", label: "Converted", color: "bg-emerald-500" },
  { value: "lost", label: "Lost", color: "bg-red-500" },
];

export function LeadsKanban({ leads, onStatusChange }: LeadsKanbanProps) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {statuses.map((status) => {
        const statusLeads = leads.filter((lead) => lead.status === status.value);
        
        return (
          <div key={status.value} className="space-y-3">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${status.color}`} />
              <h3 className="font-semibold text-sm">{status.label}</h3>
              <Badge variant="secondary" className="ml-auto">
                {statusLeads.length}
              </Badge>
            </div>
            
            <div className="space-y-2">
              {statusLeads.map((lead) => (
                <Card
                  key={lead.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("leadId", lead.id);
                    e.dataTransfer.setData("currentStatus", lead.status);
                  }}
                >
                  <CardHeader className="p-3 pb-2">
                    <CardTitle className="text-sm font-medium">{lead.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2 text-xs text-muted-foreground">
                    {lead.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {lead.phone}
                      </div>
                    )}
                    {lead.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {lead.email}
                      </div>
                    )}
                    {lead.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {lead.location}
                      </div>
                    )}
                    {(lead.budget_min || lead.budget_max) && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        ${lead.budget_min || 0} - ${lead.budget_max || 0}
                      </div>
                    )}
                    {lead.project_type && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {lead.project_type}
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
              
              {statusLeads.length === 0 && (
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center text-sm text-muted-foreground"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const leadId = e.dataTransfer.getData("leadId");
                    const currentStatus = e.dataTransfer.getData("currentStatus");
                    if (leadId && currentStatus !== status.value) {
                      onStatusChange(leadId, status.value);
                    }
                  }}
                >
                  No leads
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
