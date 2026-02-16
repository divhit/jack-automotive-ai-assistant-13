import { useState } from "react";
import { Search, Filter, Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { DarkLeadListItem } from "./DarkLeadListItem";

interface DarkLeadListPanelProps {
  leads: SubprimeLead[];
  selectedLeadId: string | null;
  onSelectLead: (lead: SubprimeLead) => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onAddLead: () => void;
}

export const DarkLeadListPanel = ({
  leads,
  selectedLeadId,
  onSelectLead,
  searchTerm,
  onSearchChange,
  onAddLead,
}: DarkLeadListPanelProps) => {
  const [showFilters, setShowFilters] = useState(false);
  const [chaseStatus, setChaseStatus] = useState("all");
  const [fundingReadiness, setFundingReadiness] = useState("all");
  const [sentiment, setSentiment] = useState("all");

  const hasActiveFilters =
    chaseStatus !== "all" || fundingReadiness !== "all" || sentiment !== "all";

  const resetFilters = () => {
    setChaseStatus("all");
    setFundingReadiness("all");
    setSentiment("all");
  };

  // Apply search and filters
  const filteredLeads = leads.filter((lead) => {
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        lead.customerName.toLowerCase().includes(term) ||
        lead.phoneNumber.includes(term) ||
        (lead.email && lead.email.toLowerCase().includes(term));
      if (!matchesSearch) return false;
    }

    // Chase status filter
    if (chaseStatus !== "all" && lead.chaseStatus !== chaseStatus) {
      return false;
    }

    // Funding readiness filter
    if (fundingReadiness !== "all" && lead.fundingReadiness !== fundingReadiness) {
      return false;
    }

    // Sentiment filter
    if (sentiment !== "all" && lead.sentiment !== sentiment) {
      return false;
    }

    return true;
  });

  return (
    <div className="flex flex-col h-full bg-zinc-950 border-r border-white/[0.06]">
      {/* Search bar */}
      <div className="p-3 space-y-2 border-b border-white/[0.06]">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search leads..."
            className="pl-9 h-9 bg-white/[0.04] border-white/[0.06] text-zinc-200 placeholder:text-zinc-600 focus:border-white/[0.12] focus:bg-white/[0.06] focus-visible:ring-0"
          />
        </div>

        {/* Filter toggle */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "h-7 px-2 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors duration-150",
              showFilters && "text-blue-400 hover:text-blue-300"
            )}
          >
            <Filter className="h-3 w-3 mr-1" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
            )}
          </Button>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5"
            >
              <X className="h-3 w-3" />
              Clear
            </button>
          )}
        </div>

        {/* Inline filter chips */}
        {showFilters && (
          <div className="space-y-2 pt-1">
            {/* Chase Status */}
            <div className="space-y-1">
              <Label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Chase Status
              </Label>
              <ToggleGroup
                type="single"
                variant="outline"
                className="justify-start flex flex-wrap gap-1"
                value={chaseStatus}
                onValueChange={(value) => value && setChaseStatus(value)}
              >
                <ToggleGroupItem
                  value="all"
                  size="sm"
                  className="text-[10px] h-6 px-2 border-white/[0.08] text-zinc-500 data-[state=on]:bg-white/[0.06] data-[state=on]:text-zinc-200"
                >
                  All
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Auto Chase Running"
                  size="sm"
                  className="text-[10px] h-6 px-2 border-white/[0.08] text-zinc-500 data-[state=on]:bg-white/[0.06] data-[state=on]:text-zinc-200"
                >
                  Auto
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Paused"
                  size="sm"
                  className="text-[10px] h-6 px-2 border-white/[0.08] text-zinc-500 data-[state=on]:bg-white/[0.06] data-[state=on]:text-zinc-200"
                >
                  Paused
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Completed"
                  size="sm"
                  className="text-[10px] h-6 px-2 border-white/[0.08] text-zinc-500 data-[state=on]:bg-white/[0.06] data-[state=on]:text-zinc-200"
                >
                  Done
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Manual Review"
                  size="sm"
                  className="text-[10px] h-6 px-2 border-white/[0.08] text-zinc-500 data-[state=on]:bg-white/[0.06] data-[state=on]:text-zinc-200"
                >
                  Manual
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Funding Readiness */}
            <div className="space-y-1">
              <Label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Funding
              </Label>
              <ToggleGroup
                type="single"
                variant="outline"
                className="justify-start flex flex-wrap gap-1"
                value={fundingReadiness}
                onValueChange={(value) => value && setFundingReadiness(value)}
              >
                <ToggleGroupItem
                  value="all"
                  size="sm"
                  className="text-[10px] h-6 px-2 border-white/[0.08] text-zinc-500 data-[state=on]:bg-white/[0.06] data-[state=on]:text-zinc-200"
                >
                  All
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Ready"
                  size="sm"
                  className="text-[10px] h-6 px-2 border-white/[0.08] text-zinc-500 data-[state=on]:bg-white/[0.06] data-[state=on]:text-zinc-200"
                >
                  Ready
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Partial"
                  size="sm"
                  className="text-[10px] h-6 px-2 border-white/[0.08] text-zinc-500 data-[state=on]:bg-white/[0.06] data-[state=on]:text-zinc-200"
                >
                  Partial
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Not Ready"
                  size="sm"
                  className="text-[10px] h-6 px-2 border-white/[0.08] text-zinc-500 data-[state=on]:bg-white/[0.06] data-[state=on]:text-zinc-200"
                >
                  Not Ready
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Sentiment */}
            <div className="space-y-1">
              <Label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                Sentiment
              </Label>
              <ToggleGroup
                type="single"
                variant="outline"
                className="justify-start flex flex-wrap gap-1"
                value={sentiment}
                onValueChange={(value) => value && setSentiment(value)}
              >
                <ToggleGroupItem
                  value="all"
                  size="sm"
                  className="text-[10px] h-6 px-2 border-white/[0.08] text-zinc-500 data-[state=on]:bg-white/[0.06] data-[state=on]:text-zinc-200"
                >
                  All
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Warm"
                  size="sm"
                  className="text-[10px] h-6 px-2 border-white/[0.08] data-[state=on]:bg-white/[0.06]"
                >
                  {"\u{1F60A}"}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Neutral"
                  size="sm"
                  className="text-[10px] h-6 px-2 border-white/[0.08] data-[state=on]:bg-white/[0.06]"
                >
                  {"\u{1F610}"}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Negative"
                  size="sm"
                  className="text-[10px] h-6 px-2 border-white/[0.08] data-[state=on]:bg-white/[0.06]"
                >
                  {"\u{1F615}"}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Ghosted"
                  size="sm"
                  className="text-[10px] h-6 px-2 border-white/[0.08] data-[state=on]:bg-white/[0.06]"
                >
                  {"\u{1F634}"}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Cold"
                  size="sm"
                  className="text-[10px] h-6 px-2 border-white/[0.08] data-[state=on]:bg-white/[0.06]"
                >
                  {"\u{1F9CA}"}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Frustrated"
                  size="sm"
                  className="text-[10px] h-6 px-2 border-white/[0.08] data-[state=on]:bg-white/[0.06]"
                >
                  {"\u{1F5EF}\u{FE0F}"}
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="Needs Human"
                  size="sm"
                  className="text-[10px] h-6 px-2 border-white/[0.08] data-[state=on]:bg-white/[0.06]"
                >
                  {"\u{1F64B}"}
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        )}
      </div>

      {/* Scrollable lead list */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-white/[0.04]">
          {filteredLeads.length > 0 ? (
            filteredLeads.map((lead) => (
              <DarkLeadListItem
                key={lead.id}
                lead={lead}
                isSelected={lead.id === selectedLeadId}
                onSelect={onSelectLead}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <Search className="h-8 w-8 text-zinc-800 mb-3" />
              <p className="text-sm text-zinc-500 text-center">
                No leads match your search or filters.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Add Lead button */}
      <div className="p-3 border-t border-white/[0.06]">
        <Button
          onClick={onAddLead}
          className="w-full h-9 bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 border border-white/[0.08] text-sm transition-all duration-150"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Lead
        </Button>
      </div>
    </div>
  );
};
