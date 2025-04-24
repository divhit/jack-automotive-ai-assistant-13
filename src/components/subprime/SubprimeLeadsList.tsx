
import { useState } from "react";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { SubprimeLeadDetail } from "./SubprimeLeadDetail";
import { LeadCard } from "./lead/LeadCard";
import { Button } from "../ui/button";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { X } from "lucide-react";

interface SubprimeLeadsListProps {
  leads: SubprimeLead[];
}

export const SubprimeLeadsList = ({ leads }: SubprimeLeadsListProps) => {
  const [selectedLead, setSelectedLead] = useState<SubprimeLead | null>(null);
  const [filteredByAssignee, setFilteredByAssignee] = useState<string | null>(null);

  const filteredLeads = filteredByAssignee 
    ? leads.filter(lead => lead.assignedAgent === filteredByAssignee)
    : leads;

  const handleAssigneeClick = (assignee: string | undefined) => {
    if (assignee) {
      setFilteredByAssignee(assignee);
    }
  };

  const clearAssigneeFilter = () => {
    setFilteredByAssignee(null);
  };

  const sendNudgeToAssignee = (lead: SubprimeLead) => {
    if (lead.assignedAgent) {
      toast.success(`Notification sent to ${lead.assignedAgent} about ${lead.customerName}'s lead`, {
        description: "They'll receive contact details and current status information."
      });
    }
  };

  return (
    <div className="space-y-4">
      {filteredByAssignee && (
        <div className="bg-muted/40 rounded-md p-3 flex items-center justify-between">
          <div>
            <h3 className="font-medium">Leads assigned to {filteredByAssignee}</h3>
            <p className="text-sm text-muted-foreground">
              {filteredLeads.length} lead(s) currently assigned
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearAssigneeFilter}
              className="gap-1"
            >
              <X className="h-4 w-4" /> Clear filter
            </Button>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-sm font-medium text-gray-500">
        <div className="col-span-2">Name</div>
        <div className="col-span-1">Status</div>
        <div className="col-span-2">Last Contact</div>
        <div className="col-span-2">Progress</div>
        <div className="col-span-2">Projected Score</div>
        <div className="col-span-2">Assigned To</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>

      {filteredLeads.length === 0 ? (
        <Card className="p-4 text-center text-gray-500">
          No leads match your current filters
        </Card>
      ) : (
        filteredLeads.map(lead => (
          <LeadCard 
            key={lead.id} 
            lead={lead} 
            onViewDetails={setSelectedLead}
            onAssigneeClick={handleAssigneeClick}
            showNudgeButton={!!filteredByAssignee}
            onSendNudge={sendNudgeToAssignee}
          />
        ))
      )}

      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedLead && <SubprimeLeadDetail lead={selectedLead} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};
