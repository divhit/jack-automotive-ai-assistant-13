
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
  CircleDot,
  Eye,
  Phone, 
  MessageSquare,
  Star
} from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SubprimeLeadDetail } from "./SubprimeLeadDetail";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SubprimeLeadsListProps {
  leads: SubprimeLead[];
}

export const SubprimeLeadsList = ({ leads }: SubprimeLeadsListProps) => {
  const [selectedLead, setSelectedLead] = useState<SubprimeLead | null>(null);

  const getStatusInfo = (lead: SubprimeLead) => {
    if (lead.fundingReadiness === "Ready") {
      return {
        status: "Ready to Submit",
        color: "bg-green-100 text-green-800 hover:bg-green-100",
        hoverText: "Profile complete for funding manager"
      };
    }

    if (lead.sentiment === "Ghosted") {
      return {
        status: "Ghosted",
        color: "bg-gray-100 text-gray-800 hover:bg-gray-100",
        hoverText: "No reply after 3+ follow-ups"
      };
    }

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

  const getBorderColor = (lead: SubprimeLead) => {
    if (lead.fundingReadiness === "Ready") {
      return "border-l-green-500";
    }
    if (lead.sentiment === "Ghosted") {
      return "border-l-gray-400";
    }
    if (lead.nextAction.isOverdue || lead.sentiment === "Frustrated") {
      return "border-l-red-500";
    }
    return "border-l-yellow-400";
  };

  const getProjectedScore = (lead: SubprimeLead) => {
    let score = 0;
    
    // Credit related score factors
    if (!lead.creditProfile?.knownIssues?.length) score += 2;
    if (lead.creditProfile?.scoreRange && 
        parseInt(lead.creditProfile.scoreRange.split('-')[0]) > 600) score += 2;
    
    // Check for positive engagement and conversation metrics
    if (lead.conversations.length > 3) score += 1;
    
    // Sentiment factor
    if (lead.sentiment === "Warm") score += 1;
    
    // Funding readiness factor
    if (lead.fundingReadiness === "Ready") score += 2;
    if (lead.fundingReadiness === "Partial") score += 1;
    
    // Progress in the sales script
    if (lead.scriptProgress.completedSteps.length > 2) score += 2;
    
    return score;
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 5) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-12 gap-2 px-3 py-2 text-sm font-medium text-gray-500">
        <div className="col-span-3">Name</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Last Contact</div>
        <div className="col-span-2">Progress</div>
        <div className="col-span-2">Projected Score</div>
        <div className="col-span-1 text-right">Actions</div>
      </div>

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
            const borderColor = getBorderColor(lead);
            const projectedScore = getProjectedScore(lead);
            const scoreColor = getScoreColor(projectedScore);
            
            return (
              <Card 
                key={lead.id} 
                className={cn(
                  "p-3 hover:bg-gray-50 transition-colors",
                  "border-l-4",
                  borderColor
                )}
              >
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-3">
                    <div className="font-medium text-base">{lead.customerName}</div>
                  </div>

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

                  <div className="col-span-2 text-sm text-gray-500">
                    <Tooltip>
                      <TooltipTrigger className="flex items-center">
                        <Clock className="inline h-3 w-3 mr-1" />
                        <span className="whitespace-nowrap">
                          {formatDistanceToNow(new Date(lead.lastTouchpoint), { addSuffix: true })}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">Last interaction details</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="col-span-2">
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

                  <div className="col-span-2">
                    <Tooltip>
                      <TooltipTrigger className="w-full">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={cn(
                                "h-3 w-3",
                                i < Math.ceil(projectedScore / 2) ? scoreColor : "text-gray-200"
                              )}
                              fill={i < Math.ceil(projectedScore / 2) ? "currentColor" : "none"}
                            />
                          ))}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-sm">
                          Projected Score: {projectedScore}/10
                          <br />
                          Based on credit, engagement & sales progress
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="col-span-1 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 w-8 p-0"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <Eye className="h-4 w-4" />
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
