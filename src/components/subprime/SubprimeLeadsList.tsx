import { useState } from "react";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { Card } from "@/components/ui/card";
import { LeadCard } from "./lead/LeadCard";
import SubprimeLeadDetailModal from "./SubprimeLeadDetailModal";

interface SubprimeLeadsListProps {
  leads: SubprimeLead[];
  onLeadUpdate?: (leadId: string, updates: Partial<SubprimeLead>) => void;
  onLeadDelete?: (leadId: string) => void;
  onLeadSelect?: (lead: SubprimeLead) => void;
  selectedLeadId?: string;
}

export const SubprimeLeadsList = ({ leads, onLeadUpdate, onLeadDelete, onLeadSelect, selectedLeadId }: SubprimeLeadsListProps) => {
  const [selectedLead, setSelectedLead] = useState<SubprimeLead | null>(null);

  const handleLeadUpdate = (leadId: string, updates: Partial<SubprimeLead>) => {
    onLeadUpdate?.(leadId, updates);
    
    // Update local state if this is the currently selected lead
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead({ ...selectedLead, ...updates });
    }
  };

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-gray-500 items-center">
        <div className="col-span-2">Name</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Last Contact</div>
        <div className="col-span-2">Progress</div>
        <div className="col-span-2">Projected Score</div>
        <div className="col-span-1">Assigned</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>

      {leads.length === 0 ? (
        <Card className="p-4 text-center text-gray-500">
          No leads match your current filters
        </Card>
      ) : (
        leads.map(lead => (
          <LeadCard 
            key={lead.id} 
            lead={lead} 
            onViewDetails={setSelectedLead}
            onSelect={onLeadSelect}
            onDelete={onLeadDelete}
            isSelected={selectedLeadId === lead.id}
          />
        ))
      )}

      <SubprimeLeadDetailModal
        lead={selectedLead}
        open={!!selectedLead}
        onOpenChange={(open) => !open && setSelectedLead(null)}
        onLeadUpdate={handleLeadUpdate}
      />
    </div>
  );
};
