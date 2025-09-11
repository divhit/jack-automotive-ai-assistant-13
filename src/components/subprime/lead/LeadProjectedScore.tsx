
import { Star } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";

interface LeadProjectedScoreProps {
  lead: SubprimeLead;
}

export const LeadProjectedScore = ({ lead }: LeadProjectedScoreProps) => {
  const getProjectedScore = (lead: SubprimeLead) => {
    let score = 0;
    
    if (!lead.creditProfile?.knownIssues?.length) score += 2;
    if (lead.creditProfile?.scoreRange && 
        parseInt(lead.creditProfile.scoreRange.split('-')[0]) > 600) score += 2;
    if (lead.conversations.length > 3) score += 1;
    if (lead.sentiment === "Warm") score += 1;
    if (lead.fundingReadiness === "Ready") score += 2;
    if (lead.fundingReadiness === "Partial") score += 1;
    if (lead.scriptProgress?.completedSteps?.length > 2) score += 2;
    
    return score;
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 5) return "text-yellow-600";
    return "text-red-600";
  };

  const projectedScore = getProjectedScore(lead);
  const scoreColor = getScoreColor(projectedScore);

  return (
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
  );
};
