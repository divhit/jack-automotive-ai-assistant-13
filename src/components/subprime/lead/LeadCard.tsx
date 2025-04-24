
import { Clock, Phone, MessageSquare, Eye, Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { LeadStatusBadge } from "./LeadStatusBadge";
import { LeadProgress } from "./LeadProgress";
import { LeadProjectedScore } from "./LeadProjectedScore";
import { subprimeLeads } from "@/data";

interface LeadCardProps {
  lead: SubprimeLead;
  onViewDetails: (lead: SubprimeLead) => void;
}

export const LeadCard = ({ lead, onViewDetails }: LeadCardProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  
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
  
  const handleSendNudge = (specialist: string) => {
    toast.success(`Nudge sent to ${specialist}!`, {
      description: `${lead.customerName}'s contact info has been prioritized in ${specialist}'s inbox.`,
    });
    setIsPopoverOpen(false);
  };

  return (
    <Card 
      className={cn(
        "p-3 hover:bg-gray-50 transition-colors",
        "border-l-4",
        getBorderColor(lead)
      )}
    >
      <div className="grid grid-cols-13 gap-2 items-center">
        <div className="col-span-2">
          <div className="font-medium text-base">{lead.customerName}</div>
        </div>

        <div className="col-span-2 flex-shrink-0">
          <LeadStatusBadge lead={lead} />
        </div>

        <div className="col-span-3 text-sm text-gray-500">
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

        <div className="col-span-2">
          <LeadProgress lead={lead} />
        </div>

        <div className="col-span-2">
          <LeadProjectedScore lead={lead} />
        </div>
        
        <div className="col-span-1">
          {lead.assignedSpecialist && (
            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <button 
                  className="px-2 py-0.5 bg-gray-100 text-purple-700 text-xs rounded-full hover:bg-gray-200 transition-colors"
                >
                  {lead.assignedSpecialist}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="start">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">{lead.assignedSpecialist}'s Leads</h3>
                  
                  <div className="max-h-64 overflow-y-auto">
                    <div className="space-y-2">
                      {getLeadsForSpecialist(lead.assignedSpecialist).map((assignedLead) => (
                        <div key={assignedLead.id} className="p-2 bg-gray-50 rounded-md text-sm">
                          <div className="font-medium">{assignedLead.customerName}</div>
                          <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
                            <span>{assignedLead.fundingReadiness}</span>
                            <span>{formatDistanceToNow(new Date(assignedLead.lastTouchpoint), { addSuffix: true })}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => handleSendNudge(lead.assignedSpecialist as string)}
                  >
                    <Bell className="mr-1 h-4 w-4" />
                    Send {lead.assignedSpecialist} Nudge
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )}
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
            onClick={() => onViewDetails(lead)}
          >
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
