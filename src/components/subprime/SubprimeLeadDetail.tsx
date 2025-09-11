
import { useState } from "react";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { subprimeLeads } from "@/data";
import { AssigneeDetailsDialog } from "./lead/AssigneeDetailsDialog";
import { LeadAISummary } from "./lead/detail/LeadAISummary";
import { LeadHeader } from "./lead/detail/LeadHeader";
import { LeadDetailsCard } from "./lead/detail/LeadDetailsCard";
import { LeadProgressCard } from "./lead/detail/LeadProgressCard";
import { LeadConversation } from "./lead/detail/LeadConversation";
import { LeadActions } from "./lead/detail/LeadActions";
import { LeadInternalNotes } from "./lead/detail/LeadInternalNotes";

interface SubprimeLeadDetailProps {
  lead: SubprimeLead;
  onLeadUpdate?: (leadId: string, updates: Partial<SubprimeLead>) => void;
}

export const SubprimeLeadDetail = ({ lead, onLeadUpdate }: SubprimeLeadDetailProps) => {
  const [autoChase, setAutoChase] = useState(lead.chaseStatus === "Auto Chase Running");
  const [internalNote, setInternalNote] = useState("");
  const [isAssigneeDialogOpen, setIsAssigneeDialogOpen] = useState(false);

  const handleToggleAutoChase = () => {
    setAutoChase(!autoChase);
  };

  const handleAddNote = () => {
    if (internalNote.trim()) {
      setInternalNote("");
    }
  };

  const getLeadsForSpecialist = (specialist: string) => {
    return subprimeLeads.filter(l => l.assignedSpecialist === specialist);
  };

  const assignedSpecialist = lead.assignedSpecialist;

  return (
    <div className="space-y-6">
      <LeadAISummary lead={lead} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <LeadHeader 
            lead={lead}
            autoChase={autoChase}
            onAutoChaseChange={handleToggleAutoChase}
          />
          
          <LeadDetailsCard 
            lead={lead}
            onAssigneeClick={() => setIsAssigneeDialogOpen(true)}
          />
          
          <LeadProgressCard lead={lead} />
        </div>
        
        <div className="lg:col-span-2">
          <LeadConversation
            lead={lead}
            internalNote={internalNote}
            onInternalNoteChange={setInternalNote}
            onAddNote={handleAddNote}
            onLeadUpdate={onLeadUpdate}
          />
          <LeadActions 
            lead={lead}
            onAddNote={handleAddNote}
            onLeadUpdate={onLeadUpdate}
          />
          <LeadInternalNotes
            internalNote={internalNote}
            onInternalNoteChange={setInternalNote}
            onAddNote={handleAddNote}
          />
          <elevenlabs-convai
            agent-id="agent_01jwc5v1nafjwv7zw4vtz1050m"
            transcript
            text-input
            className="mt-4"
          ></elevenlabs-convai>
        </div>
      </div>

      {assignedSpecialist && (
        <AssigneeDetailsDialog
          specialist={assignedSpecialist}
          leads={getLeadsForSpecialist(assignedSpecialist)}
          open={isAssigneeDialogOpen}
          onOpenChange={setIsAssigneeDialogOpen}
        />
      )}
    </div>
  );
};
