import { formatDistanceToNow } from "date-fns";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";

interface DarkLeadListItemProps {
  lead: SubprimeLead;
  isSelected: boolean;
  onSelect: (lead: SubprimeLead) => void;
  onDeleteLead: (leadId: string) => void;
}

const sentimentEmoji: Record<SubprimeLead["sentiment"], string> = {
  Warm: "\u{1F60A}",
  Neutral: "\u{1F610}",
  Negative: "\u{1F615}",
  Ghosted: "\u{1F634}",
  Cold: "\u{1F9CA}",
  Frustrated: "\u{1F5EF}\u{FE0F}",
  "Needs Human": "\u{1F64B}",
};

const fundingDotColor: Record<SubprimeLead["fundingReadiness"], string> = {
  Ready: "bg-emerald-400",
  Partial: "bg-amber-400",
  "Not Ready": "bg-red-400",
};

export const DarkLeadListItem = ({
  lead,
  isSelected,
  onSelect,
  onDeleteLead,
}: DarkLeadListItemProps) => {
  const relativeTime = (() => {
    try {
      return formatDistanceToNow(new Date(lead.lastTouchpoint), {
        addSuffix: true,
      });
    } catch {
      return "unknown";
    }
  })();

  return (
    <button
      type="button"
      onClick={() => onSelect(lead)}
      className={cn(
        "group w-full text-left px-3 py-2.5 border-l-2 transition-colors duration-100",
        "focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500",
        isSelected
          ? "bg-blue-50 border-l-blue-500"
          : "bg-transparent hover:bg-stone-50 border-l-transparent"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-stone-900 truncate text-[13px] tracking-tight">
              {lead.customerName}
            </span>
            <span className="text-sm" title={lead.sentiment}>
              {sentimentEmoji[lead.sentiment]}
            </span>
          </div>
          <div className="text-[12px] text-stone-500 mt-0.5 truncate">
            {lead.phoneNumber}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="flex items-center gap-1">
            <span className={cn("h-1.5 w-1.5 rounded-full", fundingDotColor[lead.fundingReadiness])} />
            <span className="text-[10px] text-stone-600">{lead.fundingReadiness}</span>
          </span>
          <span className="text-[11px] text-stone-400 whitespace-nowrap">
            {relativeTime}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteLead(lead.id); }}
            className="opacity-0 group-hover:opacity-100 mt-1 p-0.5 text-stone-300 hover:text-red-500 transition-all duration-150"
            title="Delete lead"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>
    </button>
  );
};
