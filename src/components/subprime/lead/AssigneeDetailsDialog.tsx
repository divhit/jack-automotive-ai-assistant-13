
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";

interface AssigneeDetailsDialogProps {
  specialist: string;
  leads: SubprimeLead[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AssigneeDetailsDialog = ({ 
  specialist, 
  leads, 
  open, 
  onOpenChange 
}: AssigneeDetailsDialogProps) => {
  // Ensure we're using one of our valid specialists
  const displaySpecialist = ["Andrea", "Ian", "Kayam"].includes(specialist) 
    ? specialist 
    : "Andrea";  // Default to Andrea if not a valid specialist

  const handleSendNudge = (lead: SubprimeLead) => {
    toast.success(`Nudge sent to ${displaySpecialist}!`, {
      description: `${lead.customerName}'s contact info has been prioritized in ${displaySpecialist}'s inbox.`,
    });
  };

  // Calculate performance metrics
  const totalLeads = leads.length;
  const readyLeads = leads.filter(l => l.fundingReadiness === "Ready").length;
  const responseRate = totalLeads > 0 
    ? leads.filter(l => l.conversations.length > 0).length / totalLeads * 100
    : 0;
  const avgResponseTime = "4.2 hours"; // This would be calculated from actual data

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{displaySpecialist}'s Lead Management Overview</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Performance Summary */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Total Leads</div>
              <div className="text-2xl font-bold">{totalLeads}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Ready for Funding</div>
              <div className="text-2xl font-bold">{readyLeads}</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Response Rate</div>
              <div className="text-2xl font-bold">{responseRate.toFixed(1)}%</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500">Avg Response Time</div>
              <div className="text-2xl font-bold">{avgResponseTime}</div>
            </div>
          </div>

          {/* Leads List */}
          <div className="space-y-2">
            <h3 className="font-semibold mb-4">Active Leads</h3>
            {leads.length > 0 ? (
              leads.map((lead) => (
                <div 
                  key={lead.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-grow">
                    <div className="space-y-1">
                      <div className="font-medium">{lead.customerName}</div>
                      <div className="text-sm text-gray-500">
                        Last contact: {formatDistanceToNow(new Date(lead.lastTouchpoint), { addSuffix: true })}
                      </div>
                    </div>
                    <Badge variant={lead.fundingReadiness === "Ready" ? "default" : "secondary"}>
                      {lead.fundingReadiness}
                    </Badge>
                    {lead.nextAction.isOverdue && (
                      <Badge variant="destructive">Overdue Action</Badge>
                    )}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="ml-4"
                    onClick={() => handleSendNudge(lead)}
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    Send {displaySpecialist} Nudge
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-gray-500">
                No leads currently assigned to {displaySpecialist}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
