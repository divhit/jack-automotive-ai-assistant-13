
import { CircleDot } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";

interface LeadProgressProps {
  lead: SubprimeLead;
}

export const LeadProgress = ({ lead }: LeadProgressProps) => {
  const getProgressSteps = (lead: SubprimeLead) => {
    const steps = ["contacted", "screening", "qualification", "routing", "submitted"];
    const currentStep = lead.scriptProgress?.currentStep || "contacted";
    const currentIndex = steps.indexOf(currentStep);
    return {
      current: Math.max(currentIndex + 1, 1), // Ensure at least step 1
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

  const progress = getProgressSteps(lead);
  const tooltipContent = getProgressTooltip(lead);

  return (
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
          {tooltipContent}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};
