
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";

interface LeadDetailsCardProps {
  lead: SubprimeLead;
  onAssigneeClick: () => void;
}

export const LeadDetailsCard = ({ lead, onAssigneeClick }: LeadDetailsCardProps) => {
  return (
    <Card className="p-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-medium">Lead Details</h4>
        {lead.assignedAgent && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onAssigneeClick}
            className="text-xs text-gray-600 hover:bg-gray-100"
          >
            Assigned to: {lead.assignedAgent}
          </Button>
        )}
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Funding Readiness:</span>
          <Badge className={
            lead.fundingReadiness === "Ready" ? "bg-green-100 text-green-800" :
            lead.fundingReadiness === "Partial" ? "bg-yellow-100 text-yellow-800" :
            "bg-red-100 text-red-800"
          }>
            {lead.fundingReadiness}
          </Badge>
        </div>
        
        <div className="text-xs text-gray-500 italic">
          {lead.fundingReadinessReason}
        </div>
        
        {lead.creditProfile && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Credit Score:</span>
              <span className="font-medium">{lead.creditProfile.scoreRange}</span>
            </div>
            
            {lead.creditProfile.knownIssues && lead.creditProfile.knownIssues.length > 0 && (
              <div className="space-y-1">
                <span className="text-sm text-gray-600">Known Issues:</span>
                <div className="flex flex-wrap gap-1">
                  {lead.creditProfile.knownIssues.map((issue, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {issue}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        
        {lead.vehiclePreference && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Vehicle Preference:</span>
            <span className="font-medium">{lead.vehiclePreference}</span>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Assigned:</span>
          <span className="font-medium">{lead.assignedAgent || "Unassigned"}</span>
        </div>
      </div>
    </Card>
  );
};
