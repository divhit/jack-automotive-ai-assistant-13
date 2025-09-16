import { Clock, Phone, MessageSquare, Eye, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { LeadProgress } from "./LeadProgress";
import { LeadProjectedScore } from "./LeadProjectedScore";
import { subprimeLeads } from "@/data";
import { AssigneeHoverCard } from "./AssigneeHoverCard";
import { AssigneeDetailsDialog } from "./AssigneeDetailsDialog";

interface LeadCardProps {
  lead: SubprimeLead;
  onViewDetails: (lead: SubprimeLead) => void;
  onSelect?: (lead: SubprimeLead) => void;
  onDelete?: (leadId: string) => void;
  isSelected?: boolean;
}

export const LeadCard = ({ lead, onViewDetails, onSelect, onDelete, isSelected }: LeadCardProps) => {
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  
  const getBorderColor = (lead: SubprimeLead) => {
    if (lead.fundingReadiness === "Ready") return "border-l-green-500";
    if (lead.sentiment === "Ghosted") return "border-l-gray-400";
    if (lead.nextAction.isOverdue || lead.sentiment === "Frustrated") {
      return "border-l-red-500";
    }
    return "border-l-yellow-400";
  };

  const getLastMessageSummary = () => {
    if (lead.conversations.length === 0) return "";
    const lastMessage = lead.conversations[lead.conversations.length - 1];
    const messageType = lastMessage.type === "call" ? "Call" : "Message";
    const summary = lastMessage.content.length > 50 
      ? lastMessage.content.substring(0, 50) + "..."
      : lastMessage.content;
    return `${messageType}: ${summary}`;
  };
  
  const getLeadsForSpecialist = (specialist: string) => {
    return subprimeLeads.filter(l => l.assignedSpecialist === specialist);
  };

  const handleRowClick = (e: React.MouseEvent) => {
    if (
      (e.target as HTMLElement).closest('button') || 
      (e.target as HTMLElement).closest('[role="tooltip"]') ||
      (e.target as HTMLElement).closest('[role="dialog"]')
    ) {
      return;
    }
    onViewDetails(lead);
  };

  return (
    <Card 
      className={cn(
        "p-2 hover:bg-gray-50 transition-colors cursor-pointer",
        "border-l-4",
        getBorderColor(lead),
        isSelected && "bg-blue-50 border-blue-200"
      )}
      onClick={handleRowClick}
    >
      <div className="grid grid-cols-12 gap-4 items-center">
        <div className="col-span-2">
          <div className="font-medium">{lead.customerName}</div>
        </div>

        <div className="col-span-2">
          <LeadStatusBadge lead={lead} />
        </div>

        <div className="col-span-2 text-sm text-gray-500">
          <Tooltip>
            <TooltipTrigger className="flex items-center">
              <Clock className="inline h-3 w-3 mr-1" />
              <span>
                {(() => {
                  try {
                    const ts = lead.lastTouchpoint || lead.conversations.at(-1)?.timestamp;
                    if (!ts) return '—';
                    const d = new Date(ts);
                    if (isNaN(d.getTime())) return '—';
                    return formatDistanceToNow(d, { addSuffix: true });
                  } catch {
                    return '—';
                  }
                })()}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-sm">{getLastMessageSummary()}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="col-span-2">
          <LeadProgress lead={lead} />
        </div>

        <div className="col-span-2">
          <LeadProjectedScore lead={lead} />
        </div>
        
        <div className="col-span-1">
          {lead.assignedSpecialist && (
            <AssigneeHoverCard
              specialist={lead.assignedSpecialist}
              leads={getLeadsForSpecialist(lead.assignedSpecialist)}
              onClick={() => setIsDetailsDialogOpen(true)}
            />
          )}
        </div>

        <div className="col-span-1 flex justify-end gap-2">
          <Button 
            variant={isSelected ? "default" : "ghost"} 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(lead);
            }}
            title="Start telephony session"
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(lead);
              // Navigate to conversation tab
              setTimeout(() => {
                const modal = document.querySelector('[role="dialog"]');
                const conversationTab = modal?.querySelector('[data-value="conversation"]');
                if (conversationTab) {
                  (conversationTab as HTMLElement).click();
                }
              }, 100);
            }}
            title="Open conversation"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => onViewDetails(lead)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {onDelete && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(lead.id);
              }}
              title="Delete lead"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {lead.assignedSpecialist && (
        <AssigneeDetailsDialog
          specialist={lead.assignedSpecialist}
          leads={getLeadsForSpecialist(lead.assignedSpecialist)}
          open={isDetailsDialogOpen}
          onOpenChange={setIsDetailsDialogOpen}
        />
      )}
    </Card>
  );
};
