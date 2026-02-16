import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";

interface DarkLeadListItemProps {
  lead: SubprimeLead;
  isSelected: boolean;
  onSelect: (lead: SubprimeLead) => void;
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

const fundingBadgeColor: Record<SubprimeLead["fundingReadiness"], string> = {
  Ready: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  Partial: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  "Not Ready": "bg-red-500/20 text-red-400 border-red-500/30",
};

const leftBorderColor: Record<SubprimeLead["fundingReadiness"], string> = {
  Ready: "border-l-emerald-500",
  Partial: "border-l-amber-500",
  "Not Ready": "border-l-red-500",
};

export const DarkLeadListItem = ({
  lead,
  isSelected,
  onSelect,
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
        "w-full text-left px-3 py-2.5 border-l-2 transition-colors",
        "focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500",
        isSelected
          ? "bg-zinc-800 border-l-blue-500"
          : cn("bg-transparent hover:bg-zinc-800/50", leftBorderColor[lead.fundingReadiness])
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-100 truncate text-sm">
              {lead.customerName}
            </span>
            <span className="text-sm" title={lead.sentiment}>
              {sentimentEmoji[lead.sentiment]}
            </span>
          </div>
          <div className="text-xs text-zinc-500 mt-0.5 truncate">
            {lead.phoneNumber}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 shrink-0">
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none",
              fundingBadgeColor[lead.fundingReadiness]
            )}
          >
            {lead.fundingReadiness}
          </span>
          <span className="text-[10px] text-zinc-500 whitespace-nowrap">
            {relativeTime}
          </span>
        </div>
      </div>
    </button>
  );
};
