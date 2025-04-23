
import { useState } from "react";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { 
  Eye, 
  AlertCircle, 
  Clock,
  ChevronRight,
  HelpCircle
} from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SubprimeLeadDetail } from "./SubprimeLeadDetail";
import { cn } from "@/lib/utils";

interface SubprimeLeadsListProps {
  leads: SubprimeLead[];
}

export const SubprimeLeadsList = ({ leads }: SubprimeLeadsListProps) => {
  const [selectedLead, setSelectedLead] = useState<SubprimeLead | null>(null);

  const getStatusInfo = (lead: SubprimeLead) => {
    const statusMap = {
      "In Progress": {
        color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
        hoverText: lead.nextAction.type === "Document Collection" 
          ? "Docs requested, no response yet"
          : lead.sentiment === "Frustrated"
          ? "Customer seems frustrated – tone flagged by Jack"
          : lead.nextAction.isOverdue
          ? "Soft stall: hasn't replied in 36h"
          : "Mid-script, income question pending"
      },
      "Blocked": {
        color: "bg-red-100 text-red-800 hover:bg-red-100",
        hoverText: "Needs immediate manual attention - critical blocker"
      },
      "Ready": {
        color: "bg-green-100 text-green-800 hover:bg-green-100",
        hoverText: "Ready for final submission and handoff"
      },
      "Dormant": {
        color: "bg-gray-100 text-gray-800 hover:bg-gray-100",
        hoverText: "No activity for over 7 days - considered dormant"
      }
    };
    
    return statusMap[lead.fundingReadiness as keyof typeof statusMap] || statusMap["In Progress"];
  };

  const getProgressPercentage = (lead: SubprimeLead) => {
    const steps = ["contacted", "screening", "qualification", "routing", "submitted"];
    const currentIndex = steps.indexOf(lead.scriptProgress.currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  const getProgressTooltip = (lead: SubprimeLead) => {
    // Calculate days in conversation based on conversation history
    const firstContactDate = lead.conversations.length > 0 
      ? new Date(lead.conversations[0].timestamp)
      : new Date(lead.lastTouchpoint);
    
    const daysInConversation = Math.floor(
      (new Date().getTime() - firstContactDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Count messages
    const messageCount = lead.conversations.length;
    
    // Estimate unanswered prompts and call counts
    const unansweredCount = lead.nextAction.isOverdue ? 1 : 0;
    const callCount = lead.conversations.filter(c => c.type === "call").length;
    
    return `In conversation for ${daysInConversation} days
${messageCount} messages exchanged
${unansweredCount} unanswered prompts
${callCount} voice call${callCount !== 1 ? 's' : ''} initiated`;
  };

  const handleRowClick = (lead: SubprimeLead, e: React.MouseEvent) => {
    // Don't trigger row click if clicking on actions
    if ((e.target as HTMLElement).closest('.actions')) return;
    setSelectedLead(lead);
  };

  return (
    <div className="space-y-2">
      {leads.length === 0 ? (
        <Card className="p-4 text-center text-gray-500">
          No leads match your current filters
        </Card>
      ) : (
        <>
          {leads.map(lead => {
            const status = getStatusInfo(lead);
            return (
              <Card 
                key={lead.id} 
                className={cn(
                  "p-4 hover:bg-gray-50 transition-colors cursor-pointer",
                  "border-l-4",
                  lead.sentiment === "Frustrated" && "border-l-red-400",
                  lead.fundingReadiness === "Ready" && "border-l-green-400",
                  lead.nextAction.isOverdue && "border-l-yellow-400"
                )}
                onClick={(e) => handleRowClick(lead, e)}
              >
                <div className="grid grid-cols-12 gap-4 items-center">
                  {/* Name */}
                  <div className="col-span-3">
                    <div className="font-medium text-base">{lead.customerName}</div>
                  </div>

                  {/* Status with Tooltip */}
                  <div className="col-span-2">
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge className={status.color}>
                          <span className="flex items-center gap-1">
                            {lead.fundingReadiness}
                            <HelpCircle className="h-3 w-3" />
                          </span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">{status.hoverText}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Progress Bar with Tooltip */}
                  <div className="col-span-3">
                    <Tooltip>
                      <TooltipTrigger className="w-full">
                        <div className="w-full">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${getProgressPercentage(lead)}%` }}
                            />
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm whitespace-pre-line">
                          {getProgressTooltip(lead)}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Last Reply */}
                  <div className="col-span-2 text-sm text-gray-500 flex items-center">
                    <Clock className="inline h-3 w-3 mr-1" />
                    {formatDistanceToNow(new Date(lead.lastTouchpoint), { addSuffix: true })}
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex justify-end items-center space-x-2 actions">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedLead(lead)}
                      className="h-8"
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      <span>View Details</span>
                      <ChevronRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}

          <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Lead Details</DialogTitle>
                <DialogDescription>
                  View and manage details for this lead
                </DialogDescription>
              </DialogHeader>
              {selectedLead && <SubprimeLeadDetail lead={selectedLead} />}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};
