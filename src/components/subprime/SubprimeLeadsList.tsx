
import { useState } from "react";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { 
  Clock,
  HelpCircle,
  CircleDot 
} from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SubprimeLeadDetail } from "./SubprimeLeadDetail";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Phone, MessageSquare } from "lucide-react";

interface SubprimeLeadsListProps {
  leads: SubprimeLead[];
}

export const SubprimeLeadsList = ({ leads }: SubprimeLeadsListProps) => {
  const [selectedLead, setSelectedLead] = useState<SubprimeLead | null>(null);

  const getStatusInfo = (lead: SubprimeLead) => {
    // Ready for Submission (Green)
    if (lead.fundingReadiness === "Ready") {
      return {
        status: "Ready to Submit",
        color: "bg-green-100 text-green-800 hover:bg-green-100",
        hoverText: "Profile complete for funding manager"
      };
    }

    // Dormant/Closed (Gray)
    if (lead.sentiment === "Ghosted") {
      return {
        status: "Ghosted",
        color: "bg-gray-100 text-gray-800 hover:bg-gray-100",
        hoverText: "No reply after 3+ follow-ups"
      };
    }

    // Blocked/Stalled (Red)
    if (lead.nextAction.isOverdue || lead.sentiment === "Frustrated") {
      const isStalled = lead.nextAction.isOverdue;
      return {
        status: isStalled ? "Stalled" : "Tone Flagged",
        color: "bg-red-100 text-red-800 hover:bg-red-100",
        hoverText: isStalled 
          ? "No response after multiple attempts"
          : "Customer seems frustrated"
      };
    }

    // In Progress (Yellow)
    return {
      status: lead.nextAction.type === "Document Collection" ? "Docs Requested" : "In Chase",
      color: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
      hoverText: lead.nextAction.type === "Document Collection" 
        ? "Waiting on income and ID docs"
        : "Jack is messaging this lead"
    };
  };

  const getProgressSteps = (lead: SubprimeLead) => {
    const steps = ["contacted", "screening", "qualification", "routing", "submitted"];
    const currentIndex = steps.indexOf(lead.scriptProgress.currentStep);
    return {
      current: currentIndex + 1,
      total: steps.length
    };
  };

  const getProgressTooltip = (lead: SubprimeLead) => {
    const firstContactDate = lead.conversations.length > 0 
      ? new Date(lead.conversations[0].timestamp)
      : new Date(lead.lastTouchpoint);
    
    const daysInConversation = Math.floor(
      (new Date().getTime() - firstContactDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    return `In conversation for ${daysInConversation} days\n${lead.conversations.length} messages exchanged\n${lead.conversations.filter(c => c.type === "call").length} calls made`;
  };

  return (
    <div className="space-y-1">
      {leads.length === 0 ? (
        <Card className="p-4 text-center text-gray-500">
          No leads match your current filters
        </Card>
      ) : (
        <>
          {leads.map(lead => {
            const status = getStatusInfo(lead);
            const progress = getProgressSteps(lead);
            const progressTooltip = getProgressTooltip(lead);
            
            return (
              <Card 
                key={lead.id} 
                className={cn(
                  "p-3 hover:bg-gray-50 transition-colors cursor-pointer",
                  "border-l-4",
                  lead.sentiment === "Frustrated" && "border-l-red-400",
                  lead.fundingReadiness === "Ready" && "border-l-green-400",
                  lead.nextAction.isOverdue && "border-l-yellow-400"
                )}
                onClick={() => setSelectedLead(lead)}
              >
                <div className="grid grid-cols-12 gap-2 items-center">
                  {/* Name */}
                  <div className="col-span-3">
                    <div className="font-medium text-base">{lead.customerName}</div>
                  </div>

                  {/* Status with Tooltip */}
                  <div className="col-span-2 flex-shrink-0">
                    <Tooltip>
                      <TooltipTrigger>
                        <Badge className={cn("whitespace-nowrap", status.color)}>
                          <span className="flex items-center gap-1">
                            {status.status}
                            <HelpCircle className="h-3 w-3" />
                          </span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">{status.hoverText}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Last Reply with Tooltip */}
                  <div className="col-span-2 text-sm text-gray-500 flex items-center">
                    <Tooltip>
                      <TooltipTrigger className="flex items-center">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {formatDistanceToNow(new Date(lead.lastTouchpoint), { addSuffix: true })}
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">Last interaction details</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Progress Steps with Tooltip */}
                  <div className="col-span-3 pl-4">
                    <Tooltip>
                      <TooltipTrigger className="w-full">
                        <div className="flex items-center gap-1">
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: progress.total }).map((_, i) => (
                              <CircleDot 
                                key={i}
                                className={cn(
                                  "h-3 w-3",
                                  i < progress.current ? "text-blue-600" : "text-gray-200"
                                )}
                              />
                            ))}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm whitespace-pre-line">
                          {progressTooltip}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Action Buttons */}
                  <div className="col-span-2 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}

          <Dialog open={!!selectedLead} onOpenChange={() => setSelectedLead(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              {selectedLead && <SubprimeLeadDetail lead={selectedLead} />}
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
};
