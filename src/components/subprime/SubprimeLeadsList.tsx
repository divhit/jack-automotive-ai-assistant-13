
import { useState } from "react";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronUp, Pause, Play, Check, Clock, AlertCircle } from "lucide-react";
import { SubprimeLeadDetail } from "./SubprimeLeadDetail";

interface SubprimeLeadsListProps {
  leads: SubprimeLead[];
}

export const SubprimeLeadsList = ({ leads }: SubprimeLeadsListProps) => {
  const [openLeads, setOpenLeads] = useState<Record<string, boolean>>({});

  const toggleLead = (id: string) => {
    setOpenLeads(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

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
    <div className="space-y-4">
      {leads.length === 0 ? (
        <Card className="p-4 text-center text-gray-500">
          No leads match your current filters
        </Card>
      ) : (
        leads.map(lead => (
          <Collapsible
            key={lead.id}
            open={!!openLeads[lead.id]}
            onOpenChange={() => toggleLead(lead.id)}
            className="border rounded-md overflow-hidden"
          >
            <CollapsibleTrigger className="w-full">
              <div className="p-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div>
                    {getChaseStatusIcon(lead.chaseStatus)}
                  </div>
                  <div className="font-medium">{lead.customerName}</div>
                  <Badge className={getReadinessBadgeColor(lead.fundingReadiness)}>
                    {lead.fundingReadiness}
                  </Badge>
                  <div className="text-xl">
                    {getSentimentIcon(lead.sentiment)}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500">
                    <Clock className="inline h-3 w-3 mr-1" />
                    {formatLastTouchpoint(lead.lastTouchpoint)}
                  </div>
                  <Badge variant="outline" className={getNextActionBadgeColor(lead.nextAction.isAutomated, lead.nextAction.isOverdue)}>
                    {lead.nextAction.type}
                  </Badge>
                  {openLeads[lead.id] ? 
                    <ChevronUp className="h-5 w-5 text-gray-400" /> : 
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  }
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SubprimeLeadDetail lead={lead} />
            </CollapsibleContent>
          </Collapsible>
        ))
      )}
    </div>
  );
};
