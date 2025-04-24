
import { useState } from "react";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { SubprimeLeadDetail } from "./SubprimeLeadDetail";
import { LeadCard } from "./lead/LeadCard";
import { toast } from "sonner";
import { AssigneeLeadsDialog } from "./AssigneeLeadsDialog";

interface SubprimeLeadsListProps {
  leads: SubprimeLead[];
}

export const SubprimeLeadsList = ({ leads }: SubprimeLeadsListProps) => {
  const [selectedLead, setSelectedLead] = useState<SubprimeLead | null>(null);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [assigneeDialogOpen, setAssigneeDialogOpen] = useState(false);

  // Function to get a stable agent name based on lead id
  const getStableAgentName = (leadId: string): "Andrea" | "Ian" | "Kayam" => {
    // Use the last character of the ID to determine the agent
    const lastChar = leadId.charAt(leadId.length - 1);
    const charCode = lastChar.charCodeAt(0);
    
    if (charCode % 3 === 0) return "Andrea";
    if (charCode % 3 === 1) return "Ian";
    return "Kayam";
  };

  // Apply stable agent names to leads
  const leadsWithStableAgents = leads.map(lead => {
    if (lead.assignedAgent) {
      return {
        ...lead,
        assignedAgent: getStableAgentName(lead.id)
      };
    }
    return lead;
  });

  const handleAssigneeClick = (assignee: string | undefined) => {
    if (assignee) {
      setSelectedAssignee(assignee);
      setAssigneeDialogOpen(true);
    }
  };

  const getAssigneeLeads = (assignee: string) => {
    return leadsWithStableAgents.filter(lead => lead.assignedAgent === assignee);
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
      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-sm font-medium text-gray-500">
        <div className="col-span-2">Name</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Score</div>
        <div className="col-span-2">Progress</div>
        <div className="col-span-2">Last Contact</div>
        <div className="col-span-1">Assigned</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>

      {leadsWithStableAgents.length === 0 ? (
        <Card className="p-4 text-center text-gray-500">
          No leads match your current filters
        </Card>
      ) : (
        leadsWithStableAgents.map(lead => (
          <LeadCard 
            key={lead.id} 
            lead={lead}
            onViewDetails={setSelectedLead}
            onAssigneeClick={handleAssigneeClick}
            onSendNudge={sendNudgeToAssignee}
          />
        ))
      )}

      <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedLead && <SubprimeLeadDetail lead={selectedLead} />}
        </DialogContent>
      </Dialog>

      <AssigneeLeadsDialog
        open={assigneeDialogOpen}
        onOpenChange={setAssigneeDialogOpen}
        assignee={selectedAssignee}
        leads={selectedAssignee ? getAssigneeLeads(selectedAssignee) : []}
        onSendNudge={sendNudgeToAssignee}
      />
    </div>
  );
};
