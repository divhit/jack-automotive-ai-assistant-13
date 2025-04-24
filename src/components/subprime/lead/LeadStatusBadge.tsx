
import { Badge } from "@/components/ui/badge";
import { HelpCircle } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";

interface LeadStatusBadgeProps {
  lead: SubprimeLead;
}

export const LeadStatusBadge = ({ lead }: LeadStatusBadgeProps) => {
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

  const status = getStatusInfo(lead);

  return (
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
  );
};
