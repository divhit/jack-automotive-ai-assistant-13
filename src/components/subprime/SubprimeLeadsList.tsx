
import { useState } from "react";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { SubprimeLeadDetail } from "./SubprimeLeadDetail";
import { LeadCard } from "./lead/LeadCard";

interface SubprimeLeadsListProps {
  leads: SubprimeLead[];
}

export const SubprimeLeadsList = ({ leads }: SubprimeLeadsListProps) => {
  const [selectedLead, setSelectedLead] = useState<SubprimeLead | null>(null);

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-13 gap-2 px-3 py-2 text-sm font-medium text-gray-500">
        <div className="col-span-2">Name</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-3">Last Contact</div>
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
