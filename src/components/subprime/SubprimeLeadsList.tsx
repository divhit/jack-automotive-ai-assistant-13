
import { useState } from "react";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Play, Pause, Check, Clock, AlertCircle } from "lucide-react";
import { SubprimeLeadDetail } from "./SubprimeLeadDetail";

interface SubprimeLeadsListProps {
  leads: SubprimeLead[];
}

export const SubprimeLeadsList = ({ leads }: SubprimeLeadsListProps) => {
  const [selectedLead, setSelectedLead] = useState<SubprimeLead | null>(null);

  const getSentimentIcon = (sentiment: SubprimeLead['sentiment']) => {
    switch (sentiment) {
      case "Warm":
        return <span title="Warm" className="text-green-500">😊</span>;
      case "Neutral":
        return <span title="Neutral" className="text-gray-500">😐</span>;
      case "Negative":
        return <span title="Negative" className="text-orange-500">😕</span>;
      case "Ghosted":
        return <span title="Ghosted" className="text-gray-400">😴</span>;
      case "Cold":
        return <span title="Cold" className="text-blue-500">🧊</span>;
      case "Frustrated":
        return <span title="Frustrated" className="text-red-500">🗯️</span>;
      case "Needs Human":
        return <span title="Needs Human" className="text-purple-500">🙋</span>;
      default:
        return <span title="Unknown" className="text-gray-500">❓</span>;
    }
  };

  const getChaseStatusIcon = (status: SubprimeLead['chaseStatus']) => {
    switch (status) {
      case "Auto Chase Running":
        return <Play className="h-4 w-4 text-green-600" />;
      case "Paused":
        return <Pause className="h-4 w-4 text-yellow-600" />;
      case "Completed":
        return <Check className="h-4 w-4 text-blue-600" />;
      case "Manual Review":
        return <AlertCircle className="h-4 w-4 text-purple-600" />;
      default:
        return null;
    }
  };

  const getReadinessBadgeColor = (readiness: SubprimeLead['fundingReadiness']) => {
    switch (readiness) {
      case "Ready":
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case "Partial":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
      case "Not Ready":
        return "bg-red-100 text-red-800 hover:bg-red-100";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getNextActionBadgeColor = (isAutomated: boolean, isOverdue: boolean) => {
    if (isOverdue) return "bg-red-100 text-red-800 border-red-200";
    return isAutomated 
      ? "bg-green-100 text-green-800 border-green-200" 
      : "bg-yellow-100 text-yellow-800 border-yellow-200";
  };

  const formatLastTouchpoint = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  };

  return (
    <div className="space-y-2">
      {leads.length === 0 ? (
        <Card className="p-4 text-center text-gray-500">
          No leads match your current filters
        </Card>
      ) : (
        <>
          {leads.map(lead => (
            <Card 
              key={lead.id} 
              className="p-3 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setSelectedLead(lead)}
            >
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-3 flex items-center space-x-2">
                  <span className="font-medium">{lead.customerName}</span>
                  {getChaseStatusIcon(lead.chaseStatus)}
                  <div className="text-xl">
                    {getSentimentIcon(lead.sentiment)}
                  </div>
                </div>
                <div className="col-span-2">
                  <Badge className={getReadinessBadgeColor(lead.fundingReadiness)}>
                    {lead.fundingReadiness}
                  </Badge>
                </div>
                <div className="col-span-3 text-sm text-gray-500 flex items-center">
                  <Clock className="inline h-3 w-3 mr-1" />
                  {formatLastTouchpoint(lead.lastTouchpoint)}
                </div>
                <div className="col-span-4 flex justify-end">
                  <Badge 
                    variant="outline" 
                    className={getNextActionBadgeColor(
                      lead.nextAction.isAutomated, 
                      lead.nextAction.isOverdue
                    )}
                  >
                    {lead.nextAction.type}
                  </Badge>
                </div>
              </div>
            </Card>
          ))}

          <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Lead Details</DialogTitle>
              </DialogHeader>
              {selectedLead && <SubprimeLeadDetail lead={selectedLead} />}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};
