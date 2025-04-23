
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SubprimeLead } from "@/data/subprime/subprimeLeads";
import { Filter } from "lucide-react";

interface SubprimeLeadFiltersProps {
  leads: SubprimeLead[];
  onFilterChange: (filteredLeads: SubprimeLead[]) => void;
}

export const SubprimeLeadFilters = ({ leads, onFilterChange }: SubprimeLeadFiltersProps) => {
  // Filter states
  const [chaseStatus, setChaseStatus] = useState<SubprimeLead["chaseStatus"] | "all">("all");
  const [fundingReadiness, setFundingReadiness] = useState<SubprimeLead["fundingReadiness"] | "all">("all");
  const [sentiment, setSentiment] = useState<SubprimeLead["sentiment"] | "all">("all");
  const [scriptProgress, setScriptProgress] = useState<SubprimeLead["scriptProgress"]["currentStep"] | "all">("all");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  
  // Apply filters whenever any filter state changes
  useEffect(() => {
    let filteredResults = [...leads];
    
    // Apply chase status filter
    if (chaseStatus !== "all") {
      filteredResults = filteredResults.filter(lead => lead.chaseStatus === chaseStatus);
    }
    
    // Apply funding readiness filter
    if (fundingReadiness !== "all") {
      filteredResults = filteredResults.filter(lead => lead.fundingReadiness === fundingReadiness);
    }
    
    // Apply sentiment filter
    if (sentiment !== "all") {
      filteredResults = filteredResults.filter(lead => lead.sentiment === sentiment);
    }
    
    // Apply script progress filter
    if (scriptProgress !== "all") {
      filteredResults = filteredResults.filter(lead => lead.scriptProgress.currentStep === scriptProgress);
    }
    
    // Apply overdue filter
    if (showOverdueOnly) {
      filteredResults = filteredResults.filter(lead => lead.nextAction.isOverdue);
    }
    
    // Update parent component with filtered results
    onFilterChange(filteredResults);
  }, [chaseStatus, fundingReadiness, sentiment, scriptProgress, showOverdueOnly, leads, onFilterChange]);
  
  // Reset all filters
  const resetFilters = () => {
    setChaseStatus("all");
    setFundingReadiness("all");
    setSentiment("all");
    setScriptProgress("all");
    setShowOverdueOnly(false);
  };
  
  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">
            <Filter className="h-4 w-4 inline mr-1" />
            Filters
          </CardTitle>
          <button 
            className="text-xs text-muted-foreground hover:text-blue-600" 
            onClick={resetFilters}
          >
            Reset
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chase Status Filter */}
        <div className="space-y-2">
          <Label className="text-sm">Chase Status</Label>
          <ToggleGroup 
            type="single" 
            variant="outline" 
            className="justify-start flex flex-wrap gap-1"
            value={chaseStatus}
            onValueChange={(value) => value && setChaseStatus(value as any)}
          >
            <ToggleGroupItem value="all" size="sm" className="text-xs">All</ToggleGroupItem>
            <ToggleGroupItem value="Auto Chase Running" size="sm" className="text-xs">Auto</ToggleGroupItem>
            <ToggleGroupItem value="Paused" size="sm" className="text-xs">Paused</ToggleGroupItem>
            <ToggleGroupItem value="Completed" size="sm" className="text-xs">Completed</ToggleGroupItem>
            <ToggleGroupItem value="Manual Review" size="sm" className="text-xs">Manual</ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        {/* Funding Readiness Filter */}
        <div className="space-y-2">
          <Label className="text-sm">Funding Readiness</Label>
          <ToggleGroup 
            type="single" 
            variant="outline"
            className="justify-start"
            value={fundingReadiness}
            onValueChange={(value) => value && setFundingReadiness(value as any)}
          >
            <ToggleGroupItem value="all" size="sm" className="text-xs">All</ToggleGroupItem>
            <ToggleGroupItem value="Ready" size="sm" className="text-xs bg-green-50 data-[state=on]:bg-green-200 border-green-100">Ready</ToggleGroupItem>
            <ToggleGroupItem value="Partial" size="sm" className="text-xs bg-yellow-50 data-[state=on]:bg-yellow-200 border-yellow-100">Partial</ToggleGroupItem>
            <ToggleGroupItem value="Not Ready" size="sm" className="text-xs bg-red-50 data-[state=on]:bg-red-200 border-red-100">Not Ready</ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        {/* Sentiment Filter */}
        <div className="space-y-2">
          <Label className="text-sm">Sentiment</Label>
          <ToggleGroup 
            type="single" 
            variant="outline"
            className="justify-start flex flex-wrap gap-1"
            value={sentiment}
            onValueChange={(value) => value && setSentiment(value as any)}
          >
            <ToggleGroupItem value="all" size="sm" className="text-xs">All</ToggleGroupItem>
            <ToggleGroupItem value="Warm" size="sm" className="text-xs">Warm 😊</ToggleGroupItem>
            <ToggleGroupItem value="Neutral" size="sm" className="text-xs">Neutral 😐</ToggleGroupItem>
            <ToggleGroupItem value="Negative" size="sm" className="text-xs">Negative 😕</ToggleGroupItem>
            <ToggleGroupItem value="Ghosted" size="sm" className="text-xs">Ghosted 😴</ToggleGroupItem>
            <ToggleGroupItem value="Cold" size="sm" className="text-xs">Cold 🧊</ToggleGroupItem>
            <ToggleGroupItem value="Frustrated" size="sm" className="text-xs">Frustrated 🗯️</ToggleGroupItem>
            <ToggleGroupItem value="Needs Human" size="sm" className="text-xs">Human 🙋</ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        {/* Script Progress Filter */}
        <div className="space-y-2">
          <Label className="text-sm">Script Progress</Label>
          <ToggleGroup 
            type="single" 
            variant="outline"
            className="justify-start flex flex-wrap gap-1"
            value={scriptProgress}
            onValueChange={(value) => value && setScriptProgress(value as any)}
          >
            <ToggleGroupItem value="all" size="sm" className="text-xs">All</ToggleGroupItem>
            <ToggleGroupItem value="contacted" size="sm" className="text-xs">Contacted</ToggleGroupItem>
            <ToggleGroupItem value="screening" size="sm" className="text-xs">Screening</ToggleGroupItem>
            <ToggleGroupItem value="qualification" size="sm" className="text-xs">Qualification</ToggleGroupItem>
            <ToggleGroupItem value="routing" size="sm" className="text-xs">Routing</ToggleGroupItem>
            <ToggleGroupItem value="submitted" size="sm" className="text-xs">Submitted</ToggleGroupItem>
          </ToggleGroup>
        </div>
        
        {/* Overdue Action Toggle */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label htmlFor="overdue-toggle" className="text-sm cursor-pointer">Show Overdue Actions Only</Label>
            <Toggle 
              id="overdue-toggle" 
              pressed={showOverdueOnly}
              onPressedChange={setShowOverdueOnly}
              variant="outline"
              size="sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
