import { Clock, Phone, MessageSquare, Eye, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { LeadProgress } from "./LeadProgress";
import { LeadProjectedScore } from "./LeadProjectedScore";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";

interface LeadCardProps {
  lead: SubprimeLead;
  onViewDetails: (lead: SubprimeLead) => void;
  onAssigneeClick?: (assignee: string | undefined) => void;
  onSendNudge?: (lead: SubprimeLead) => void;
}

export const LeadCard = ({ 
  lead, 
  onViewDetails,
  onAssigneeClick,
  onSendNudge
}: LeadCardProps) => {
  const handleClick = () => {
    onViewDetails(lead);
  };

  const handleAssigneeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAssigneeClick) {
      onAssigneeClick(lead.assignedAgent);
    }
  };

  const handleSendNudge = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSendNudge) {
      onSendNudge(lead);
    }
  };

  return (
    <Card
      className="hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={handleClick}
    >
      <div className="grid grid-cols-12 gap-2 p-3 items-center">
        {/* Customer name */}
        <div className="col-span-2 truncate">
          <div className="font-medium text-base">{lead.customerName}</div>
        </div>

        {/* Status */}
        <div className="col-span-2">
          <LeadStatusBadge lead={lead} />
        </div>

        {/* Score */}
        <div className="col-span-2 pl-2">
          <LeadProjectedScore lead={lead} />
        </div>

        {/* Progress */}
        <div className="col-span-2">
          <LeadProgress lead={lead} />
        </div>

        {/* Last Contact */}
        <div className="col-span-2 flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-gray-500 flex-shrink-0" />
          <span className="text-gray-600 text-sm truncate">
            {formatDistanceToNow(new Date(lead.lastTouchpoint), { addSuffix: true })}
          </span>
        </div>

        {/* Assigned Agent */}
        <div 
          className="col-span-1 text-sm truncate"
          onClick={handleAssigneeClick}
        >
          {lead.assignedAgent ? (
            <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
              {lead.assignedAgent}
            </Badge>
          ) : (
            <span className="text-gray-500">—</span>
          )}
        </div>

        {/* Actions */}
        <div 
          className="col-span-1 flex justify-end items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={() => onViewDetails(lead)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View Details</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Phone className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Call</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MessageSquare className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Send SMS</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {lead.assignedAgent && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={handleSendNudge}>
                    <Bell className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Send Nudge</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </Card>
  );
};
