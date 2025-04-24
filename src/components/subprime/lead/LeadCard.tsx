
import { Clock, Phone, MessageSquare, Eye, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { LeadProgress } from "./LeadProgress";
import { LeadProjectedScore } from "./LeadProjectedScore";

interface LeadCardProps {
  lead: SubprimeLead;
  onViewDetails: (lead: SubprimeLead) => void;
  onAssigneeClick?: (assignee: string | undefined) => void;
  showNudgeButton?: boolean;
  onSendNudge?: (lead: SubprimeLead) => void;
}

export const LeadCard = ({ 
  lead, 
  onViewDetails,
  onAssigneeClick,
  showNudgeButton = false,
  onSendNudge
}: LeadCardProps) => {
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

  const getFirstName = (fullName: string | undefined) => {
    if (!fullName) return '';
    return fullName.split(' ')[0];
  };

  return (
    <Card 
      className={cn(
        "p-3 hover:bg-gray-50 transition-colors",
        "border-l-4",
        getBorderColor(lead)
      )}
    >
      <div className="grid grid-cols-12 gap-2 items-center">
        <div className="col-span-3">
          <div className="font-medium text-base">{lead.customerName}</div>
        </div>

        <div className="col-span-1 flex-shrink-0">
          <LeadStatusBadge lead={lead} />
        </div>

        <div className="col-span-2">
          <LeadProjectedScore lead={lead} />
        </div>

        <div className="col-span-2">
          <LeadProgress lead={lead} />
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
              <p className="text-sm">{getLastMessageSummary()}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="col-span-1">
          {lead.assignedAgent ? (
            <Button 
              variant="link" 
              className="h-auto p-0 text-primary font-normal"
              onClick={() => onAssigneeClick && onAssigneeClick(lead.assignedAgent)}
            >
              {getFirstName(lead.assignedAgent)}
            </Button>
          ) : (
            <span className="text-gray-400 text-sm">Unassigned</span>
          )}
        </div>

        <div className="col-span-1 flex justify-end gap-1">
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
            onClick={() => onViewDetails(lead)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
